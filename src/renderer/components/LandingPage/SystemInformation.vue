<template>
  <!-- note: icons are from Font Awesome project, via vue-awesome -->
  <div>
    <simplert :useRadius="true" :useIcon="true" ref="simplert"/>
    <div>
      <div class="title" variant="success"><strong>RuedaMatic Data</strong><em> (hover for info)</em></div>
      <div class="items">
        <div v-if="this.getUserType === '2'" class="item" title="All the songs we have beats for (listed on Songs tab)">
          <div class="name">Beats files: </div>
          <div class="value">{{ beats.length }}
             (too short: {{beats.filter(r => r.numMatches < INCOMPLETE_LIM).length}})&nbsp;
            <b-button variant="warning" size="sm" class="py-0 alt" @click="showModalBeats = true" ><v-icon class="m-1" scale=1 name="drum"/>Incompletes</b-button>
          </div>
        </div>
        <div v-if="this.getUserType === '2'" class="item" title="If you have more than 1 scheme (sets of moves), you can change scheme in top green navbar dropdown.
For example: you might have a 'scheme' of moves for basic rueda, one for advanced rueda, and one for salsa suelta.">
          <div class="name">Installed Schemes: </div>
          <div class="value">{{ $store.state.movesStore.installedSchemes.length }} &nbsp;
            <b-button  variant="warning" size="sm" class="py-0 alt" @click="getSchemeData(); showModalSchemes = true" >
              <v-icon  class="m-1" scale=1 name="th-large"/>{{getUserType === '2' ? 'Edit/Delete' : 'View'}}</b-button>
            <b-button v-if="getUserType === '2'"  variant="warning" size="sm" class="py-0 alt" @click="schemeMode='create'; gFetSchemeData(); showModalSchemeEdit = true" >
              <v-icon  class="m-1" scale=1 name="plus"/>Create</b-button>
          </div>
        </div>
        <div class="item" :style="{background: 'Cornsilk'}" title="
Control how calls are loaded (use Loader in the Songs tab):
YES: Will generate moves on the fly for songs, and call them ('autofill')
NO: If song has a mic icon on the load button: load the preset sequence available for that song, play that
Hit 'Alt-X' to dump out the autofill logic">
          <div class="name">Use Autofill for ALL SONGS?</div>
          <div class="value">
            <b-form-select size="sm" ref="autoplayFlag"
              :options="[{text:'NO',value:1},{text:'YES',value:2}]"
              :state="presetOrAutofill===2"
              v-model="presetOrAutofill" />
          </div>
        </div>
        <div class="item" title="Number of Moves on the moves tab for this scheme.
Excludes the reserved move 'Continue'">
          <div class="name">Moves:</div>
          <div class="value">{{ numberOfMoves }}&nbsp;
            <span v-if="this.getUserType === '2'">
              <b-button variant="warning" size="sm" class="py-0 alt" @click="callDiagMovesWithUsage()" title="Check move usage in Combos and Sequences">
                <v-icon class="m-1" scale=1 name="notes-medical"/>Usage
              </b-button>
              <b-button size="sm" @click="showMoveIssues=true" class="py-0 alt" variant="danger" :hidden="hideMoveIssues">
                <v-icon class="m-1" scale=1 name="notes-medical"/> Issues
              </b-button>
              <b-button variant="warning" size="sm" class="py-0 alt" @click="callDiagCombos()"  title="Dump an autofill dry-run, for all combos, on all available songs">
                <v-icon class="m-1" scale=1 name="notes-medical"/>Autofill test
              </b-button>
            </span>
          </div>
        </div>
        <div class="item" title="Moves that don't have a valid MP3 file / total call files -
May need to click Refresh below if you change">
          <div class="name">Moves without a valid MP3 call:</div>
          <div class="value">{{ movesNoCall }}</div>
        </div>
        <div class="item" title="MP3 files in vueltas folder, that are not used in a Move on the Moves tab -
May need to click Accent below if changing">
          <div class="name">Unused MP3 calls:</div>
          <div class="value">{{ callsNotUsed }} / {{ numberOfCalls }}</div>
        </div>
        <div class="item" title="If you create and share,
this id will be shown when people use your work.">
          <div class="name">Author ID:</div>
          <span><span class="value">{{ authorId }} </span><span>&nbsp;<b-button variant="warning" size="sm" class="py-0 alt"
              @click="getAuthor" ><v-icon  class="m-1" scale=1 name="portrait"/>Change</b-button></span>
          </span>
        </div>
        <div class="item" title="Calls can be made during the 1, 2, 3, or 4-count">
          <div class="name">Call timing:</div>
          <span>
            <span>
              <b-form-select size="sm"
                :options="[{text:'Call during the 1 count',value:1},{text:'Call during the 2 count',value:2},{text:'Call during the 3 count',value:3},{text:'Call during the 4 count',value:4}]"
                v-model="beatToCallOn" />
            </span>
          </span>
        </div>
        <div v-if="this.getUserType === '2'" class="item" title="If you are currently adding MP3 Call files to the vueltas folder,
