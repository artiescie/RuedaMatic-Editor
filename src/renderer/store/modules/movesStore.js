import DiscDataHelper from '../shared/DiscDataHelper'
import electron from 'electron'

import _sortBy from 'lodash/sortBy'
import _cloneDeep from 'lodash/cloneDeep'

import fs from 'fs'
import path from 'path'
import wget from 'wget-improved'
import Vue from 'vue'
import replace from 'replace-in-file'

// import _cloneDeep from 'lodash/cloneDeep'
// import opn from 'opn'
// import yaml from 'js-yaml'
// import util from 'util'

// const HOMEDIR = electron.remote.app.getpath('home')
const DOCDIR = electron.remote.app.getPath('documents')
const TEMPDIR = electron.remote.app.getPath('temp')
const RMDIR = DOCDIR + '/RuedaMaticEditor'

const discDataHelper = new DiscDataHelper()

const state = {
  originalMoves: [], // original object array
  originalCombos: [], // original object array
  originalCalls: [], // calls in vueltas folder at startup
  editedMoves: [], // edited object, maybe save this
  editedCombos: [], // edited object, maybe save this
  editedSequence: [], // edited object, maybe save this
  seqFilesModifiedFromMoves: [],
  installedSchemes: [],
  availableSchemes: {},
  basicSchemes: {},
  bUpdateInstalledSchemes: 0,
  schemeName: '',
  schemeProvider: '',
  schemeDate: '',
  showBusy: false,
  // getMovesWithUsage resi;ts
  movesWithUsage: null,
  msgUnmatchedSeqs: '',
  msgUnmatchedCombos: ''
}
const mutations = {
  UPDATE_MOVES_USAGE (state, payload) {
    state.movesWithUsage = payload.movesWithUsage
    state.msgUnmatchedSeqs = payload.msgUnmatchedSeqs
    state.msgUnmatchedCombos = payload.msgUnmatchedCombos
  },
  UPDATE_COMBO_HEADER (state, payload) {
    // payload:
    //   comboName:
    //   newCombo: name, description, startup, hasUpshift
    if (payload.comboName === '') { // no previous name, must be NEW
      const template = {
        name: '',
        description: '',
        startup: false,
        weight: 0,
        hasUpshift: false,
        minLength: 0,
        maxLength: 0
      }
      template.name = payload.newCombo.name
      template.description = payload.newCombo.description
      template.startup = payload.newCombo.startup
      template.weight = payload.newCombo.weight
      template.hasUpshift = payload.newCombo.hasUpshift
      template.minLength = payload.newCombo.minLength
      template.maxLength = payload.newCombo.maxLength
      Vue.set(state.editedCombos, payload.newCombo.name, {})
      Vue.set(state.editedCombos[payload.newCombo.name], '$', template)
      const nodes = {
        node1: {
          text: '"Start"',
          edgeType: 'circle',
          next: [
            'node2'
          ]
        },
        node2: {
          text: '"Click to Set First Move"',
          editable: true
        }
      }
      Vue.set(state.editedCombos[payload.newCombo.name], 'nodes', nodes)
    } else {
      const workCombo = state.editedCombos[payload.comboName]
      workCombo.$.name = payload.newCombo.name
      workCombo.$.description = payload.newCombo.description
      workCombo.$.startup = payload.newCombo.startup
      workCombo.$.weight = payload.newCombo.weight
      workCombo.$.hasUpshift = payload.newCombo.hasUpshift
      workCombo.$.maxLength = payload.newCombo.maxLength
      workCombo.$.minLength = payload.newCombo.minLength
      if (payload.comboName !== payload.newCombo.name) {
        Vue.set(state.editedCombos, payload.newCombo.name, workCombo)
        Vue.delete(state.editedCombos, payload.comboName)
      }
    }
  },
  DELETE_NODE_IN_COMBO (state, payload) {
    Vue.delete(state.editedCombos, payload.combo.name)
  },
  ADD_NODE_IN_COMBO (state, payload) {
    const nodeList = state.editedCombos[payload.combo].nodes
    // eslint-disable-next-line no-unused-vars
    let testIdx
    // first: find the node for the key payload.node
    const mother = nodeList[payload.node]
    let nextNode
    for (let i = 1; ; i++) {
      if (!nodeList['node' + i]) {
        nextNode = 'node' + i
        break
      }
    }
    if (!mother.next) {
      Vue.set(mother, 'next', [])
    }
    mother.next.splice(mother.next.length, 0, nextNode)
    if (mother.link) {
      // join the family - if they have weights, so do you!
      mother.link.splice(mother.next.length - 1, 0, '-- 1 -->')
    }
    const sz = Object.entries(nodeList).length // debug
    Vue.set(nodeList, nextNode, {
      text: '"' + payload.move.name + '"', // or else mermaid chokes on brackets etc
      editable: true
    })
    // debug issue where add node actually adds two nodes
    console.log('Mermaid nodeList change: ' + Object.entries(nodeList).length + ' vs ' + sz)
    if (Object.entries(nodeList).length !== (sz + 1)) console.error('Nodelist add error, ' + Object.entries(nodeList).length + ' vs ' + sz)
  },
  DELETE_SUBTREE_IN_COMBO (state, payload) {
    const nodeList = state.editedCombos[payload.combo].nodes
    // eslint-disable-next-line no-unused-vars
    let mother
    let testIdx
    // first: find the node that points to us
    const arySNodes = Object.keys(nodeList)
    for (let i = 0; i < arySNodes.length - 1; i++) {
      const sNode = arySNodes[i]
      if (nodeList[sNode].next) {
        testIdx = nodeList[sNode].next.indexOf(payload.node)
        if (testIdx >= 0) {
          mother = sNode
          // remove the parent next and link
          if (nodeList[sNode].next.length > 1) {
            nodeList[sNode].next.splice(testIdx, 1)
            if (nodeList[sNode].link) {
              if (nodeList[sNode].link.length <= 2) {
                Vue.delete(nodeList[sNode], 'link')
              } else {
                try { nodeList[sNode].link.splice(testIdx, 1) } catch (e) {}
              }
            }
          } else {
            Vue.delete(nodeList[sNode], 'next')
            // link is optional
            try { Vue.delete(nodeList[sNode], 'link') } catch (e) {}
          }
          break
        }
      }
    }
    const recurseDelete = (sNode1) => {
      let myKids = [] // this will be the targets for recursive calls
      if (nodeList[sNode1].next) {
        myKids = _cloneDeep(nodeList[sNode1].next)
        myKids.forEach(kid => {
          recurseDelete(kid)
        })
      }
      Vue.delete(nodeList, sNode1)
    }
    recurseDelete(payload.node)
  },
  SET_EDITABLE_NODE_IN_COMBO (state, payload) {
    Vue.set(state.editedCombos[payload.combo].nodes[payload.node], 'editable', true)
  },
  UPDATE_NODE_IN_COMBO (state, payload) {
    state.editedCombos[payload.combo].nodes[payload.node].text = '"' + payload.move.name + '"' // quotes or else mermaid chokes on brackets etc
  },
  UPDATE_WEIGHT_IN_COMBO (state, payload) {
    if (!state.editedCombos[payload.combo].nodes[payload.parent].link) {
      Vue.set(state.editedCombos[payload.combo].nodes[payload.parent], 'link', new Array(state.editedCombos[payload.combo].nodes[payload.parent].next.length))
      for (let i = 0; i < state.editedCombos[payload.combo].nodes[payload.parent].link.length; i++) {
        // if we created a branch where there was none, put an arbitrary weight on the unweighted branch
        state.editedCombos[payload.combo].nodes[payload.parent].link[i] = '-- 1 -->'
      }
    }
    Vue.set(state.editedCombos[payload.combo].nodes[payload.parent].link, payload.indexInParent, '-- ' + payload.weight + '-->') // mermaid wants the arrow hints
  },
  UPDATE_EXTRA_TIME_NODE_IN_COMBO (state, payload) {
    if (state.editedCombos[payload.combo].nodes[payload.node]) {
      const origText = payload.baseMoveName
      let newText
      if (payload.extraTimes[1] && payload.extraTimes[1] > 0) {
        newText = origText + ' [' + payload.extraTimes[0] + '-' + payload.extraTimes[1] + ']'
      } else {
        // just the name, no extra time
        newText = origText
      }
      newText = '"' + newText + '"'
      Vue.set(state.editedCombos[payload.combo].nodes[payload.node], 'text', newText)
      Vue.set(state.editedCombos[payload.combo].nodes[payload.node], 'allowUpshift', payload.allowUpshift)
      Vue.set(state.editedCombos[payload.combo].nodes[payload.node], 'allowEquivalent', payload.allowEquivalent)
    }
  },
  FLAG_SEQFILES_TO_RELOAD (state, payload) {
    state.seqFilesModifiedFromMoves = payload
  },
  DELETE_MOVE (state, nDeleteAt) {
    if (nDeleteAt >= 0) {
      const mName = state.editedMoves[nDeleteAt].$.name
      state.editedMoves.splice(nDeleteAt, 1)
      console.log('move deleted: ' + mName)
    }
  },
  BUFFER_MOVE_EDIT (state, payload) {
    const editedMove = payload.move
    const nInsertAt = payload.pos
    if (nInsertAt < 0) {
      // not found, it's a new move
      state.editedMoves.splice(-(nInsertAt + 1), 0, editedMove)
    } else {
      // update, replace at the prev version index
      state.editedMoves.splice(nInsertAt, 1, editedMove)
    }
    console.log('move inserted: ' + editedMove.$.name + ', at: ' + nInsertAt)
  },
  ORIGINAL_MOVE_STATE (state, payload) {
    // some diags about calls w/o move, moves w/o call etc.
    const CALLFOLDER = path.join(RMDIR, payload, 'vueltas')
    try {
      const { moves, combos, schemeProvider, schemeDate, schemeName } = discDataHelper.getXMLData(path.join(CALLFOLDER, 'moves.xml'), { type: 'moves' })
      state.schemeName = schemeName
      state.schemeDate = schemeDate
      state.schemeProvider = schemeProvider
      state.originalMoves = _sortBy(moves, m => m.$.nameSorted)
      state.originalCombos = combos // let's see if we need any sort: _sortBy(combos, '$.name')
      // WORRY ABOUT CASE? let's not for now: users will need to respect case ...
      const movesNoCall = getters.getMovesNoCall(state)
      const movesTemp = _cloneDeep(state.originalMoves)
      // initialize the edited moves to the original state
      state.editedMoves = movesTemp.map(move => {
        if (movesNoCall.includes(move.$.name)) {
          move._cellVariants = { file: 'danger' }
        } else {
          // console.log('remove cellVariant color flag')
          delete move._cellVariants // no effect if missing property
        }
        return move
      })
      state.editedCombos = _cloneDeep(state.originalCombos)
    } catch (e) {
      // if (e.code === 'ENOENT')
      state.editedMoves = []
      throw e
    }
  },
  ORIGINAL_CALLS_FILES (state, payload) {
    const scheme = payload
    const CALLFOLDER = path.join(RMDIR, scheme, 'vueltas')
    try {
      // these are the filenames of mp3s containing the voice calls
      state.originalCalls = discDataHelper.getCallsHelper(CALLFOLDER)
    } catch (err) {
      console.log('Problem getting ' + scheme + ' call files')
    }
  },
  PERSIST_ALL_MOVES (state, payload) {
    // MOVES MASSAGE: just sort
    state.editedMoves = _sortBy(state.editedMoves, m => m.$.name.toLocaleLowerCase())
    // sort combos - this may be not case insensitive for now
    const ordered = {}
    Object.keys(state.editedCombos).sort().forEach(function (key) {
      ordered[key] = state.editedCombos[key]
    })
    state.editedCombos = ordered
    // COMBOS MASSAGE: bigger!  Translate work format to XML Builder friendly format
    const CALLFOLDER = path.join(RMDIR, payload.folder, 'vueltas')
    const asWhat = {
      type: 'moves',
      date: payload.date,
      authorId: payload.authorId,
      schemeName: payload.schemeName,
      schemeProvider: payload.schemeProvider,
      schemeDate: payload.schemeDate
    }
    discDataHelper.persistXMLData(path.join(CALLFOLDER, 'moves.xml'), [state.editedMoves, state.editedCombos], asWhat) // moves
  },
  BUFFER_AVAILABLE_SCHEMES (state, payload) {
    state.availableSchemes = payload
  },
  BUFFER_BASIC_SCHEMES (state, payload) {
    state.basicSchemes = payload
  },
  BUFFER_INSTALLED_SCHEMES (state, payload) {
    state.installedSchemes = payload
  },
  UPDATE_INSTALLED_SCHEMES_FLAG (state, payload) {
    state.bUpdateInstalledSchemes = payload
  },
  SET_BUSY_NOTICE (state) {
    state.showBusy = true
  },
  UNSET_BUSY_NOTICE (state) {
    state.showBusy = false
  }
}

