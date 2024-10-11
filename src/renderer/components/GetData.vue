
<template>
  <div>
    <b-card
      title="Get more...  schemes, new beats files, sample music with moves."
      tag="article"
      class="mb-2">
      <p v-if="listIsShown" >Select an item to download, and click the install button</p>
      <b-alert :show="!listIsShown">Click "List" to see a list of schemes (or other data) available.  </b-alert>
      <b-alert :show="$store.state.settingsStore.settings.userType === '2'" variant="warning"><strong>(SEQ : SCHEMES) : BEATS : MUSIC dependencies </strong> Downloaded files all have certain dependencies.
         MUSIC stands alone.  BEATS will depend on the MUSIC they are based on.  SEQUENCES depend on BEATS and their particular SCHEME.  When downloading these components, download also their dependencies as listed.
         To keep your custom moves, combos, and sequences you can rename the folders.  e.g. The default scheme is at Documents/RuedaMaticEditor/scheme_rueda_normal_basica.
         You could rename your modified folder from <strong>"scheme_rueda_basica"</strong> to <strong>"scheme_rueda_basica_MY_VERSION"</strong>.
         Then update to the latest version of "scheme_rueda_basica".  Both (the new standard and your renamed one) will be available.</b-alert>
      <b-alert :show="$store.state.settingsStore.settings.userType === '2'" variant="warning"><strong>Have you CHANGED SEQUENCES?</strong> And you haven't revised or added moves.  Then you
        can update your scheme from our server.  Your existing CALL SEQUENCES will be preserved.
        And old moves should be preserved ideally. </b-alert>
      <b-alert :show="$store.state.settingsStore.settings.userType === '1'" variant="warning">A <strong>'Caller'</strong> user can only update their available beats (compases).
      You can do this to have more songs available for adding rueda calls.
      </b-alert>

      <b-form-group>
        <b-form-radio-group v-if="availableSchemes" id="schemeList" v-model="selectedDataFile" name="flavour-2">
          <div class="container-fluid">
          <b-row v-for="(scheme,index) in availableSchemes" :key="index" class="border-top">
            <b-col md="3" class="my-2">
              <b-form-radio :value="getEntryKeyBasename(scheme)">
                <strong>{{getEntryKeyBasename(scheme)}}:</strong>
              </b-form-radio>
            </b-col>
            <b-col md="5" class="my-2">{{getEntryObject(scheme).description}}
            </b-col>
            <b-col md="4" class="my-2">Provider:
              <b-button size="sm" v-if="getEntryObject(scheme).providedBy.providedByURL" variant="success" @click="opn(getEntryObject(scheme).providedBy.providedByURL)">{{getEntryObject(scheme).providedBy.provider}}</b-button>
            <hr>Other download info:<br>
            <b-button size="sm" v-if="getEntryObject(scheme).infoUrls[0]" @click="opn(getEntryObject(scheme).infoUrls[0].url)">{{getEntryObject(scheme).infoUrls[0].desc}}</b-button>
            <b-button size="sm" v-if="getEntryObject(scheme).infoUrls[1]" @click="opn(getEntryObject(scheme).infoUrls[1].url)">{{getEntryObject(scheme).infoUrls[1].desc}}</b-button></b-col>
            <hr>
          </b-row>
          </div>
        </b-form-radio-group>
      </b-form-group>
      <b-button v-if="!listIsShown" href="#" variant="success" @click="getDataList('available')" title="From come2think.com server: show a list of data available for update.">List</b-button>
      <b-button v-else href="#" variant="warning" @click="downloadSelectedDlg" title="Schemes are installed to Documents/RuedaMaticEditor.
Music in the system Music folder.
Beats files go to Documents/RuedaMaticEditor/compases_para_canciones... overwriting on a file-by-file basis."
        >Install selected</b-button>
      <div v-if="listIsShown">Status: {{downloadStatus}}</div>
    </b-card>
  </div>
</template>

<script>
import DiscDataHelper from '../store/shared/DiscDataHelper.js'
import fs from 'fs-extra'
import path from 'path'
import electron from 'electron'
import replace from 'replace-in-file'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const TEMPDIR = electron.remote.app.getPath('temp')

const discDataHelper = new DiscDataHelper()