click here to update counts and validations shown above">
          <div class="name">On add/remove Call files:</div>
          <span><span>  <b-button variant="warning" size="sm" class="py-0 alt"
              @click="refreshForNewCallFiles" > <v-icon  class="m-1" scale=1 name="sync"/>Refresh</b-button></span>
          </span>
        </div>
        <div class="item" title="Browse the RM internal working folders">
          <div class="name">Browse RuedaMatic folders</div>
          <span><span>  <b-button variant="warning" size="sm" class="py-0 alt"
              @click="openFileExplorer" > <v-icon  class="m-1" scale=1 name="home"/> Browse</b-button></span>
          </span>
        </div>
      </div>
      <div class="title" :title="getSysInfoTooltip"><strong>System Info</strong><em> (hover for info)</em></div>
      <div class="items">
        <div class="item" title="Version you are using of this program">
          <div class="name">Ver </div>
          <div class="value">{{ ruedamaticversion }} </div>&nbsp;<div class="name">Built Fri Oct 11, 2024 - (09:16 AM)</div>
        </div>
      </div>
      <div v-if="this.getUserType === '2'" class="title" :title="getSpotifyTooltip"><strong>RM-spot</strong><em> (hover for info)</em></div>
      <div v-if="this.getUserType === '2'" class="items">
        <div class="item" title="Data used by the RM-spot website - combines rueda calls with spotify music">
          <div class="name">Prep data for RM-spot:</div>
          <b-button variant="warning" size="sm" class="py-0 alt" :disabled="bCreatingRmData"
              @click="getSpotify" ><v-icon  class="m-1" scale=1 name="portrait"/>Create</b-button>
              <pulse-loader v-if="bCreatingRmData" color="red" style="height: 27px;display: inline-block;align-items: center;justify-content: center" />
        </div>
      </div>
    </div>

    <b-modal id="getSpotify" title="Create RM-Spot data: Audiosprite for this scheme, and list of RM songs" ok-title="Dismiss" ok-only>
      <p>Web app RM-spot needs a special version of the voice calls, appending all the call files to a single "sprite" file in the rm-spot folder.  Also
        it needs a link file, listing Spotify song ID for each song that can be played with rm-spot.
      </p>
      <b-form-fieldset title="Update the RM-spot web rueda calls." >
        <b-btn variant="success" class="m-1" @click="createAudiospriteAndSonglist" :disabled="bCreatingRmData"
          title="Advanced: Generate Audiosprites for RM-Spot for all calls in the scheme, plus updated songs list">CREATE RM-SPOT data
        </b-btn>
      </b-form-fieldset>
    </b-modal>

    <b-modal id="getAuthor" title="Author id" @ok="saveAuthor" @shown="$refs.authorID.focus()">
      <p>ID is saved in files you work on.  Try to be unique!</p>
      <b-form-fieldset title="Saved in files you work on." label-cols="3" label="Author ID:">
        <b-form-input v-model="workingAuthorID" ref="authorID"/>
      </b-form-fieldset>
    </b-modal>

    <!-- showModalSchemeEdit used for Edit and Create scheme details -->
    <b-modal v-model="showModalSchemeEdit" id="editScheme" :title="schemeMode==='create'?'Create Scheme':'Edit Scheme'"
        :ok-disabled="schemeDlgName4GUI.length <= 3" @ok="handleSchemeUpdate" @shown="$refs.schemeName.focus()">
      <p>{{schemeMode==="create"?'Create new scheme. (lower case, underscores not spaces)': 'If name is changed, the change flows through related move and sequence files.  Old Name is: \'' + oldSchemeName + '\''}}</p>
      <b-form-fieldset title="Longer than 3 characters; lowercase; diacritics; and underscore accepted" label-cols="3" label="Name: ">
        <b-form-input v-model="schemeDlgName4GUI" ref="schemeName"/>
      </b-form-fieldset>
      <b-form-fieldset title="60 characters will be saved." label-cols="3" label="Description: ">
        <b-form-textarea v-model="schemeDlgDescription" ref="schemeDescription"/>
      </b-form-fieldset>
    </b-modal>

    <b-modal v-model="showModalSchemes" id="modalSchemes" title="Schemes" size="xl">
      <p>Schemes created or installed on this computer.</p>
      <b-table :items="schemeData" :fields="schemeFields">
        <template v-if="getUserType === '2'" v-slot:cell(actions)="row">
          <b-btn variant="warning" size="sm" @click="schemeMode='edit'; details(row.item)">Edit
          </b-btn>
          <b-btn variant="danger" size="sm" @click="schemeMode='delete'; showDeleteDlg(row.item)">Delete
          </b-btn>
        </template>
        <template v-else v-slot:cell(actions)="row">(Wizard only)</template>
      </b-table>
    </b-modal>

    <b-modal v-model="showModalMoveUsage" id="modalMoveUsage" title="Moves used" size="xl">
      <p>Moves used by Sequences and Combos on this computer.</p>
      <b-table :items="movesUsage" :fields="moveUsageFields" small striped>
        <template #cell(show_details)="row">
          <b-button variant="warning" size="sm" @click="row.toggleDetails" class="mr-2">
            <!-- this causes "do not mutate vuex store state" warning in development: ignore per advice -->
            {{ row.detailsShowing ? 'Hide' : 'Show'}} details
          </b-button>
        </template>
        <template #row-details="row">
          <b-card >
            <b-row style="display: inline-block" v-html="row.item.details" class="mb-2">
            </b-row>
          </b-card>
        </template>
      </b-table>
    </b-modal>

    <b-modal v-model="showMoveIssues" id="moveIssues" title="Move Issues" size="xl">
      <h6><em>Critical Move integrity issues were found.</em> <br><blockquote>These should not happen, if they do, they must be corrected.  If interface can't fix, then fix them manually with a text editor!</blockquote></h6>
      <div style="display: inline-block"
        v-html="'FIX these bad moves in a song\'s .seq file:' + $store.state.movesStore.msgUnmatchedSeqs + '<br>' +
        'FIX these bad combo moves:' + $store.state.movesStore.msgUnmatchedCombos" ></div>
      <!-- <div style="display: inline-block" v-html="'<h1> Trouble! </h1>'" ></div> -->
    </b-modal>

    <b-modal v-model="showModalBeats" id="modalBeats" title="Incomplete beats files" size="xl">
      <p v-if="beats.filter(r => r.numMatches < INCOMPLETE_LIM).length > 0" >These beats appear to be incomplete (&lt;{{INCOMPLETE_LIM}} beats in the file):</p>
      <p v-else>No incomplete beats files detected (&lt;{{INCOMPLETE_LIM}} beats in the file)</p>
      <ul>
        <li v-for="(item, index) in beats.filter(r => r.numMatches < INCOMPLETE_LIM)" :key="index">
          {{getBasename(item.file)}}
        </li>
      </ul>
    </b-modal>

  </div>
