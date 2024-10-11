// xml2js notes:  https://stackoverflow.com/questions/20238493/xml2js-how-is-the-output#21977456
import fs from 'fs-extra'
import xml2js from 'xml2js'
import electron from 'electron'
import path from 'path'
import wget from 'wget-improved'
// lodash helpers
import _cloneDeep from 'lodash/cloneDeep'
import _sortBy from 'lodash/sortBy'
import _has from 'lodash/has'
import _trim from 'lodash/trim'
import _values from 'lodash/values'
import _uniq from 'lodash/uniq'
import _isEqual from 'lodash/isEqual'

// warning: my tests find AdmZip is ok for extract, no good for compress.  It messes up non-ASCII characters.  Use archiver for packing.
import AdmZip from 'adm-zip'
// endregion
const DOCDIR = electron.remote.app.getPath('documents')
const TEMPDIR = electron.remote.app.getPath('temp')
const HOMEDIR = electron.remote.app.getPath('home')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const RMSPOT = path.join(RMDIR, 'rm-spot').replace(/\\/g, '/') // used by AudioSprite, some code requires the unix file separator and in other cases, its still works for Windows

class discDataHelper {
  // /////////////////////////////
  // util functions in this part: call from anywhere
  // (just saves importing fs wherever needed)

  getTimeStampString () {
  //  TODO: FUTURE gen, use to name for generated scheme folders and seq files
  //  https://stackoverflow.com/questions/50182734/grunt-cssmin-and-timestamp-filename
  // Obtain local timestamp formatted as: YYYY-MM-DD-HH-MM-SS
    var tzOffset = (new Date()).getTimezoneOffset() * 60000
    var timeStamp = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1)
      .replace(/\.[\w\W]+?$/, '') // Delete from dot to end.
      .replace(/:|\s|T/g, '-') // Replace colons, spaces, and T with hyphen.
    return timeStamp
  }

  showFileDiffs (path1, path2) {
    const file1 = fs.readFileSync('C:\\Users\\rc\\temp\\moves.xml', 'utf8')
    const file2 = fs.readFileSync('C:\\Users\\rc\\temp\\moves2.xml', 'utf8')
    const d = require('diff').createTwoFilesPatch('C:\\Users\\rc\\temp\\moves.xml', 'C:\\Users\\rc\\temp\\moves2.xml', file1, file2, 'yy', 'zz', { context: 2 })
    console.log(d)
  }

  checkForMovChanges (path1, path2) {
    // TODO: SAFER: USE ON SCHEME UPDATE? not used currently
    //  USERS can assume that any new version of the SAME SCHEME
    //   is going to be valid with their old SEQ files.
    // However, if we have a SEQ for a given song already, find if contents are identical
    // If YES, leave the old one - DONE
    // If NO, present dialog: overwrite, use new, save both?
    // so the plan:
    // 1. get the currently installed SEQ
    // 2. get the incoming SEQ
    // 3. both: extract just the <move> lines
    // 4. run the diff
    // 5. if any '-' or '+' lines - a diff seq
    // just the moves
    const file1 = fs.readFileSync('C:\\Users\\rc\\temp\\moves.xml', 'utf8')
    const re = /(?:.*\n)*(.*<moves>(?:.*\n)*.*<\/moves>.*\n)(?:.*\n)*.*/g
    // eslint-disable-next-line no-unused-vars
    const sMoves = file1.replace(re, '$1')
    // replace <comment>.*<\/comment>
    // with <comment/>
    const file2 = fs.readFileSync('C:\\Users\\rc\\temp\\moves2.xml', 'utf8')
    const d = require('diff').createTwoFilesPatch('C:\\Users\\rc\\temp\\moves.xml', 'C:\\Users\\rc\\temp\\moves2.xml', file1, file2, 'yy', 'zz', { context: 2 })
    console.log(d)
  }

  getData (sScheme, callbackDone, callbackBeats) {
    // Gets the ZIP files containing extra samples
    const fname = sScheme
    // eslint-disable-next-line no-unused-vars
    let nInstalled = 0
    const download = wget.download(encodeURI('https://s3.us-east-2.amazonaws.com/come2think.com/RuedaMatic/schemesAndBeats/' + fname), TEMPDIR + '/' + fname, {})
    download.on('error', err => {
      console.log(err)
    })
    download.on('end', response => {
      try {
        const zip = new AdmZip(TEMPDIR + '/' + fname)

        const res = zip.getEntries()

        const music = res.filter(ent => ent.entryName.startsWith('Music/'))
        music.forEach(item => {
          zip.extractEntryTo(item, HOMEDIR, true, true)
          nInstalled += 1
        })
        if (music.length > 0) callbackDone(false) // false, no flag to prompt with new schemes dlg

        const schemeEntries = res.filter(ent => ent.entryName.startsWith('scheme_'))
        // kill all the moves, since dependencies must be 100% satisfied and extra files are unusable and confusing
        // leave the seq files
        if (schemeEntries.length > 0) fs.removeSync(path.join(RMDIR, path.basename(sScheme, '.zip'), 'vueltas'))
        schemeEntries.forEach(item => {
          // bools: maintainEntryPath, overwrite
          zip.extractEntryTo(item, RMDIR, true, true)
        })
        if (schemeEntries.length > 0) callbackDone(true)

        const beats = res.filter(ent => ent.entryName.startsWith('compases_para_canciones'))
        // eslint-disable-next-line prefer-const
        if (beats) {
          fs.removeSync(path.join(TEMPDIR, 'compases_para_canciones'))
          const beatsToOverwrite = []
          const newBeats = []
          beats.forEach(item => {
            // bools: maintainEntryPath, overwrite
            const tempFn = path.join(TEMPDIR, item.entryName)
            zip.extractEntryTo(item, TEMPDIR, true, true)
            if (this.fileExists(path.join(RMDIR, item.entryName))) {
              beatsToOverwrite.push(item.entryName)
              nInstalled += 1
            } else {
              fs.moveSync(tempFn, path.join(path.join(RMDIR, item.entryName)))
              newBeats.push(item.entryName)
            }
          })
          if (beatsToOverwrite.length > 0) {
            callbackBeats(beatsToOverwrite, newBeats)
            if (beats.length > 0) callbackDone(false) // false, no flag to prompt with new schemes dlg
            return
          }
        }
      } catch (error) {
        console.error(error.stack || error.message || String(error))
        throw error
      }
    })
  }

  ensureSchemeFoldersExist (scheme) {
    try {
      fs.ensureDir(RMDIR + '/' + scheme + '/vueltas')
      fs.ensureDir(RMDIR + '/' + scheme + '/secuencias_para_canciones')
    } catch (e) {
      console.log(e)
      throw e
    }
  }

  fileExists (rFile) {
    return !!fs.existsSync(rFile)
  }

  fileCanWrite (rFile) {
    try {
      const ret = !!fs.accessSync(rFile, fs.constants.W_OK)
      return (ret || true) // if OK, method returns 'undefined': else throws error
    } catch (error) {
      return false
    }
  }

  // /////////////////////////////
  // store functions in this part: only call from store
  getUserDataAll () {
    const uDataDir = electron.remote.app.getPath('userData')
    // note: in production,    'userData' = C:\Users\user\AppData\Roaming\ruedamatic-editor\
    // but:  in development,   'userData' = C:\Users\user\AppData\Roaming\Electron\
    const udFile = path.join(uDataDir, 'rme', 'userData.json')
    const obj = JSON.parse(fs.readFileSync(udFile, 'utf8'))
    return obj
  }

  persistUserDataAll (objData) {
    const uDataDir = electron.remote.app.getPath('userData')
    const appConfFolder = path.join(uDataDir, 'rme')
    fs.ensureDirSync(appConfFolder)
    const udFile = path.join(appConfFolder, 'userData.json')
    fs.writeFileSync(udFile, JSON.stringify(objData, null, 2), 'utf8')
  }

  settingsFileExists () {
    // in dev, ~\AppData\Roaming\Electron\rme\userData.json
    // in prod, ~\AppData\Roaming\ruedamatic-editor\rme\userData.json
    const uDataDir = electron.remote.app.getPath('userData')
    const udFile = path.join(uDataDir, 'rme', 'userData.json')
    return this.fileExists(udFile)
  }

  getCallsHelper (folder) {
    try {
      const callAry = fs.readdirSync(folder)
      return callAry.filter(fname => path.extname(fname) === '.mp3' ||
        path.extname(fname) === 'm4a' ||
        path.extname(fname) === '.3gp')
    } catch (e) {
      // directories should exist due to ensureSchemeFoldersExist
      console.log(e.message)
    }
  }

  getXMLData (inFile, asWhat) {
    const parser = new xml2js.Parser()
    let fileData = null
    let xmlContent = null

    try {
      fileData = fs.readFileSync(inFile)
    } catch (ex) {
      console.log('Does file exist? Unable to read file \'' + inFile + '\'.')
      throw ex
      // console.log(ex)
    }
    /* eslint-disable indent */ // BEGIN: es-lint can't understand callback indent
    parser.parseString(fileData, function (err, result) {
      if (err) {
        console.log('Unable to parse file \'' + inFile + '\'.')
        console.log(err)
        throw err
      } else {
        console.log('The file \'' + inFile + '\' was parsed!')
        xmlContent = result
      }
    })
    /* eslint-enable indent */ // END: es-lint can't understand callback indent
    if (asWhat.type === 'moves') {
      // for moves, loading the table, we construct a dictionary object, from the original array
      // Any edits made by the user, are updated in the ORIGINAL ARRAY  of Moves before saving
      let needSave = false // if we correct the moves on disc, then we should save before we're done
      const sysMove = {
        $: {
          name: 'Continue',
          nameSorted: 'continue',
          file: 'no-such-file.mp3',
          length: '1',
          lengthextendable: 'true',
          delaycount: '0'
        },
        comment: ['"Continue" is a system move name, required and uneditable.  Represents a silent interval, no mp3 file is needed']
      }
      // sort by name
      const movesRaw = xmlContent.root.moves[0].move.map(m => { m.$.nameSorted = m.$.name.toLocaleLowerCase(); return m })
      let moves = _sortBy(movesRaw, m => m.$.nameSorted)
      const testedMoves = moves.reduce(function (acc, cur, i) {
        if (_has(acc, cur.$.name)) {
          console.log('ERR: Move name not unique! ' + cur.$.name)
          // result: last one overwrites
        }
        if (_trim(cur.$.name).length < 3) {
          console.log('ERR: Move name illegal, too short! ' + cur.$.name)
          // result: only this warning
        }
        if (_trim(cur.$.nameSorted) === 'continue') {
          if (!_isEqual(cur, sysMove)) {
            needSave = true
            acc[cur.$.name] = sysMove
          } else {
            acc[cur.$.name] = cur
          }
        } else {
          acc[cur.$.name] = cur
        }
        return acc
      }, {}) // initial value is an empty object
      if (!testedMoves.Continue) {
        testedMoves.Continue = sysMove
        needSave = true
      }
      // if any combos: many be none!
      let testedCombos = [] // default, empty array
      try {
        const combos = xmlContent.root.combos[0].combo
        testedCombos = combos.reduce(function (acc, cur, i) {
          if (_has(acc, cur.$.name)) {
            console.log('ERR: Combo name not unique! ' + cur.$.name)
          }
          if (_trim(cur.$.name).length < 3) {
            console.log('ERR: Combo name illegal, too short! ' + cur.$.name)
          }
          acc[cur.$.name] = cur
          return acc
        }, {}) // initial value is an empty object
      } catch (e) {
        console.log('Caught err: no combos found in the moves file!')
      }
      // there may have been fixups, re Continue move see above: save in case
      if (needSave) {
        const asWhat = {
          type: 'moves',
          date: xmlContent.root.author[0].$.date,
          authorId: xmlContent.root.author[0].$.authorId,
          schemeName: xmlContent.root.scheme[0].$.schemeName,
          schemeProvider: xmlContent.root.scheme[0].$.schemeProvider,
          schemeDate: xmlContent.root.scheme[0].$.schemeDate
        }
        moves = _sortBy(_values(testedMoves), m => m.$.nameSorted)
        this.persistXMLData(inFile, [moves, this.xmlToCombos(testedCombos)], asWhat)
      }
      return {
        moves: moves,
        combos: this.xmlToCombos(testedCombos),
        schemeProvider: (xmlContent.root.author && xmlContent.root.author[0].$.authorId) || '',
        schemeDate: (xmlContent.root.author && xmlContent.root.author[0].$.date) || '',
        schemeName: (xmlContent.root.scheme && xmlContent.root.scheme[0].$.schemeName) || ''
      }
    } else if (asWhat.type === 'beats') {
      // note return is an object now!
      // following: copy of the Beats class for convenience
      class BeatTime {
        constructor (time, gear = 'mellow', comment = '') {
          this.time = time
          this.gear = gear
          this.comment = comment // free form comment
          this.bsVariant = 'success' // or 'danger', 'warning'
        }
      }
      let adjMd5
      let adjBpm
      adjMd5 = []
      adjBpm = 0
      if (xmlContent.root.musicfile[0]) {
        if (xmlContent.root.musicfile[0].$) {
          adjMd5 = xmlContent.root.musicfile[0].$.md5
          adjBpm = xmlContent.root.musicfile[0].$.bpm
        }
      }
      return {
        beats: xmlContent.root.beats[0].beat.map(beat => new BeatTime(beat._ / 1000, beat.$.gear || 'mellow', beat.$.comment || '')),
        md5: adjMd5,
        bpm: adjBpm,
        spotifySongId: xmlContent.root.authorAndSongURL[0].$.spotifySongId,
        authorId: xmlContent.root.authorAndSongURL[0].$.authorId,
        authorDate: xmlContent.root.authorAndSongURL[0].$.date,
        MP3URL: xmlContent.root.authorAndSongURL[0]._
      }
    } else if (asWhat.type === 'sequence') {
      // STRUCT: xmlContent.sequences.sequence[0].move[0].$.name
      return xmlContent.root
      // due to xml2js, each is object.  with obj.$.name.  Binary search takes the whole object
    } else { // just the data ma'am
      console.log('SEQ file contains non-standard data!')
      return xmlContent
    }
  }

  xmlToCombos (xmlData) {
    const res = {} // result: object in vue-mermaid form
    // construct object by levels
    // first key: Combo name
    const cbos = Object.keys(xmlData)
    cbos.forEach(c => {
      res[c] = { $: xmlData[c].$, nodes: {} }
      const nodes = xmlData[c].node
      nodes.forEach(n => {
        res[c].nodes[n.$.id] = {} // establish the XMLBuilder attribute property
        const o = res[c].nodes[n.$.id]
        o.text = '"' + n.$.text + '"'
        // could be undefined, ensure that returns false
        o.allowUpshift = !n.$.allowUpshift ? false : n.$.allowUpshift.toLowerCase() === 'true'
        o.allowEquivalent = !n.$.allowEquivalent ? false : n.$.allowEquivalent.toLowerCase() === 'true'
        if (n.$.edgeType) o.edgeType = n.$.edgeType
        if (n.links) {
          o.next = []
          n.links[0].link.forEach(nl => {
            o.next.push(nl.$.target)
          })
        }
        if (n.weights) {
          o.link = []
          n.weights[0].weight.forEach(nw => {
            o.link.push('-- ' + nw.$.value + ' -->')
          })
        }
        // continue here
      })
    })
    return res
  }

  mermaidToXml (cbo) {
    const combinsForXml = []
    try {
      let iterC = -1
      Object.keys(cbo).forEach(c => {
        ++iterC
        combinsForXml.push({
          $: cbo[c].$,
          node: []
        })
        let iterN = -1
        Object.keys(cbo[c].nodes).forEach(n => { // each node in combo
          ++iterN
          const hdrNode = {
            $: {
              id: n,
              text: this.stripOuterQuotes(cbo[c].nodes[n].text)
            }
          }
          // if allowUpshift etc. false (default) omit it from the object
          if (cbo[c].nodes[n].allowUpshift) Object.assign(hdrNode.$, { allowUpshift: cbo[c].nodes[n].allowUpshift })
          if (cbo[c].nodes[n].allowEquivalent) Object.assign(hdrNode.$, { allowEquivalent: cbo[c].nodes[n].allowEquivalent })
          combinsForXml[iterC].node.push(hdrNode)

          if (cbo[c].nodes[n].edgeType) combinsForXml[iterC].node[iterN].$.edgeType = cbo[c].nodes[n].edgeType
          if (cbo[c].nodes[n].next) {
            combinsForXml[iterC].node[iterN].links = [{ link: [] }]
            cbo[c].nodes[n].next.forEach(l => {
              combinsForXml[iterC].node[iterN].links[0].link.push({ $: { target: l } })
            })
          }
          if (cbo[c].nodes[n].link) {
            combinsForXml[iterC].node[iterN].weights = [{ weight: [] }]
            cbo[c].nodes[n].link.forEach(w => {
              const wClean = /^[- ]*([a-zA-Z0-9]*)+[ ->]*$/g.exec(w)[1]
              combinsForXml[iterC].node[iterN].weights[0].weight.push({ $: { value: wClean } })
            })
          }
        })
      })
    } catch (e) {
      console.log('ERROR: can\'t build combo object for saving with XML Builder:' + e.message)
    }
    return combinsForXml
  }

  stripOuterQuotes (str) {
    // mermaid requires us to put quotes around text field, in case there's even a spec character like '('
    // so we now need to detect and remove surrounding quotes for presentation
    let bFix = false
    if (str[0] === str[str.length - 1]) { // if the first char === last char
      if (str[0] === '"' || str[0] === '\'') { // if the first char is one of the quote chars
        bFix = true
      }
    }
    if (bFix) {
      return str.substring(1, str.length - 1)
    } else {
      return str
    }
  }

  persistXMLData (outFilePath, objData, asWhat) {
    // NOW ALSO saves json files for spotify client rm-spot
    // first clear the embedded GUI flags (_cellVariants) from the domain data (non-existent CALL file warning, cell is RED)
    let objDataClean = []
    let objDataCleanExtra = [] // sep 2019 combos added to moves file as extra data.
    if (Array.isArray(objData)) {
      if (asWhat.type === 'moves') {
        // objData is array of [0] moves [1] combos
        objDataClean = objData[0].map(item => {
          const temp = _cloneDeep(item)
          delete temp._cellVariants
          delete temp.$.howl
          return temp
        })
        objDataCleanExtra = this.mermaidToXml(objData[1]) // sep 2019, combos (graphs of moves) included in moves xml
      } else if (asWhat.type === 'beats') {
        objDataClean = objData.map(item => {
          return {
            _: Math.round(1000 * item.time),
            $: { gear: item.gear, comment: item.comment }
          }
        })
      } else if (asWhat.type === 'sequence') {
        let countExtended = 0
        for (let i = 0; i < objData.length; i++) {
          if (objData[i]) {
            if (objData[i].$ && objData[i].$.length === -1) {
            // a extended measure (continuation): these are dropped
              countExtended += 1
            } else {
              objDataClean[i - countExtended] = { $: { name: objData[i].$.name } }
            }
          } else {
            // Convention for the seq file is that even silences...
            // e.g.while a guapea or tumba frances is continung without calls...
            // even these a null placeholder in the file.
            // That's historically for the android player 'rm player', now implemented in RM-spot the sotify player.
            // so we use a silent reserved move called "Continue".  Nothing is heard, but it appears in the seq file.
            objDataClean[i - countExtended] = { $: { name: 'Continue' } }
          }
        }
      } else {
        objDataClean = objData
      }
    } else {
      objDataClean = objData
    }
    // now write the file via xml2js
    const builder = new xml2js.Builder()
    let xml = null
    if (asWhat.type === 'moves') {
      xml = builder.buildObject({
        root: [
          {
            author: {
              $: {
                date: asWhat.date,
                authorId: asWhat.authorId
              },
              _: 'Ruedamatic Editor'
            }
          },
          {
            scheme: {
              $: {
                schemeName: asWhat.schemeName,
                schemeProvider: asWhat.schemeProvider,
                schemeDate: asWhat.schemeDate
              },
              _: 'Ruedamatic Editor'
            }
          },
          objDataCleanExtra.length ? { // if none, skip the combos element
            combos: {
              combo: objDataCleanExtra
            }
          } : null,
          {
            moves: {
              move: objDataClean
            }
          }
        ]
      })
      fs.ensureDir(path.join(path.join(RMSPOT, asWhat.schemeName)))
      fs.writeFileSync(path.join(RMSPOT, asWhat.schemeName, 'moves.json'), JSON.stringify(objDataClean, null, 2), 'utf8')
      if (objDataCleanExtra.length) {
        fs.writeFileSync(path.join(RMSPOT, asWhat.schemeName, 'combos.json'), JSON.stringify(objDataCleanExtra, null, 2), 'utf8')
      }
      // this.$store.dispatch('diagMovesWithUsage')
    } else if (asWhat.type === 'beats') {
      // note the Beat object is replaced with a millisecond integer in the "clean" above
      xml = builder.buildObject({
        root: [
          {
            musicfile: {
              $: {
                md5: Array.isArray(asWhat.md5) ? JSON.stringify(_uniq(asWhat.md5)) : [asWhat.md5],
                bpm: asWhat.bpm || 1
              },
              _: path.basename(asWhat.filename)
            }
          },
          {
            authorAndSongURL: {
              $: {
                date: asWhat.date,
                authorId: asWhat.authorId,
                spotifySongId: asWhat.spotifySongId ? asWhat.spotifySongId : ''
              },
              _: asWhat.MP3URL || ''
            }
          },
          // {format: {
          //   '_': '2.0'
          // }},
          {
            beats: {
              beat: objDataClean
            }
          }
        ]
      })
      fs.ensureDir(path.join(path.join(RMSPOT, 'compases_para_canciones')))
      fs.writeFileSync(path.join(path.join(RMSPOT, 'compases_para_canciones', path.basename(outFilePath).replace(/\.xml/, '.json'))), JSON.stringify(objDataClean, null, 2), 'utf8')
    } else if (asWhat.type === 'sequence') {
      xml = builder.buildObject({
        root: [
          {
            musicfile: {
              $: {
                md5: Array.isArray(asWhat.md5) ? JSON.stringify(_uniq(asWhat.md5)) : [asWhat.md5]
              },
              _: path.basename(asWhat.filename)
            }
          },
          {
            scheme: {
              $: {
                provider: asWhat.schemeProvider,
                date: asWhat.schemeDate
              },
              _: asWhat.schemeName
            }
          },
          {
            author: {
              $: {
                authorId: asWhat.authorId,
                date: asWhat.authorDate,
                tags: asWhat.seqTags
              },
              _: 'Ruedamatic Editor'
            }
          },
          {
            sequences:
            {
              sequence:
              [{
                $: { id: '1', name: 'standard', type: 'shared' },
                move: objDataClean
              }]
            }
          }
        ]
      })
      fs.ensureDir(path.join(RMSPOT, asWhat.schemeName, 'secuencias_para_canciones'))
      const wrapRMSData = { name: asWhat.schemeName, authorId: asWhat.authorId, tags: asWhat.seqTags, moves: objDataClean }
      fs.writeFileSync(path.join(RMSPOT, asWhat.schemeName, 'secuencias_para_canciones', path.basename(outFilePath).replace(/\.seq/, '.jseq')), JSON.stringify(wrapRMSData, null, 2), 'utf8')
    } else if (asWhat.type === 'combos') {
      xml = builder.buildObject({
        root: [
          {
            combos: {
              combo: objDataClean
            }
          }
        ]
      })
    } else if (asWhat.type === 'plain') {
      xml = builder.buildObject(objDataClean)
    }
    // ONLY if a sequence file, there's special case: if all calls have been deleted, delete the sequence file.
    //  Otherwise it's misleading, on the Song Loader it displays as a song with a sequence.
    let deleteFileFlag = false // general default, all types of XML: the file is never deleted once it exists. Exception: seq file without moves other th Continue
    if (asWhat.type === 'sequence') {
      // for sequence files, it's important to be able to show in the GUI when there are moves, vs all moves have been deleted
      // but file still exists.  So: detect if the file will be empty on writing, if so, just delete it instead.
      deleteFileFlag = true // but default for sequence files, our test assumes file is empty until we know different
      // 'Continue' is an empty measure-holding move historically for the Android RM program.  If it's the only move in the file, delete the file!
      for (let i = 0; i < objData.length; i++) {
        if (objDataClean[i] && objDataClean[i].$ && objDataClean[i].$.name !== 'Continue') {
          deleteFileFlag = false
          break
        }
      }
    }
    if (deleteFileFlag) {
      if (this.fileExists(outFilePath)) {
        fs.remove(outFilePath) // empty, better to delete it
        console.log('The file ' + outFilePath + ' was DELETED!')
        const rmsOutFilePath = path.join(RMSPOT, asWhat.schemeName, 'secuencias_para_canciones', path.basename(outFilePath).replace(/\.seq/, '.jseq'))
        fs.remove(rmsOutFilePath)
        console.log('The file ' + rmsOutFilePath + ' was DELETED!')
      }
    } else {
      // could use writeFileSync but may not be required, s/b more responsive this way
      // VUE WARNING seen in developer console "$attrs is readonly" or "$listeners is readonly"
      //  - Forums say likely due to duplicate component registration in one of the Mermaid/SVG components.
      //  - judged ok to ignore
      fs.writeFile(outFilePath, xml, function (err) {
        if (err) {
          throw err
        }
        console.log('The file ' + outFilePath + ' was SAVED!')
      })
    }
  }

  // Jan 2024: there are two different binary searches for sort arrays in use
  //   This was original, later the move autofill was deemed more time sensitive
  //     so a second algorithm was added as a method on arrays in AutoFiller.js
  // http://jsfiddle.net/aryzhov/pkfst550/
  /*
      * Binary search in JavaScript.
      * Returns the index of of the element in a sorted array or (-n-1) where n is the insertion point for the new element.
      * Parameters:
      *     ar - A sorted array
      *     el - An element to search for
      *     RC: the compareFunc is the only place I customize the code for my data specifics, plus I embedded it
      *     compareFunc - A comparator function. The function takes two arguments: (a, b) and returns:
      *        a negative number  if a is less than b
      *        0 if a is equal to b
      *        a positive number of a is greater than b.
      * The array may contain duplicate elements. If there are more than one equal elements in the array,
      * the returned value can be the index of any one of the equal elements.
      */
  /* esl-disable no-unused-vars */
  binarySearch (ar, el) {
    function compareFunc (a, b) {
      // return a - b
      if (a.$) {
        if (a.$.name.toLocaleLowerCase() === b.$.name.toLocaleLowerCase()) {
          return 0
        } else if (a.$.name.toLocaleLowerCase() > b.$.name.toLocaleLowerCase()) {
          return +1
        } else if (a.$.name.toLocaleLowerCase() < b.$.name.toLocaleLowerCase()) {
          return -1
        }
      } else {
        if (a === b) {
          return 0
        } else if (a > b) {
          return +1
        } else if (a < b) {
          return -1
        }
      }
    }
    var m = 0
    var n = ar.length - 1
    while (m <= n) {
      var k = (n + m) >> 1
      var cmp = compareFunc(el, ar[k])
      if (cmp > 0) {
        m = k + 1
      } else if (cmp < 0) {
        n = k - 1
      } else {
        return k
      }
    }
    return -m - 1
  }
}

export default discDataHelper