const getters = {
  getMoveByNameObj: (state) => (name) => {
    const nInsertAt = discDataHelper.binarySearch(state.editedMoves, name)
    if (nInsertAt < 0) {
      console.log('Seq move is missing from Move catalog: ' + name.$.name)
      if (name.$.name === 'Continue') {
        // note: this should be prevented by other new logic, but leave for now
        throw new Error('Move not found: "' + name.$.name + '"  Every scheme needs a Continue move, 1 measure long (a continue.mp3 is not needed).  Copy it from the basica scheme.')
      } else {
        throw new Error('Move not found: "' + name.$.name + '".  Was it renamed, deleted?')
      }
    } else {
      // _cloneDeep avoids mutating store in the caller
      return _cloneDeep(state.editedMoves[nInsertAt])
    }
  },
  getMovesNoCall: state => {
    if (!state.editedMoves.length) return []
    const unmatched = []
    const aryUnmatched = state.editedMoves.reduce(function (unmatched, eachMove) {
      if (state.originalCalls.includes(eachMove.$.file)) {
        // noise: console.log(eachMove.$.file + ' found')
      } else {
        unmatched.push(eachMove.$.name)
      }
      return unmatched
    },
    unmatched)
    return aryUnmatched.filter(item => item !== 'Continue')
  },
  getMovesNoCallDisplay: (state, getters) => {
    return getters.getMovesNoCall.join(', ') || 'none'
  },
  getCallsUsage: state => {
    return state.originalCalls.map(function (eachCall) {
      return {
        file: eachCall,
        moves: state.editedMoves.filter(move => {
          return move.$.file === eachCall
        })
      }
    })
  },
  getMovesInCombos: (state, getters) => (dictMv, dictUnmatchedCombos) => {
    let cname = ''

    Object.entries(state.editedCombos).forEach(c => {
      cname = c[0] // name of combo
      Object.entries(c[1].nodes).forEach(n => {
        // capt1: entire field,
        //   capt2: combine capt1 and capt2(which is considered full move name),
        //   capt3: bare move name without bracket,
        //   capt4: optional bracket comment in name, capt5: possible extension range for move.  #3 is our move name to match!
        // const mvC = n[1].text.match(/"((.*[\wáéíóú'])( +\(.*\))?)( \[\d-\d\])?"/u)[1]
        let mvC
        try {
          // note this regex should be consistent with validation in Moves::valnName method
          mvC = n[1].text.match(/^"(([\wáéíóúñÁÉÍÓÚÑ.'\-, ]*[\wáéíóúÁÉÍÓÚ.']+)( \([\wáéíóúñÁÉÍÓÚÑ'\-/, ]*\))?)( \[\d-\d\])?"$/u)[1]
        } catch (e) {
          throw new Error((n[1].text || n[1].toString()) + ' in combo is illegal name, combo:' + cname)
        }
        if (!(mvC in dictMv)) {
          if (!(mvC in dictUnmatchedCombos)) dictUnmatchedCombos[mvC] = {}
          if (!(cname in dictUnmatchedCombos[mvC])) dictUnmatchedCombos[mvC][cname] = 1
          else dictUnmatchedCombos[mvC][cname] += 1
        } else {
          if (!('seqs' in dictMv[mvC])) dictMv[mvC].combos = {}
          if (!(cname in dictMv[mvC].combos)) {
            // dictMv[mvC].seqs = {}
            dictMv[mvC].combos[cname] = 1
          } else {
            dictMv[mvC].combos[cname] += 1
          }
        }
      })
    })
  },
  getMovesInSeqs: (state, getters) => (dictMv, dictUnmatchedSeqs) => {
    // helper for getMovesWithUsage
    function getSEQSPEC () {
      return path.join(RMDIR, state.schemeName, 'secuencias_para_canciones', '*.seq')
    }

    const reMove = /move name="(.*)"/g
    const seqFilesReplaceOptionsXML = {
      files: getSEQSPEC(),
      from: reMove,
      to: (...args) => {
        const sSeqFile = args[4].substr(args[4].lastIndexOf('/') + 1).replace('.seq', '')
        if (!(args[1] in dictMv)) {
          if (!(args[1] in dictUnmatchedSeqs)) dictUnmatchedSeqs[args[1]] = {}
          if (!(sSeqFile in dictUnmatchedSeqs[args[1]])) dictUnmatchedSeqs[args[1]][sSeqFile] = 1
          else dictUnmatchedSeqs[args[1]][sSeqFile] += 1
        } else {
          if (!('seqs' in dictMv[args[1]])) dictMv[args[1]].seqs = {}
          if (!(sSeqFile in dictMv[args[1]].seqs)) {
            dictMv[args[1]].seqs[sSeqFile] = 1
          } else {
            dictMv[args[1]].seqs[sSeqFile] += 1
          }
        }
      },
      dry: true
    }
    replace.sync(seqFilesReplaceOptionsXML) // READONLY just a dry run!
  },
  getCallsNotUsedDisplay: (state, getters) => {
    const selEntries = getters.getCallsUsage.filter(m => m.moves.length === 0)
    return selEntries.map(ent => ent.file).join(', ') || 'none'
  }
}

