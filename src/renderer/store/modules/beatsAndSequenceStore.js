/* eslint-disable no-prototype-builtins */
// from https://forum.vuejs.org/t/notify-vue-that-item-has-been-changed-solved/29938/2
// And finally. Since nobody answered, here I found how to tell vue ‘my data structure is changed, please reinitialize observer’.
//
// // Let's say structure of 'item' is changed.
// // We have to give some kick to Vue to reinitialize observer
// // And yes, we need to know 'item' internals :(
//
// // First remove old observer.
// delete this.item._data.__ob__;
//
// // Next define the new one
// Vue.util.defineReactive(this.item.__ob__.value, '_data', this.item._data);
//
// // And finally notify about changes, like $set does
// this.item.__ob__.dep.notify();
// Yes, it is dirty. But it works: https://jsfiddle.net/h34a7s0n/89/

import DiscDataHelper from '../shared/DiscDataHelper'
import path from 'path'
import electron from 'electron'
import Vue from 'vue'
import _cloneDeep from 'lodash/cloneDeep'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'

const discDataHelper = new DiscDataHelper()

class BeatTime {
  constructor (time, gear = 'mellow', comment = '') {
    this.time = time
    this.gear = gear
    this.comment = comment // free form comment
    this.bsVariant = 'success' // or 'danger', 'warning'
  }
}

const state = {
  lstTimesOrig: [],
  lstTimesWork: [],
  originalSeq: [], // original object array
  editedSeq: [], // edited object, optionally save this,
  MP3FileName: '', // use getter/computed for XML, SEQ filenames
  MP3FileNameMd5GivenXML: [], // md5 expected according to loaded BEATS (.xml) file
  MP3FileNameMd5GivenSEQ: [], // md5 expected according to loaded SEQUENCE (.seq) file
  MP3FileNameMd5Actual: '',
  MP3FileNameBPM: 0,
  xmlAuthor: '',
  xmlDate: 0,
  MP3URL: '',
  seqAuthor: '',
  seqAuthorDate: 0,
  seqTags: '',
  seqMd5: '',
  seqFile: '',
  seqScheme: '',
  seqSchemeAuthor: '',
  seqSchemeDate: 0,
  bReloadCurrentSeq: false, // for auto renaming of moves in seq files, when a move name is changed on Moves tab
  spotifySongId: ''
}