</template>

<script>
// warning: my tests find AdmZip is ok for extract, no good for compress.  It messes up non-ASCII characters.  Use archiver for packing.
import path from 'path'
import electron from 'electron'
import { exec } from 'child_process'
import DiscDataHelper from '../../store/shared/DiscDataHelper.js'
import fs from 'fs-extra'
import klawSync from 'klaw-sync' // file system walker
import replace from 'replace-in-file'
import createAudioSprite from './audiosprite-breezy'
import AutoFiller from './../Songs/AutoFiller'
import _sortBy from 'lodash/sortBy'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const RMSPOT = path.join(RMDIR, 'rm-spot').replace(/\\/g, '/') // used by AudioSprite. Some code requires the unix file separator.  Other cases, backslash still works for Windows.
const DLDIR = electron.remote.app.getPath('downloads')

// reevaluate at the point of use, so it uses right scheme as parent folder
let SEQDIR // = RMDIR + '/' + this.RMEFolder.substring + '/secuencias_para_canciones'
let VUELTASDIR // = RMDIR + '/' + this.RMEFolder.substring + '/vueltas'

if ((fs, klawSync, replace, SEQDIR, VUELTASDIR)) console.log('keep unused declarations')

const discDataHelper = new DiscDataHelper()

export default {
  data () {
    return {
      bCreatingRmData: false, // the busy wheel for prep of RM-spot audiosprite
      diagTitle: '',
      diagContent: '',
      workingAuthorID: this.$store.state.settingsStore.settings.authorId, // initial value
      // Sentinel value to flag the beats as likely incomplete, due to low number.
      //   This probably shows items that user intended to delete but forgot!
      INCOMPLETE_LIM: 40,
      // beats - computed on opening the schemes dialog
      beats: [],
      // modal schemes
      showModalSchemes: false, // model for open/close schemes modal window,
      showModalSchemeEdit: false, // edit/create scheme modal
      showModalBeats: false, // model for open/close beats modal window,
      showModalMoveUsage: false, // for showing modal tabulating Moves vs usage in Seq and Combos
      moveUsageFields: [
        { key: 'name', sortable: true },
        { key: 'countSeq', label: 'in Sequences', sortable: true },
        { key: 'countCombos', label: 'in Combos', sortable: true },
        // { key: 'comment', sortable: true },
        // {
        //   key: 'combos',
        //   sortable: true,
        //   formatter: (cbos, key, item) => {
        //     return item.combos.join('</br>')
        //   },
        //   visible: false
        // },
        { key: 'show_details' }
      ],
      schemeFields: [
        {
          key: 'name',
          sortable: true,
          // in GUI we try not to show the conventional folder name with scheme_ prefix: we trim it off
          formatter: name => {
            return name.substring(7)
          }
        },
        { key: 'author', sortable: true },
        { key: 'description', sortable: true },
        { key: 'move_count', sortable: true },
        { key: 'combo_count', sortable: true },
        { key: 'seq_count', sortable: true },
        { key: 'actions', sortable: true }
      ],
      moveFields: [
        {
          key: 'name',
          sortable: true,
          // in GUI we try not to show the conventional folder name with scheme_ prefix: we trim it off
          formatter: name => {
            return name.substring(7)
          }
        },
        { key: 'author', sortable: true },
        { key: 'description', sortable: true },
        { key: 'move_count', sortable: true },
        { key: 'combo_count', sortable: true },
        { key: 'seq_count', sortable: true },
        { key: 'actions', sortable: true }
      ],
      schemeData: [], // filled on opening the scheme dialog, by getSchemeData
      schemeDlgName4GUI: '',
      oldSchemeName: '',
      oldSchemeDescription: '',
      schemeDlgDescription: '',
      schemeMode: '', // 'edit' | 'create'
      showMoveIssues: false
    }
  },
  activated () {
    this.refreshForNewCallFiles() // called also on render
    // countBeats
    const results = replace.sync({
      files: path.join(RMDIR, 'compases_para_canciones', '*.xml'),
      from: /^\s*<beat.*>[0-9]*<\/beat>\s*$/gm,
      to: 'dryrun',
      countMatches: true,
      dry: true
    })
    this.beats = results // metadata about the beats files, used to count how many beatss are in the file for example
  },
  computed: {
    editedCombos: {
      // in the case of combos, no diff between combos seen in the GUI and the full set
      //  i.e. no need for a "visibleCombos" version
      get () {
        return this.$store.state.movesStore.editedCombos
      }
    },
    editedMoves: {
      // in the case of combos, no diff between combos seen in the GUI and the full set
      //  i.e. no need for a "visibleCombos" version
      get () {
        return this.$store.state.movesStore.editedMoves
      }
    },
    hideMoveIssues () {
      return !(!!this.$store.state.movesStore.msgUnmatchedSeqs || !!this.$store.state.movesStore.msgUnmatchedCombos)
    },
    getUserType () {
      return this.$store.state.settingsStore.settings.userType
    },
    getSysInfoTooltip () {
      const title = 'BootstrapbootstrapVue version: ' + this.bootstrapVue + '\n' +
        'Vue.js version: ' + this.vue + '\n' +
        'Electron version: ' + this.electron + '\n' +
        'Node version: ' + this.node + '\n' +
        'Platform: ' + this.platform + '\n'
      return title
    },
    getSpotifyTooltip () {
      const title = 'Web app RM-spot uses RuedaMatic data.\n' +
        'Use these buttons to update Audiosprite files, containing the audio for the calls.\n' +
        'The output is a large mp3, located in "rm-spot" folder, one for each scheme.\n' +
        'Also: creates "rm-spot-songs.json" in rm-spot, used by web app to identify songs that have beats files.\n'
      return title
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    GUIfyCurrentScheme () {
      return this.RMEFolder.substring(7)
    },
    presetOrAutofill: {
      get: function () { return this.$store.state.settingsStore.settings.presetOrAutofill },
      set: function (value) {
        this.$store.commit('PRESET_OR_AUTOFILL', value)
        this.currentFile = null
        this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: '' }) // this just clears the store for filename and all depenedent values
        this.$store.commit('INIT_BEATS', []) // this just clears the store
        this.$store.commit('LOAD_SEQ', []) // ensure we don't keep a previous file sequence if none for current song
      }
    },
    beatToCallOn: {
      get: function () { return this.$store.state.settingsStore.settings.beatToCallOn },
      set: function (value) {
        this.$store.commit('BEAT_TO_CALL_ON', value)
      }
    },
    authorId () {
      return this.$store.state.settingsStore.settings.authorId
    },
    ruedamaticversion () {
      return this.$store.state.settingsStore.version
    },
    electron () {
      return process.versions.electron
    },
    node () {
      return process.versions.node
    },
    platform () {
      return require('os').platform()
    },
    bootstrapVue () {
      return require('bootstrap-vue/package.json').version
    },
    vue () {
      return require('vue/package.json').version
    },
    callsNotUsed () {
      try {
        return this.$store.getters.getCallsNotUsedDisplay
      } catch (e) {
        return 'no scheme'
      }
    },
    movesNoCall () {
      return this.$store.getters.getMovesNoCallDisplay
    },
    movesUsage () {
      return this.$store.state.movesStore.movesWithUsage
    },
    numberOfMoves () {
      try {
        const mvsNoContinue = this.$store.state.movesStore.originalMoves.filter(item => item.$.name !== 'Continue')
        return mvsNoContinue.length
      } catch (e) {
        return 'no scheme'
      }
    },
    numberOfCalls () {
      try {
        return this.$store.state.movesStore.originalCalls.length
      } catch (e) {
        return 'no scheme'
      }
    }
  },
  watch: {
    beatToCallOn (newValue) {
      this.$store.commit('BEAT_TO_CALL_ON', this.beatToCallOn)
    }
  },
  methods: {
    callDiagCombos () {
      this.$bvToast.toast('Testing an autofill dry-run, using all combos against all songs, please wait... ', { title: 'Testing...', autoHideDelay: '1000' })
      // needed to allow the toast to appear
      setTimeout(() => {
        this.callDiagCombosImpl()
      }, 100)
      // this.$nextTick(() => this.callDiagCombosDelayed())
    },
    callDiagCombosImpl () {
      const getFormattedTime = () => {
        // from SO make a date string for use in a filename
        var today = new Date()
        var y = today.getFullYear()
        // JavaScript months are 0-based.
        var m = ('0' + (today.getMonth() + 1)).slice(-2)
        var d = ('0' + (today.getDate())).slice(-2)
        var h = ('0' + (today.getHours())).slice(-2)
        var mi = ('0' + (today.getMinutes())).slice(-2)
        var s = ('0' + (today.getSeconds())).slice(-2)
        return y + m + d + '-' + h + mi + s
      }

      // eslint-disable-next-line no-unused-vars
      const fitTestFname = 'RM-DASHBOARD-COMBOS-FIT-TEST'
      const usageTestFname = 'RM-DASHBOARD-CBO-USAGE-TEST'
      const timeStart = new Date()
      this.comboTestsByPerm = {}
      this.comboTestsBySong = {}
      const that = this
      const songList = replace.sync({
        files: path.join(RMDIR, 'compases_para_canciones', '*.xml'),
        from: /<musicfile.*">([^<]*)<\/musicfile>\s+.*authorAndSongURL.*>(http[^<]*)?(.+)?<\/authorAndSongURL>/gi,
        // to: (...args) => lookin(args), // here the beatsFiles array is populated
        to: 'dummy',
        dry: true // dry-run, no real replace happens!
      })

      let audit = []
      for (let i = 0; i < songList.length; i++) {
        const xmlFilePath = songList[i].file
        // eslint-disable-next-line no-unused-vars
        const xmlFile = path.basename(xmlFilePath)
        that.comboTestsBySong[xmlFile] = {}
        let xmlData
        try {
          xmlData = discDataHelper.getXMLData(xmlFilePath, { type: 'beats' }) || []
        } catch (e) {
          this.$bvToast.toast(e.message, { title: 'Error!' })
          console.error('ERROR: Failed to get measures data for music file: ' + '\n' + e.stack)
        }

        const beats = xmlData.beats
        const currentBeatIndex = 2 // give the dancers a few seconds, like IRL
        const minBaseName = xmlFile.substring(0, xmlFile.lastIndexOf('.xml'))
        that.autoFiller = new AutoFiller([], this.editedMoves, this.editedCombos, beats, currentBeatIndex, minBaseName)
        // eslint-disable-next-line no-unused-vars
        audit.push('sn~ ' + xmlFile) // 72,20:   /* eslint-enable no-undef */
        ;[, audit] = that.autoFiller.autoFill(audit)
      }
      // eslint-disable-next-line no-undef
      const comboData = JSON.stringify(audit, null, 2)
      const comboJSON = path.join(DLDIR, '/' + fitTestFname + '-' + getFormattedTime() + '.json')
      fs.writeFileSync(comboJSON, comboData, err => {
        if (err) {
          throw err
        }
      })
      const noFitList = []
      let ctrNoFits = 0
      const compileNoFits = (args) => {
        ctrNoFits += 1
        if (noFitList.length < 10) {
          noFitList.push(args[0])
        } else if ((noFitList.length < 11)) {
          noFitList.push('... 10 listed')
        }
      }
      const results = replace.sync({
        files: comboJSON,
        from: /(xx~.*)"/gi,
        to: (...args) => compileNoFits(args),
        dry: true // dry-run, no real replace happens!
      })
      if (noFitList.length > 0) {
        noFitList.push('total ' + ctrNoFits)
        console.log(results)
        const obj = {
          title: 'NO FIT SECTIONS - left empty',
          message: noFitList.join('<br>'), // string -- message alert
          type: 'warning', // string -- type : info (default), success, warning, error
          customCloseBtnText: 'OK' // string -- close button text
          // onClose: () => { this.deleteItem(this.currentItem) }, // function -- when close triggered
          // useConfirmBtn: true, // boolean -- using confirm button
          // customConfirmBtnText: 'Cancel' // string -- confirm button text
          // showXclose: false //boolean -- show x close button
        }
        this.$refs.simplert.openSimplert(obj)

        // this.$bvModal.msgBoxOk('MISS FITS:' + noFitList, { title: 'Finished', size: 'xl' })
      }

      console.log('JSON Combo fill test is saved.')
      // sn~ new song being tested
      // ms~ clave switch move found, song will be partitioned into sections for autofill
      // cn~ new combo being tested
      // cx~ combo with NO FITS
      // xx~ NO COMBOS have any fit moves for the song
      // p-~ perm rej by rule check (see details)
      // pa~ perm accepted
      // p+~ ok for now, keep checking
      // pu~ which of the pa~ perms was selected randomly for use in the test instance

      let workingCbo
      const dictCboResult = {}
      function tabulate (action, data, file) {
        if (action === 'cn~') { // new combo
          // current combo was accepted?  if there was one...
          if (workingCbo) dictCboResult[workingCbo].accepted += 1
          workingCbo = data
          if (!dictCboResult[workingCbo]) dictCboResult[workingCbo] = { accepted: 0, rejected: 0 }
        } else if (action === 'cx~') { // combo failed, all perms rejected
          // current combo was rejected?
          if (workingCbo !== data) throw new Error('CBO reject is not set up!')
          dictCboResult[workingCbo].rejected += 1
          workingCbo = null // signal that our working Cbo is chalked up and finished
        }
      }
      // from: /^ {2}"(sn~|cn~|cx~) (.*)\[.*]",$/g,
      replace.sync({ // don't need results
        files: comboJSON,
        from: /^ {2}"(sn~|cn~|cx~) (.*) (\[.*\])",$/gmi,
        to: (...args) => tabulate(args[1], args[2], args[5]),
        dry: true
      })

      const usageData = JSON.stringify(dictCboResult, null, 2)
      fs.writeFile(path.join(DLDIR, '/' + usageTestFname + '-' + getFormattedTime() + '.json'), usageData, err => {
        if (err) {
          throw err
        }
        console.log('JSON Combo usage data is saved.')
      })
      this.$bvModal.msgBoxOk('Done: results are in your Download folder (ms: ' + (new Date() - timeStart) + ')', { title: 'Finished' })
    },
    callDiagMovesWithUsage () {
      try {
        this.$store.dispatch('diagMovesWithUsage')
        this.showModalMoveUsage = true
      } catch (e) {
        this.$bvToast.toast(e.message, { title: 'Error' })
      }
    },
    createAudiospriteAndSonglist () {
      // eslint-disable-next-line no-unused-vars
      const dictSongIds = {}
      const dictSeqTags = {}
      const dictShortBeatsWarning = {}
      const dictPastablePlaylists = {}

      const that = this // Vue can lose the this pointer
      this.bCreatingRmData = true // show busy

      // 1. get the tags from the SEQUENCE files, store in dict by song NAME
      replace.sync({
        files: path.join(RMDIR, '*', 'secuencias_para_canciones', '*.seq'),
        from: /^.*<author.*tags="(.*)".*<\/author>$/gm,
        to: (...args) => {
          try {
            const pathBits = args[4].split('/')
            const scheme = pathBits[5]
            const file = pathBits[7].replace('.seq', '')
            if (!Object.keys(dictSeqTags).includes(file)) dictSeqTags[file] = {}
            dictSeqTags[file][scheme] = args[1] || '_noTags'
          } catch (err) {
            console.log('RIF ERROR: ' + err.message)
          }
        },
        countMatches: true,
        dry: true
      })

      // 2. get the song ID and song name from the BEATS files
      replace.sync({
        files: path.join(RMDIR, 'compases_para_canciones', '**', '*.xml'),
        from: /^.*<musicfile.*bpm="(\d*)">(.*).m..<\/musicfile>\n.*spotifySongId="([a-zA-Z0-9]{22})".*\n.*<beats>((\n|.)*?)<\/beats>.*$/gm,
        to: (...args) => {
          const bpm = args[1] || 0
          const currentSong = args[2] || ''
          const spotId = args[3]
          if (dictSongIds[spotId]) that.$bvModal.msgBoxOk('WARNING: Duplicate Spotify songID: ' + spotId, { title: 'Duplicate Spotify ID error' })
          dictSongIds[spotId] = { file: currentSong, bpm: bpm, schemeTags: {} } // fill the tags next!
          // eslint-disable-next-line no-unused-vars
          const currentSongBeats = (args[4].match(/beat/g) || []).length
          if (currentSongBeats < 30) {
            dictShortBeatsWarning[currentSong] = currentSongBeats
          }
        },
        countMatches: true,
        dry: true
      })

      // 3. combine 2 with a lookup from 1, so we have dict KEY = Spotify ID, VALUE: {songName: xxx, schemes { scheme1: tags, scheme2: tags, .... }}
      for (const [spotId, value] of Object.entries(dictSongIds)) {
        if (Object.keys(dictSeqTags).includes(value.file)) {
          dictSongIds[spotId].schemeTags = dictSeqTags[value.file]
          if (value.schemeTags) {
            for (const [scheme, tags] of Object.entries(value.schemeTags)) {
              if (!dictPastablePlaylists[scheme]) dictPastablePlaylists[scheme] = []
              dictPastablePlaylists[scheme].push({ spotId: spotId, name: value.file, tags: tags, bpm: value.bpm })
            }
          }
        }
      }

      if (Object.entries(dictShortBeatsWarning).length) {
        this.$bvModal.msgBoxOk('WARNING: some beats files are very short: \n' + JSON.stringify(dictShortBeatsWarning, null, 2), { title: 'Issue found generating rm-spot-songs.json' })
      }
      fs.ensureDirSync(RMSPOT)
      const spotFile = path.join(RMSPOT, 'rm-spot-songs.json')
      // a list of IDs each prefixed "spotify:track:" can be pasted in the UI into a playlist
      fs.writeFileSync(spotFile, JSON.stringify(dictSongIds, null, 2), 'utf8')
      this.$bvToast.toast('Done, used in RM BUILD: rm-spot-songs.json', { title: 'RM system file, scheme: ALL' })

      const pasteListPrep = _sortBy(Object.entries(dictSongIds), presetSong => parseInt(presetSong[1].bpm))
      const pasteList = pasteListPrep.map(k => 'spotify:track:' + k[0]).join('\n')
      const pasteFile = path.join(RMSPOT, 'pastable-autofill-playlist-allsongs.txt')
      fs.writeFileSync(pasteFile, pasteList, 'utf8')
      this.$bvToast.toast('Done, paste into Spotify playlist: pastable-autofill-playlist-allsongs.txt', { title: 'New Spotify playlist, scheme: ALL' })

      // the Spotify ordered pastable list of songs and tags for each scheme
      for (const scheme of Object.keys(dictPastablePlaylists)) {
        const presetListPrep = _sortBy(dictPastablePlaylists[scheme], ['tags', 'bpm']) // slower songs first
        const presetList = presetListPrep.map(p => 'spotify:track:' + p.spotId).join('\n')
        const spotFile = path.join(RMSPOT, 'pastable-presets-playlist-' + scheme + '.txt')
        fs.writeFileSync(spotFile, presetList, 'utf8')
        this.$bvToast.toast('Done, paste into Spotify playlist: pastable-presets-playlist-' + scheme + '.txt', { title: 'New Spotify playlist, scheme' + scheme })
      }

      // now the AUDIOSPRITE
      const scheme = this.RMEFolder
      fs.ensureDir(path.join(RMSPOT, scheme))
      console.log(`making audiosprite for scheme: ${scheme}`)
      const callsGlob = [RMDIR.replace(/\\/g, '/') + '/' + scheme + '/vueltas/*.mp3'] // AudrioSprite requires unix path separator
      // const options = { output: 'result', export: 'mp3', format: 'howler2', silence: 1, store: true, rawparts: 'mp3', path: 'C:/Users/user/Documents/RuedaMaticEditor/scheme_rueda_normal_basica/vueltas' }
      const options = {
        output: RMSPOT + '/' + scheme + '/' + scheme,
        export: 'mp3',
        format: 'howler2',
        silence: 1,
        store: true
      }

      this.$bvToast.toast('Scheme audiosprite for Spotify will be processed... Please Wait!', { title: scheme })
      createAudioSprite(callsGlob, options)
        .then((result) => {
          // doneSchemes += 1
          this.$bvToast.toast(`Done, used in RM build: audiosprite MP3 file: ${scheme}.json`, { title: 'Audiosprite MP3' })
          console.log(result)
          console.log(`Writing audiosprite json file: ${scheme}.json`)
          fs.writeFileSync(RMSPOT + '/' + scheme + '/' + scheme + '.json', JSON.stringify(result.sprite))
          this.$bvToast.toast(`Done, used in RM build: audiosprite json index file: ${scheme}.json`, { title: 'Audiosprite index' })
          this.bCreatingRmData = false
        })
        .catch((err) => {
          console.log(err)
          this.bCreatingRmData = false
        })
      // }
      // this.$bvModal.show('diagModal')
      // })
      // fs.ensureDir(RMSPOT)
      // // note: aws-pkg-deploy is a program that also creates these audiosprite files.  That program writes all found schemes in the rm-spotify Development tree, rm-assets folder.
      // // This program writes identical files but puts them in it's own folder as a transfer directory.  And it only writes the currently loaded scheme.
      // // this module expects forward slash on Windows
    },
    showDeleteDlg (scheme) {
      this.$bvModal.msgBoxConfirm(`Delete (to recycle bin) scheme "${scheme.name.substring(7)}" - are you sure?`)
        .then(value => {
          this.recycleScheme(path.join(RMDIR, scheme.name))
        })
        .catch(err => {
          console.log(`Recycling scheme: ${scheme}, ERROR: ${err.message}`)
        })
    },
    recycleScheme (schemePath) {
      electron.ipcRenderer.on('asynch-scheme-delete-result', (event, data) => {
        this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        this.showModalSchemes = false
        console.log('ipcRenderer got event with: ' + data)
        this.$bvModal.msgBoxOk('Scheme has been sent to the Recycle bin.')
      })
      console.log('ipcRenderer requesting recycling of scheme')
      electron.ipcRenderer.send('asynch-scheme-delete-request', schemePath)
    },
    handleSchemeUpdate () {
      let RIFtarget, RIFpayload, RIFschemeOptions, RIFresults // for replace-in-file boilerplate
      const dateTimeISO = new Date().toISOString()
      // enforce convention of underscore replaces space char
      const dirSch = 'scheme_' + this.schemeDlgName4GUI.replace(/ /g, '_')
      const pathSch = path.join(RMDIR, dirSch)
      // use normalize to remove any diacritic for simpler regex test
      //  then if passes, allow the original text with diacritics
      const normName = this.schemeDlgName4GUI.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const aryMatch = normName.match(/^[a-z_ ]+$/g)
      if (!Array.isArray(aryMatch)) { // no match if no array
        this.$bvModal.msgBoxOk('Require lower case letters, > 3 chars.', { title: 'Invalid scheme name' })
        return
      }
      this.schemeDlgDescription = this.schemeDlgDescription.trim()
      if (this.schemeDlgDescription.length > 100) {
        this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Max 100 chars in description' })
        return
      }
      if (this.schemeMode === 'create') {
        console.log('create scheme')
        try {
          if (fs.pathExistsSync(pathSch)) {
            this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Folder exists already' })
            return
          }
          fs.copySync(path.join(__static, '/scheme_rueda_template'), pathSch) // copy the static folders and files, the basics of a scheme
          // rename the scheme file
          fs.moveSync(path.join(pathSch, 'scheme_rueda_template.scheme'), path.join(pathSch, dirSch + '.scheme'))
          // update the description
          // RIF = replace-in-file package
          RIFtarget = new RegExp('"description":.*,') // $ regex symbol does not match CRLF
          RIFpayload = '"description": "' + this.schemeDlgDescription.trim() + '",'
          RIFschemeOptions = {
            files: path.join(pathSch, dirSch + '.scheme'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          //     console.log(RIFresults.filter(item => item.hasChanged).map(item => path.basename(item.file)))
          // update the provider (author)
          RIFtarget = new RegExp('"provider":.*,') // $ regex symbol does not match CRLF
          RIFpayload = '"provider": "' + this.authorId + '",'
          RIFschemeOptions = {
            files: path.join(pathSch, dirSch + '.scheme'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          console.log(RIFresults.filter(item => item.hasChanged).map(item => path.basename(item.file)))
          // in vueltas/moves.xml, replace attributes in:
          // 1:  <author date="2022-09-09T15:12:46.616Z" authorId="rc">Ruedamatic Editor</author>
          RIFtarget = new RegExp('<author.*</author>') // $ regex symbol does not match CRLF
          RIFpayload = `<author date="${dateTimeISO}" authorId="${this.authorId}">Ruedamatic Editor</author>`
          RIFschemeOptions = {
            files: path.join(pathSch, 'vueltas', 'moves.xml'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          // 2:  <scheme schemeName="scheme_rueda_template" schemeProvider="rc" schemeDate="2022-09-09T15:12:46.616Z">
          RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
          RIFpayload = `<scheme schemeName="${dirSch}" schemeProvider="${this.authorId}" schemeDate="${dateTimeISO}">Ruedamatic Editor</scheme>`
          RIFschemeOptions = {
            files: path.join(pathSch, 'vueltas', 'moves.xml'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          // update the data store
          this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        } catch (err) { // unexpected error
          this.$bvModal.msgBoxOk(err.message, { title: err.name })
        }
      } else if (this.schemeMode === 'edit') {
        console.log('edit scheme')
        // NAME: did the name change? => 1:rename folder 2:fix moves.xml 3:fix *.seq
        try {
          if (this.oldSchemeName !== this.schemeDlgName4GUI) {
            if (fs.pathExistsSync(pathSch)) {
              this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Folder exists already' })
              return
            }
            // rename the folder
            fs.moveSync(path.join(RMDIR, 'scheme_' + this.oldSchemeName), pathSch)
            // rename the scheme file in it's new folder.  NOTE: contents of scheme file fixed below!
            fs.moveSync(path.join(pathSch, 'scheme_' + this.oldSchemeName + '.scheme'), path.join(pathSch, dirSch + '.scheme'))
            // moves.xml, contains a ref to scheme
            // RIF = replace-in-file package
            RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
            RIFpayload = `<scheme schemeName="${dirSch}" schemeProvider="${this.authorId}" schemeDate="${dateTimeISO}">Ruedamatic Editor</scheme>`
            RIFschemeOptions = {
              files: path.join(pathSch, 'vueltas', 'moves.xml'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
            // each .seq contains a ref to the scheme that it belongs to
            RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
            RIFpayload = `<scheme provider="${this.authorId}" date="${dateTimeISO}">${dirSch}</scheme>`
            RIFschemeOptions = {
              files: path.join(pathSch, 'secuencias_para_canciones', '*.seq'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          // NAME: did the name change OR description change?  => CONTENTS of the .scheme file
          if (this.oldSchemeName !== this.schemeDlgName4GUI || this.oldSchemeDescription !== this.schemeDlgDescription) {
            // provider update since we are touching the file
            RIFtarget = new RegExp('"provider":.*,') // $ regex symbol does not match CRLF
            RIFpayload = '"provider": "' + this.authorId + '",'
            RIFschemeOptions = {
              files: path.join(pathSch, dirSch + '.scheme'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          if (this.oldSchemeDescription !== this.schemeDlgDescription) {
            // scheme file, scheme description update
            RIFtarget = new RegExp('"description":.*,') // $ regex symbol does not match CRLF
            RIFpayload = '"description": "' + this.schemeDlgDescription.trim() + '",'
            RIFschemeOptions = {
              files: path.join(pathSch, dirSch + '.scheme'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        } catch (err) {
          this.$bvModal.msgBoxOk('Error: "' + err.message + '".  OPERATION FAILED, results may be inconsistent!  Have RuedaMatic doc folders been altered manually?')
        }
      }
      this.schemeDlgName4GUI = ''
      this.schemeDlgDescription = ''
      this.showModalSchemes = false
    },
    details (item) {
      this.showModalSchemeEdit = true
      this.oldSchemeName = item.name.substring(7)
      this.schemeDlgName4GUI = this.oldSchemeName
      this.oldSchemeDescription = item.description
      this.schemeDlgDescription = this.oldSchemeDescription
    },
    getSchemeData () {
      // outside the loop: collect all moves and sequences
      // inside the loop: read the .scheme [description], filter/count the moves/seq by scheme

      // count all the moves, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resMoves = replace.sync({
        files: path.join(RMDIR, '**', 'moves.xml'),
        from: /<move.*>\n.*\n.*<\/move>\n/g,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      // count all the combos, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resCombos = replace.sync({
        files: path.join(RMDIR, '**', 'moves.xml'),
        from: /.*<combo .*>\n(?:.+\n)*?.*<\/combo>.*/g,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      // count all the sequences, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resSeq = replace.sync({
        files: path.join(RMDIR, '**', '*.seq'),
        from: /<move *name=".{3,}"\/>/gm,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      const retData = {} // return object
      // schemeFields: ['name', 'author', 'description', 'move_count', 'combo_count', 'seq_count'],
      resMoves.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          retData[scheme] = { name: scheme }
          retData[scheme].move_count = item.numMatches
          const test = path.join(RMDIR, scheme, scheme + '.scheme')
          // eslint-disable-next-line no-unused-vars
          try {
            const obj = JSON.parse(fs.readFileSync(test, 'utf8'))
            retData[scheme].author = obj.providedBy.provider
            retData[scheme].description = obj.description
            // good place to ensure that seq_count is defined for the scheme: even if there are no sequences,
            // bec there should always be a moves.xml
            retData[scheme].seq_count = 0
          } catch (err) {
            retData[scheme].description = '** Corrupt scheme: missing or incorrect .scheme file! **'
            console.log('Corrupt scheme :' + scheme + ', missing or incorrect .scheme file!')
          }
        }
      })
      resCombos.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          if (retData[scheme]) {
            retData[scheme].combo_count = item.numMatches
          } else {
            console.log('Error - no scheme for combo_count: ' + scheme)
          }
        }
      })
      resSeq.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          if (retData[scheme]) {
            if (retData[scheme].seq_count) retData[scheme].seq_count += 1
            else retData[scheme].seq_count = 1
          } else {
            console.log('Error - no scheme for seq_count: ' + scheme)
          }
        }
      })
      this.schemeData = Object.values(retData)
    },
    getBasename (myPath) {
      return path.basename(myPath)
    },
    openFileExplorer () {
      const itemFilePath = path.join(RMDIR, 'compases_para_canciones')
      if (!discDataHelper.fileExists(itemFilePath)) {
        this.$bvModal.msgBoxOk('NO RuedaMatic beats folder... maybe you should reinstall!')
        return
      }
      let command = ''
      let fpath
      switch (process.platform) {
        case 'darwin': // someday?
          command = 'open -R ' + itemFilePath
          break
        case 'win32':
          if (process.env.SystemRoot) {
            command = path.join(process.env.SystemRoot, 'explorer.exe')
          } else {
            command = 'explorer.exe'
          }
          command += ' /select,"' + itemFilePath + '"'
          break
        default: // ok it was written for linux, some day useful ;-)
          fpath = path.dirname(itemFilePath)
          command = 'xdg-open ' + fpath
      }
      console.log(command)
      exec(command, function (stdout) {
        // Do something if you really need to
      })
    },
    refreshForNewCallFiles () {
      this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
    },
    getAuthor (event) {
      this.$bvModal.show('getAuthor')
    },
    getSpotify (event) {
      this.$bvModal.show('getSpotify')
    },
    saveAuthor () {
      console.log('saveAuthor')
      this.$store.commit('CHANGE_AUTHORID', this.workingAuthorID)
    }
  }
}
</script>

<style scoped>
    .title {
        color: #038309;
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
      /* .fa-icon {
          background-color: white;
          padding: 1.5px;
      } */

</style>