const actions = {
  diagMovesWithUsage: ({ commit, dispatch, state, getters }) => {
    const dictDups = {} // should remain empty
    const dictUnmatchedCombos = {}
    const dictUnmatchedSeqs = {}
    const dictMv = {}
    const workMoves = _cloneDeep(state.editedMoves)
    workMoves.forEach(m => {
      const obj = {
        // define fields that will be displayed in System Information
        name: m.$.name,
        countSeq: 0, // placeholder
        countCombos: 0, // placeholder
        comment: m.comment ? m.comment[0] : '',
        details: '... awaiting fields'
      }
      if (m.$.name in dictMv) dictDups[m.$.name] = obj
      else dictMv[m.$.name] = obj
      if (!('combos' in dictMv[m.$.name])) dictMv[m.$.name].combos = {}
      if (!('seqs' in dictMv[m.$.name])) dictMv[m.$.name].seqs = {}
      dictMv[m.$.name].comment = m.comment
    })
    getters.getMovesInSeqs(dictMv, dictUnmatchedSeqs)
    getters.getMovesInCombos(dictMv, dictUnmatchedCombos)
    // Remove the mermaid graph start node 'Start' from the Combos list

    if ('Start' in dictUnmatchedCombos) delete dictUnmatchedCombos.Start
    const sMsgSeqs = JSON.stringify(dictUnmatchedSeqs, null, 4).replace(/\n\s*\},/g, '').replace(/[{}]/g, '')
      .replace(/\n\s*$/, '').replace(/(\n)/g, '$1<br>').replace(/ /g, '&nbsp;').replace('{}', '')
    const sMsgCombos = JSON.stringify(dictUnmatchedCombos, null, 4).replace(/\n\s*\},/g, '')
      .replace(/[{}]/g, '').replace(/\n\s*$/, '').replace(/(\n)/g, '$1<br>').replace(/ /g, '&nbsp;').replace('{}', '')

    if ('Continue' in dictMv) delete dictMv.Continue // this is used by system for spacing moves
    for (const m in dictMv) {
    // dictMv.forEach(m => {
      dictMv[m].countSeq = Object.getOwnPropertyNames(dictMv[m].seqs).length
      dictMv[m].countCombos = Object.getOwnPropertyNames(dictMv[m].combos).length
      dictMv[m].details = '<strong><em>Comment: ' + '</em></strong>' + dictMv[m].comment + '<br>'
      dictMv[m].details += '<strong><em>In Seqs:</em></strong><br>' + Object.entries(dictMv[m].seqs).map(e => '&nbsp;' + e[0] + ' (' + e[1] + ')').join('<br>') + '<p>'
      dictMv[m].details += '<strong><em>In Combos:</em></strong><br>' + Object.entries(dictMv[m].combos).map(e => '&nbsp;' + e[0] + ' (' + e[1] + ')').join('<br>') + '<p>'
    }
    commit('UPDATE_MOVES_USAGE', {
      movesWithUsage: Object.entries(dictMv).map(m => m[1]),
      msgUnmatchedSeqs: sMsgSeqs,
      msgUnmatchedCombos: sMsgCombos
    })
    // return [Object.entries(dictMv).map(m => m[1]), sMsgSeqs, sMsgCombos]
  },
  getDataList (context, which) {
    // these lists are PREPARED and DEPLOYED by "aws_pkg_deploy" utility
    // Aug 2023: only "available" is used right now
    // Out of the available packages, only sample music is installed via "OK" to user prompt, by default
    context.commit('SET_BUSY_NOTICE')
    // which = available or basic
    if (!['basic', 'available'].includes(which)) {
      throw new Error('getDataList must be called with one of "available" or "basic"')
    }
    // let that = this
    const fname = 'rme_' + which + '.json'
    const download = wget.download(encodeURI('https://s3.us-east-2.amazonaws.com/come2think.com/RuedaMatic/schemesAndBeats/' + fname), TEMPDIR + '/' + fname, {})
    download.on('error', err => {
      console.log(err)
      throw err
    })
    download.on('end', response => {
      context.commit('UNSET_BUSY_NOTICE')
      console.log('retrieved ' + fname)
      // parse
      try {
        const res = JSON.parse(fs.readFileSync(path.join(TEMPDIR, fname), 'utf8'))
        if (which === 'available') {
          context.commit('BUFFER_AVAILABLE_SCHEMES', res)
        } else {
          context.commit('BUFFER_BASIC_SCHEMES', res)
        }
      } catch (error) {
        console.error(error.stack || error.message || String(error))
        throw error
      }
    }
    )
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