const mutations = {
  PRESET_OR_AUTOFILL (state, payload) {

  },
  NUDGE_ALL_CALLS (state, payload) {
    // payload: index, count.  If no index
    //  then consider start as 0
    const index = payload.index || 0
    const count = payload.count
    if (!payload.index) {
      if (count < 0) {
        state.editedSeq.splice(index, -count)
      } if (count > 0) {
        state.editedSeq.splice(index, 0, ...new Array(count)) // increase seq - which is a sparse array
        // trim if it's now longer than the beats (times) array
        state.editedSeq.splice(state.lstTimesWork.length) // if it's become longer than beats, trim it!
      }
    }
  },
  ZAP_THE_CALLS (state, payload) {
    if (payload && typeof payload.startIndex === 'undefined') {
      // in the GUI: pushed "delete all" button
      state.editedSeq = []
    } else {
      if (payload.shift && payload.shift === 1) {
        // Shift RIGHT: at startindex, 0 deleted, 1 undefined inserted
        //  since the spot needs to still be in the array, to correspond to beats array
        state.editedSeq.splice(payload.startIndex, 0, undefined)
      } else if (payload.shift && payload.shift === -1) {
        // to left by 1, overwriting the one clicked on
        state.editedSeq.splice(payload.startIndex, 1)
      } else if (payload.allRemaining) {
        // delete everything from here
        state.editedSeq.splice(payload.startIndex)
      }
    }
  },
  NUDGE_ALL_BEATS (state, seconds) {
    const lstTimesLocal = state.lstTimesWork.map(beat => {
      beat.time += seconds
      return beat
    })
    state.lstTimesWork = lstTimesLocal
  },
  SET_RELOAD_CURRENT_SEQ (state) {
    state.bReloadCurrentSeq = true
  },
  UNSET_RELOAD_CURRENT_SEQ (state) {
    state.bReloadCurrentSeq = false
  },
  SET_MP3NAME_AND_DEPS (state, payload) {
    // make sure state fields are updated for a save
    try {
      if (payload.MP3FileName === '') {
        // how you clear the file related fields: an empty filename string
        state.MP3FileName = ''
        state.MP3FileNameMd5GivenXML = []
        state.MP3FileNameMd5GivenSEQ = []
        state.MP3FileNameMd5Actual = ''
        state.MP3FileNameBPM = 0

        state.xmlAuthor = ''
        state.xmlDate = 0
        state.MP3URL = 'NO SONG URL'
        state.spotifySongId = ''

        state.seqAuthor = ''
        state.seqAuthorDate = 0
        state.seqTags = ''
        state.editedSeq = ''
        state.seqFile = ''
        state.seqAuthor = ''
        state.seqScheme = ''
        state.seqSchemeAuthor = ''
        state.seqSchemeDate = 0
      } else {
        // how you set individual file properties: if payload has the key, we use the value.  Otherwise keep curr value!
        if (payload.hasOwnProperty('MP3FileName')) state.MP3FileName = payload.MP3FileName
        if (payload.hasOwnProperty('MP3FileNameMd5GivenXML')) state.MP3FileNameMd5GivenXML = payload.MP3FileNameMd5GivenXML
        if (payload.hasOwnProperty('MP3FileNameMd5GivenSEQ')) state.MP3FileNameMd5GivenSEQ = payload.MP3FileNameMd5GivenSEQ
        if (payload.hasOwnProperty('MP3FileNameMd5Actual')) state.MP3FileNameMd5Actual = payload.MP3FileNameMd5Actual
        if (payload.hasOwnProperty('MP3FileNameBPM')) state.MP3FileNameBPM = payload.MP3FileNameBPM

        if (payload.hasOwnProperty('xmlAuthor')) state.xmlAuthor = payload.xmlAuthor
        if (payload.hasOwnProperty('xmlDate')) state.xmlDate = payload.xmlDate
        if (payload.hasOwnProperty('MP3URL')) state.MP3URL = payload.MP3URL
        if (payload.hasOwnProperty('spotifySongId')) state.spotifySongId = payload.spotifySongId

        if (payload.hasOwnProperty('MP3FileNameMd5GivenSEQ')) state.MP3FileNameMd5GivenSEQ = payload.MP3FileNameMd5GivenSEQ
        if (payload.hasOwnProperty('seqFile')) state.seqFile = payload.seqFile
        if (payload.hasOwnProperty('seqAuthor')) state.seqAuthor = payload.seqAuthor
        if (payload.hasOwnProperty('seqAuthorDate')) state.seqAuthorDate = payload.seqAuthorDate
        if (payload.hasOwnProperty('seqTags')) state.seqTags = payload.seqTags
        if (payload.hasOwnProperty('seqScheme')) state.seqScheme = payload.seqScheme
        if (payload.hasOwnProperty('seqSchemeAuthor')) state.seqSchemeAuthor = payload.seqSchemeAuthor
        if (payload.hasOwnProperty('seqSchemeDate')) state.seqSchemeDate = payload.seqSchemeDate
      }
    } catch (e) {
      console.log('error setting MP3 and HASH for: ' + state.MP3FileName)
      throw e
    }
  },
  SET_BEATS_AUTHOR_AND_URL (state, payload) {
    try {
      state.xmlAuthor = payload.authorId
      state.xmlDate = payload.beatsAuhtorDate
      state.MP3URL = payload.MP3URL || 'NO SONG URL'
    } catch (e) {
      console.log('error setting Beats Author INFO for: ' + state.MP3FileName)
      throw e
    }
  },
  SET_BEATS_BPM (state, payload) {
    try {
      state.MP3FileNameBPM = payload.MP3FileNameBPM
    } catch (e) {
      console.log('error setting Beats BPM for: ' + state.MP3FileName)
      throw e
    }
  },
  INIT_BEATS (state, beats) {
    state.lstTimesOrig = beats
    state.lstTimesWork = beats
  },
  PERSIST_BEATS (state, asWhat) {
    // reset our "orig" to new starting state
    state.lstTimesOrig = asWhat.lstTimes
    discDataHelper.persistXMLData(
      getters.getXMLFileName(state)(asWhat.RMEFolder),
      asWhat.lstTimes,
      asWhat
    )
  },
  SET_BEAT_WARNING (state, payload) {
    Vue.set(state.lstTimesWork[payload.ind], 'bsVariant', payload.variant)
  },
  SET_BEAT_BOING (state, payload) {
    if (payload.elem) {
      Vue.set(payload.elem, 'boing', payload.boing)
    } else if (payload.ind) {
      Vue.set(state.lstTimesWork[payload.ind], 'boing', payload.boing)
    }
  },
  CLEAR_BEAT_BOINGS (state) {
    state.lstTimesWork.forEach((elem, ind) => {
      Vue.set(elem, 'boing', false)
    })
  },
  ADD_NEW_BEAT (state, time) {
    state.lstTimesWork.push(time) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
  },
  DELETE_ONE_BEAT (state, index) {
    state.lstTimesWork.splice(index, 1) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
  },
  DELETE_BEATS_AFTER (state, index) {
    state.lstTimesWork.splice(index, state.lstTimesWork.length) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
  },
  INSERT_BEAT_BEFORE (state, payload) {
    const mean = payload.mean
    const index = payload.index
    const gear = payload.gear || 'mellow'
    const suggestTime = payload.time
    if (index > 0) {
      const time = suggestTime || (state.lstTimesWork[index].time + state.lstTimesWork[index - 1].time) / 2
      const bt = new BeatTime(time, gear)
      state.lstTimesWork.splice(index, 0, bt) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
    } else {
      // use the mean: field
      let bt
      if (suggestTime) {
        bt = new BeatTime(suggestTime)
        state.lstTimesWork.splice(0, 0, bt) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
      } else {
        const earlyTime = state.lstTimesWork[index].time - mean
        if (earlyTime > 0) {
          bt = new BeatTime(earlyTime)
          state.lstTimesWork.splice(0, 0, bt) // quote: Vue wraps array methods like push, splice etc so they will also trigger view updates.
        }
      }
    }
  },
  ADJUST_BEAT_FIELD (state, payload) {
    // payload flds: .ind = index, .time = time
    if (payload.time) state.lstTimesWork[payload.ind].time = payload.time
    if (payload.gear) state.lstTimesWork[payload.ind].gear = payload.gear
    // little trickier for a string that may be overwritten with a falsey empty string
    if (Object.prototype.hasOwnProperty.call(payload, 'comment')) state.lstTimesWork[payload.ind].comment = payload.comment
  },
  PERSIST_SEQ (state, asWhat) {
    discDataHelper.persistXMLData(
      getters.getSEQFileName(state)(asWhat.RMEFolder),
      asWhat.lstSeq,
      asWhat
    )
  },
  LOAD_BEATS (state, lstTimes) {
    state.lstTimesWork = lstTimes
  },
  LOAD_SEQ (state, seqSaved) {
    state.editedSeq = seqSaved
  },
  DELETE_THIS_SEQ_MOVE (state, { index, lstTimes }) {
    const currMoveName = state.editedSeq[index].$.name
    state.editedSeq.splice(index, 1, undefined) // Vue $delete is not js delete, and js delete is not reactive
    for (var i = 1; index + i < lstTimes.length; i++) {
      if (state.editedSeq[index + i] &&
          state.editedSeq[index + i].$.name === currMoveName &&
          state.editedSeq[index + i].$.length === -1) {
        Vue.set(state.editedSeq, index + i, undefined) // Vue $delete is not js delete, js delete is not reactive
      } else {
        break
      }
    }
  },
  ADD_THIS_SEQ_MOVE (state, { index, item, maxBeat }) {
    if (state.editedSeq[index]) {
      // clear the old move and it's continuations... eventually s/b redundant
      for (var i = 1; index + i < maxBeat; i++) {
        if (state.editedSeq[index + i] &&
            state.editedSeq[index + i].$.name === state.editedSeq[index].$.name &&
            state.editedSeq[index + i].$.length === -1) {
          Vue.set(state.editedSeq, index + i, undefined) // Vue $delete is not js delete, js delete is not reactive
        } else {
          break
        }
      }
    }
    // set the new call...
    Vue.set(state.editedSeq, index, item)
    // and it's continuations
    for (var j = 1; j < item.$.length; j++) {
      if (index + j < maxBeat) { // may be redundant: avoids collision with following move
        Vue.set(state.editedSeq, index + j, _cloneDeep(item)) // clone or base move changes too
        // overwrite length: marks that it is a continuation of a move
        state.editedSeq[index + j].$.length = -1
      }
    }
  }
}

