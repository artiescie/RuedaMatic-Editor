import DiscDataHelper from '../shared/DiscDataHelper'
import _cloneDeep from 'lodash/cloneDeep'
import _pick from 'lodash/pick'

import electron from 'electron'
import path from 'path'
const HOMEDIR = electron.remote.app.getPath('home')
const MUSICFOLDER = path.join(HOMEDIR, 'Music')

const discDataHelper = new DiscDataHelper()

// the default assumed name of the data folder
// addtional folders can be set for other calls: suelta, ruedx, wheelchair etc.
const standardRMEfolder = 'scheme_rueda_normal_basica'

// production settings at: ~\AppData\Roaming\ruedamatic-editor\rme\userData.json
// dev settings at: ~\AppData\Roaming\Electron\rme\userData.json
const initialSettings = {
  userType: '1', // set calls for a song
  beatsShowUsage: true,
  RMEFolder: standardRMEfolder,
  settingsVersion: 9,
  beatToCallOn: 1,
  presetOrAutofill: 1, // 1-preset, 2-autofill
  authorId: process.env.username || process.env.user,
  playables: { '01 La Calle Me Llama.m4a': MUSICFOLDER },
  musicVol: 0.7
}
const state = {
  settings: _cloneDeep(initialSettings),
  version: '8.0.0' // this is the RME App version, must agree with package.json (manual check)
}

// update settings, get a setting
const mutations = {
  PRESET_OR_AUTOFILL (state, payload) {
    state.settings.presetOrAutofill = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  BEAT_TO_CALL_ON (state, payload) {
    state.settings.beatToCallOn = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  CHANGE_RME_FOLDER (state, payload) {
    state.settings.RMEFolder = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  CHANGE_USERTYPE (state, payload) {
    state.settings.userType = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  CHANGE_MUSICVOL (state, payload) {
    state.settings.musicVol = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  CHANGE_AUTHORID (state, payload) {
    state.settings.authorId = payload
    discDataHelper.persistUserDataAll(state.settings)
  },
  INIT_SETTINGS_DATA (state) {
    if (!discDataHelper.settingsFileExists()) {
      discDataHelper.persistUserDataAll(state.settings)
    } else {
      const settings = discDataHelper.getUserDataAll()
      // overwrite unless it's the exact version we need
      if (settings.settingsVersion !== initialSettings.settingsVersion) {
        const newKeyset = Object.getOwnPropertyNames(state.settings)
        const cleanedOldkeyset = _pick(settings, newKeyset) // lodash: drop any old settings keys that are dropped in new version
        delete cleanedOldkeyset.settingsVersion // don't keep old version
        state.settings = Object.assign(state.settings, cleanedOldkeyset)
        discDataHelper.persistUserDataAll(state.settings)
      } else {
        state.settings = settings
      }
    }
  },
  UPGRADE_SETTINGS_DATA (state) {
    if (!discDataHelper.settingsFileExists()) {
      discDataHelper.persistUserDataAll(state)
    }
  },
  UPDATE_SETTINGS_DATA (state, objData) {
    // use to merge a new setting
    Object.assign(state.settings, objData)
    // Vue.set(state.settings.playables, objData)
    discDataHelper.persistUserDataAll(state.settings)
  }
}

const getters = {
  getUserData: state => key => {
    // e.g. ...$store.getUserData('version')
    if (!state.settings) {
      mutations.INIT_SETTINGS_DATA(state)
    }
    return state.settings[key]
  }
}

const actions = {
  setPlayable: (context, newPlayable) => {
    const playables = _cloneDeep(context.state.settings.playables || {})
    Object.assign(playables, newPlayable)
    context.commit('UPDATE_SETTINGS_DATA', { playables: playables })
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