export default {
  data () {
    return {
      listIsShown: false,
      discDataHelper: null,
      selectedDataFile: '',
      downloadStatus: '[download status will show here]',
      downloadCount: 0
    }
  },
  mounted: function () {
    console.log('mounted')
  },
  computed: {
    availableSchemes () {
      // could be schemes, but also any other bundle with music, sequences, beats
      const avails = this.$store.state.movesStore.availableSchemes
      if (this.$store.state.settingsStore.settings.userType === '2') return avails
      else return Array.isArray(avails) ? this.$store.state.movesStore.availableSchemes.filter(item => Object.keys(item)[0].includes('compases')) : []
    },
    availableSchemesKeys () {
      return this.availableSchemes ? Object.keys(this.availableSchemes) : []
    }
  },
  watch: {
    availableSchemes (newVal) {
      // could be schemes, but also any other bundle with music, sequences, beats
      if (this.availableSchemes.length > 0) {
        this.listIsShown = true
      }
    }
  },
  methods: {
    downloadSelectedDlg () {
      // see onClose, onConfirm for the dependent code!
      this.downloadCount = 0
      let itemExists = false
      // eslint-disable-next-line no-unused-vars
      let msgPrompt
      if (fs.pathExistsSync(path.join(RMDIR, this.selectedDataFile))) {
        if (this.selectedDataFile.match(/^scheme_/)) {
          msgPrompt = 'Scheme exists.  Push OK to delete and replace with updated version.  '
          msgPrompt += 'Push Cancel to just keep existing scheme.  (You can rename your existing scheme and then download the updated scheme)'
          itemExists = true
        } else if (this.selectedDataFile.match(/^compases_/)) {
          msgPrompt = '' // no prompt here. LATER: we'll check file by file in DiscDataHelper download routine
        } else { // other: so far, this is only sample songs WITH music, beats, [and seq?]
          msgPrompt = '' // no prompt, we're just going to download
        }
      }
      if (itemExists) {
        this.$bvModal.msgBoxConfirm(msgPrompt, { title: 'Overwrite "' + this.selectedDataFile + '"?' })
          .then(value => {
            if (value) {
              this.downloadSelected()
            }
          }
          )
      } else {
        this.downloadSelected()
      }
    },
    downloadSelected () {
      try {
        this.getData(this.selectedDataFile + '.zip')
      } catch (e) {
        this.$bvModal.msgBoxOk('Install failed: ' + e.message, { title: 'Get from cloud failed' })
        this.downloadStatus = 'Download failed!'
      }
    },
    getData (scheme) {
      this.$store.commit('SET_BUSY_NOTICE')
      this.downloadStatus = 'Starting download...'
      discDataHelper.getData(scheme, this.setRefreshSchemesFlag, this.handleBeatsOverwrites) // arg2: callback, arg3: callback if beatsOverwrite needs confirm
    },
    handleBeatsOverwrites (beatsToOverwrite, newBeats) {
      const locAuthorId = this.$store.state.settingsStore.settings.authorId
      // myBeats: which beats are authored by current user
      // rationale: if last TOUCH is by you, it is more likely to be a CHANGE you want to keep
      const myBeats = []
      const othersBeats = []
      const lookin = function (args) {
        try {
          if (args[3] === locAuthorId) {
            myBeats.push(path.basename(args[6]))
          } else {
            othersBeats.push(path.basename(args[6]))
          }
        } catch (e) {
          this.$bvModal.msgBoxOk('Error in beats file arg3-authorId, or arg6-filename', { title: 'Error getting Beats file authors' })
        }
      }
      replace.sync({ // don't need results
        files: beatsToOverwrite.map(f => path.join(RMDIR, f)),
        from: /<authorAndSongURL(.* (authorId="(.+){1}">).*)<\/authorAndSongURL>/gi,
        to: (...args) => lookin(args),
        dry: true
      })
      console.log('Author id for current user: ' + locAuthorId)
      this.$bvModal.msgBoxOk(newBeats.length + ' totally new beats files were installed that you didn\'t have yet in your Beats \n FILES LIST: ' +
        newBeats.join(' // '), { title: 'Brand new beats files installed' })
      if (othersBeats.length > 0) {
        this.$bvModal.msgBoxConfirm(othersBeats.length + ' of the incoming beats files exist already (and haven\'t been touched by you).  ' +
            'Do you want the new files to overwrite? \n FILES LIST: ' + othersBeats.join(' // '), { title: 'Overwrite existing Beats files?', okTitle: 'YES', cancelTitle: 'NO' })
          .then(value => {
            if (value) {
              for (let i = 0; i < othersBeats.length; i++) {
                const tempSrc = path.join(TEMPDIR, 'compases_para_canciones', othersBeats[i])
                const tempDest = path.join(RMDIR, 'compases_para_canciones', othersBeats[i])
                fs.moveSync(tempSrc, tempDest, { overwrite: true })
              }
            }
          })
      }
      if (myBeats.length > 0) {
        this.$bvModal.msgBoxConfirm(myBeats.length + ' of the incoming beats files exist already (MODIFIED BY YOU).  ' +
            'Do you want the new files to overwrite your beats? \n FILES LIST: ' + myBeats.join(' // '), { title: 'Overwrite existing Beats files?', okTitle: 'YES', cancelTitle: 'NO' })
          .then(value => {
            if (value) {
              for (let i = 0; i < myBeats.length; i++) {
                const tempSrc = path.join(TEMPDIR, 'compases_para_canciones', myBeats[i])
                const tempDest = path.join(RMDIR, 'compases_para_canciones', myBeats[i])
                fs.moveSync(tempSrc, tempDest, { overwrite: true })
              }
            }
          })
      }
    },
    setRefreshSchemesFlag (setSchemesUpdateFlag = false) {
      // pass this to discDataHelper to call when done with update
      this.downloadCount += 1
      this.downloadStatus = 'Downloaded fileset...'
      if (setSchemesUpdateFlag) this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
      this.$store.commit('UNSET_BUSY_NOTICE')
      this.selectedDataFile = ''
    },
    getDataList (which) {
      this.$store.dispatch('getDataList', which)
    },
    getEntryKeyBasename (obj) {
      const key = Object.keys(obj)[0]
      return key.substring(0, key.length - 4)
    },
    getEntryObject (obj) {
      const key = Object.keys(obj)[0]
      return obj[key]
    },
    opn (event) {
      this.$electron.shell.openExternal(event)
    }
  }
}
</script>

<style scoped>
    .title {
        color: #8b0000;
        font-size: 18px;
        font-weight: initial;
        letter-spacing: .25px;
        margin-top: 10px;
    }

    .items {
        margin-top: 8px;
    }

    .item {
        display: flex;
        margin-bottom: 6px;
    }

    .item .name {
        color: #6a6a6a;
        margin-right: 6px;
    }

    .item .value {
        color: #35495e;
        font-weight: bold;
    }
</style>