const getters = {
  getXMLFileName: state => (folder) => {
    const beatsFolder = path.join(RMDIR, 'compases_para_canciones')
    if (state.MP3FileName) {
      return path.join(
        beatsFolder,
        path.basename(state.MP3FileName, path.extname(state.MP3FileName)) +
        '.xml'
      )
    } else {
      // clicking on Vuex in devtools may cause this to be evaluated before init'd
      return undefined
    }
  },
  // used by PERSIST_SEQ
  getSEQFileName: state => (folder) => {
    const BEATSFOLDER = path.join(RMDIR, folder, 'secuencias_para_canciones')
    if (state.MP3FileName) {
      return path.join(
        BEATSFOLDER,
        path.basename(state.MP3FileName, path.extname(state.MP3FileName)) +
        '.seq'
      )
    } else {
      // clicking on Vuex in devtools may cause this to be evaluated before init'd
      return undefined
    }
  }
}

const actions = {
  setMP3NameAndCalcMd5 (context, payload) {
    // we should get the ipc callback below and set filename AND actual md5
    //  beware: usually fails to set a breakpoint on this code in the callback thread, although it seems to execute
    try {
      electron.ipcRenderer.on('asynch-md5-result', (event, data) => {
        console.log('ipcRenderer got event with: ' + data)
        context.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: payload.MP3FileName, MP3FileNameMd5Actual: data })
      })
      console.log('ipcRenderer requesting md5')
      electron.ipcRenderer.send('asynch-md5-request', payload.MP3FileName)
    } catch (e) {
      console.log('error setting MP3 and HASH for: ' + payload.MP3FileName)
      throw e
    }
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
