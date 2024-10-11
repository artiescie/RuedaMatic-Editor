<template>
   <!-- style="width: 100vw; height: 90vh; -->
   <div>
     <simplert :useRadius="true" :useIcon="true" ref="simplert" />
     <!-- style="width: 95vw; height: 60vh" -->
     <div>
       <b-container fluid>
         <b-row style="height:45px;margin:0px 0px 20px 00px;">
           <b-col cols="2">
             <b-button ref="btnPlayback" :disabled="!waveIsLoaded" variant="success" class="m-1" @click="playSong"
               title="Play the song from current cursor">
               Play
             </b-button>
             <b-button ref="btnPlayStop" :disabled="!waveIsLoaded" variant="success" class="m-1" @click="stopPlay"
               title="Stop and rewind to start">
               Stop
             </b-button>
           </b-col>
           <b-col cols="2" title="Mute the move calls">
             <b-form-checkbox v-model="callsOff">Calls off</b-form-checkbox>
           </b-col>
           <b-col cols="1" title="Adjust music volume" class="mr-0 pr-0 ml-2">
             <p>Music:</p>
           </b-col>
           <b-col cols="1" class="ml-0 pl-0 mr-3">
             <b-form-input :title="'Music volume: ' + musicVolLocal * 10" size="sm" v-model="musicVolLocal"
               type="range" :state="musicVolLocal > 0.0"
               min="0" max="1" step="0.1"></b-form-input>
           </b-col>
           <b-col cols="1" class="ml-4 pl-3 ml-2" title="Scroll the pane while music is playing (as needed)">
             <b-form-checkbox v-model="scrollMe">Scroll</b-form-checkbox>
           </b-col>
           <b-col cols="3" class="ml-0 pl-3 ml-2">
             <div style="display: inline-block; position:absolute; left:5px; bottom:-30px;">
               <h4> {{loaderOrWorkbenchCaption}}</h4>
             </div>
             <b-button align-v="center" style="display: inline-block; position:absolute; bottom: -22px; right: -40px"
               variant="secondary" @click="showMusicLoader = !showMusicLoader"
               title="Load a song, then add beats, gears or calls on the Workbench">
               <v-icon class="m-1" name="angle-left" />{{loaderOrWorkbenchToggler}}
               <v-icon class="m-1" name="angle-right" />
             </b-button>
           </b-col>
         </b-row>
       </b-container>
     </div>
     <div v-show="showMusicLoader" ref="getMusic">
       <get-music :showMusicLoader=showMusicLoader @start-song="startSongHandler" @choose-file="chooseFile"
         @persist-revised-beats="persistRevisedBeats">
       </get-music>
     </div>
     <div v-show="!showMusicLoader" ref="songDetails">
       <div id="waveform" v-bind:style="{ height: '64px', background: wsbgColor }"
         title="Amplitude wave form of the song">
         <pulse-loader v-if="bLoading" :color="nColor"
           style="height: 64px;display: flex;align-items: center;justify-content: center" />
       </div>
       <div title="Advanced functions (making movies, emailing move sequences)">
         <b-button v-if="this.userType === '2'" variant="warning" :disabled="!waveIsLoaded" class="m-2" @click="bShowFancy=true">
           Adv
         </b-button>
         File: {{ MP3FileNameBaseName }}, <em> len: {{ timeTotalCached }} bpm: {{MP3FileNameBPM}}</em>
       </div>
       <b-card no-body
         :style="{ height: (cardHeight - ( this.$store.state.settingsStore.settings.userType === '2' ? 55 : 100)) + 'px' }">
         <!-- playsong event can come up by using the countdown timer on subcomponent -->
         <songs-measures ref="songsMeasures" :card-height=cardHeight :wave-surfer=WAVESURFER :wave-is-loaded=waveIsLoaded
           :state-recording-beats=stateRecordingBeats :awaiting-beats-save=awaitingBeatsSave :scroll-me=scrollMe
           :tell-music-changed=tellMusicChanged :bAlreadyWarnedFlag=bAlreadyWarnedFlag :showMusicLoader=showMusicLoader
           :autofill-audit-songs=autofillAuditSongs
           @add-seq-move="addSeqMove" @playSong="playSong" @changeMode="changeMode"
           @meanCalculated="meanCalculatedByMeasures" @already-warned-flag="bAlreadyWarnedFlag = true">
         </songs-measures>
       </b-card>
     </div>
     <b-modal id="modalFancyStuff" title="Fancy stuff for advanced users" v-model="bShowFancy" ok-title="Close" ok-only>
       <div>
         <b-button variant="warning" :disabled="!waveIsLoaded" class="m-2" @click="persistSSA" title="Generate an SSA Subtitle file, and show it in Explorer.
You can add move captions to your dance videos, accurately timed for syncing.">
           .ssa
         </b-button>
         Generate SSA Subtitles
       </div>
       <div>
         <b-button variant="warning" :disabled="!waveIsLoaded" class="m-2" @click="openFileExplorer('.seq')"
            title="File location of sequence file (to email, etc)">
           .seq
         </b-button>
          Open location of Sequence file (for email etc)
       </div>
     </b-modal>
     <b-modal id="modalBadFile" :title="badFileModalTitle" ok-only>
       <h6 v-html="badFileModalHTML">
       </h6>
     </b-modal>
     <b-modal id="modalBadFile_Admin_FixSEQ" :title="badFileModalTitle" ok-title="FIX" cancel-title="Ignore"
       ok-variant="danger" @ok="fixMd5InFile('SEQ')">
       <h6 v-html="badFileModalHTML + '<br><hr><h2>Wizard Special Power</h2>Click &quot;FIX&quot; to ADD new md5 to SEQ file, or &quot;Ignore&quot; to leave as is.<br><br>' +
           'IF YOU GOOF and PASS AN INVALID FILE: Careful!  If the music file is wrong and doesn\'t sync with the beats file, you should clean up.<br>' +
           '<ul><li> edit the SEQ or XML file manually, and remove the invalid md5 you added there. <br>' +
           '<li> If you\'re not sure, remove all the md5s in the SEQ or XML file manually<br>' +
           '<li> and then, add back ONLY the valid music file!</ul><br>'">
       </h6>
     </b-modal>
     <b-modal id="modalBadFile_Admin_FixXML" :title="badFileModalTitle" ok-title="FIX" cancel-title="Ignore"
       ok-variant="danger" @ok="fixMd5InFile('XML')">
       <h6 v-html="badFileModalHTML + '<br><hr><h2>Wizard Special Power</h2>Click &quot;FIX&quot; to ADD new md5 to XML file, or &quot;Ignore&quot; to leave as is.<br><br>' +
           'IF YOU FIX: Load the same music again, and code will make sure the SEQ file is correct too!<br><br>' +
           'IF YOU GOOF and PASS AN INVALID FILE: Careful!  If the music file is wrong and doesn\'t sync with the beats file, you should clean up.<br>' +
           '<ul><li> edit the SEQ or XML file manually, and remove the invalid md5 you added there. <br>' +
           '<li> If you\'re not sure, remove all the md5s in the SEQ or XML file manually<br>' +
           '<li> and then, add back ONLY the valid music file!</ul><br>'">
       </h6>
     </b-modal>
   </div>
</template>

<script>
// region - doesn't work yet in vetur Apr 2018
import songsMeasures from './Songs/Measures.vue'
import getMusic from './Songs/GetMusic'
import WaveSurfer from 'wavesurfer.js'
import fs from 'fs'
import electron from 'electron'
import DiscDataHelper from '../store/shared/DiscDataHelper.js'

import _cloneDeep from 'lodash/cloneDeep'
// eslint-disable-next-line no-unused-vars
import { Howl, Howler } from 'howler'
import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import { exec } from 'child_process'
import path from 'path'
import AutoFiller from './Songs/AutoFiller'

const HOMEDIR = electron.remote.app.getPath('home')
const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'

const MUSICFOLDER = path.join(HOMEDIR, 'Music')
let BEATSFOLDER = '' // set in mounted
let CALLFOLDER = '' // set in mounted
let WAVESURFER
// endregion

export default {
  data () {
    return {
      autofillAuditSongs: ['Dummy audit entry'], // passed prop to Measures, and it can be dumped from there with Alt-X
      bShowFancy: false,
      showMusicLoader: true,
      bAlreadyWarnedFlag: false,
      callsOff: false,
      tellMusicChanged: '',
      scrollMe: false, // should the times boxes autoscroll while playing?
      // showingBuyDialog: false, // so Measures subcomponent doesn't preventDefault
      mode: null, // based on event from subcomp
      measuresComponentKey: 0,
      windowHeight: 0,
      cardHeight: 0,
      bLoading: false,
      nColor: 'red',
      WAVESURFER: undefined, // so we have it as attribute of Vue instance
      wsbgColor: 'background-color: antiquewhite', // wavesurfer background, color change on each beat with playback
      waveIsLoaded: false,
      timeTotal: 'not loaded',
      currentFile: 'no file',
      discDataHelper: new DiscDataHelper(),
      stateRecordingBeats: false,
      awaitingBeatsSave: false, // between 'space' as "beats recording" and as "play stop-start", ignore space bar
      dictCurrMoves: {},
      timeoutsRunning: [], // for clearTimeout
      badFileModalHTML: '',
      badFileModalTitle: '',
      musicVolLocal: 0.8,
      meanGapImproved: 0 // emitted by Measure subcomponent

    }
  },
  computed: {
    musicVol () {
      return this.$store.state.settingsStore.settings.musicVol
    },
    beatToCallOn () {
      return this.$store.state.settingsStore.settings.beatToCallOn
    },
    loaderOrWorkbenchToggler () {
      return this.showMusicLoader ? 'to Workbench' : 'to Loader'
    },
    loaderOrWorkbenchCaption  () {
      return this.showMusicLoader ? 'Loader' : 'Workbench'
    },
    bReloadCurrentSeq () {
      return this.$store.state.beatsAndSequenceStore.bReloadCurrentSeq
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    userType () {
      return this.$store.state.settingsStore.settings.userType
    },
    lstSeq () {
      return this.$store.state.beatsAndSequenceStore.editedSeq
    },
    timeTotalCached () {
      // FIXME: why is this needed?
      return this.timeTotal
    },
    MP3FileName () {
      return this.$store.state.beatsAndSequenceStore.MP3FileName
    },
    MP3FileNameBaseName () {
      const ary = this.MP3FileName.split('\\')
      return ary[ary.length - 1]
    },
    spotifySongId () {
      return this.$store.state.beatsAndSequenceStore.spotifySongId
    },
    MP3FileNameBPM () {
      return this.$store.state.beatsAndSequenceStore.MP3FileNameBPM
    },
    MP3FileNameMd5GivenXML () {
      return this.$store.state.beatsAndSequenceStore.MP3FileNameMd5GivenXML
    },
    MP3FileNameMd5GivenSEQ () {
      return this.$store.state.beatsAndSequenceStore.MP3FileNameMd5GivenSEQ
    },
    MP3FileNameMd5Actual () {
      return this.$store.state.beatsAndSequenceStore.MP3FileNameMd5Actual
    },
    MP3URL () {
      return this.$store.state.beatsAndSequenceStore.MP3URL
    },
    lstTimesWork () { // this is the working copy of the beats
      return this.$store.state.beatsAndSequenceStore.lstTimesWork
    }
  },
  watch: {
    musicVolLocal (newVolume, oldVolume) {
      if (newVolume !== oldVolume) {
        this.$store.commit('CHANGE_MUSICVOL', newVolume)
        this.adjustMusicVolume(newVolume)
      }
    },
    stateRecordingBeats (newValue) {
      if (newValue) {
        this.bAlreadyWarnedFlag = false
      }
    },
    bAlreadyWarnedFlag (newValue) {
      console.log('Songs hit: alreadywarned: ' + newValue)
    },
    lstTimesWork (newValue) {
      console.log('lstTimesWork changed')
    },
    bReloadCurrentSeq (newValue) {
      if (newValue === true) {
        this.loadExistingSequence()
        this.$store.commit('UNSET_RELOAD_CURRENT_SEQ')
      }
    },
    userType (newType, oldType) {
      this.getWindowHeight()
    },
    RMEFolder (newVal) {
      // we're going to clear out all the data, s/b reactive on the Songs tab
      this.$store.commit('LOAD_BEATS', [])
      this.$store.commit('LOAD_SEQ', [])
      this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: '' }) // CLEARS all dependencies
      if (WAVESURFER) {
        WAVESURFER.destroy()
      }
      this.waveIsLoaded = false
      BEATSFOLDER = path.join(RMDIR, 'compases_para_canciones')
      CALLFOLDER = path.join(RMDIR, this.RMEFolder, 'vueltas')
    },
    MP3FileName (newVal) {
      if (!newVal) {
        this.timeTotal = 0
        try {
          WAVESURFER.empty()
        } catch (e) {
          console.log('invalid empty op on WAVESURFER')
        }
      }
      // here we can load the new song's purchase URL
      // we have a v-model dialog that can update this
    },
    MP3FileNameMd5Actual (calcMd5) {
      // filename and related values are cleared just before we load a new file.  Ignore the clearing of values.
      if (this.MP3FileName !== '' && calcMd5 !== '') {
        if (this.MP3FileNameMd5GivenXML.includes(calcMd5) && this.MP3FileNameMd5GivenSEQ.includes(calcMd5)) {
          console.log(`Music MD5 checksum AGREES: ${calcMd5}`)
        } else if (!this.MP3FileNameMd5GivenXML.includes(calcMd5) && this.lstTimesWork.length > 0) {
          // last clause: if we didn't load a beats file, don't compare Md5
          this.badFileModalTitle = 'Wrong music file for beats!'
          this.badFileModalHTML = 'Beats file was BUILT WITH a DIFFERENT MUSIC FILE.  ' + '<br><br>You should use the correct music file, or else the timing will be wrong.' +
          '<br><br>Given md5 of music per beats file: ' + this.MP3FileNameMd5GivenXML.join('\n') +
          '<br>Actual md5 value of music file: ' + calcMd5
          // Wizard user can force the md5 to be added to validation array in Beats file or Seq file
          this.userType === '2' ? this.$bvModal.show('modalBadFile_Admin_FixXML') : this.$bvModal.show('modalBadFile')
          console.log(`Music MD5 checksum PROBLEM - expected vs fresh calc: ${this.MP3FileNameMd5GivenXML} || ${calcMd5}`)
        } else if (!this.MP3FileNameMd5GivenSEQ.includes(calcMd5) && this.lstSeq.length > 0) {
          // last clause: if we didn't load a seq file, don't compare Md5
          this.badFileModalTitle = 'Wrong music file for sequence!'
          this.badFileModalHTML = 'Sequence file was BUILT WITH a DIFFERENT MUSIC FILE.  ' + '<br><br>You should use the correct music file, or else the sequence will likely be bad.' +
          '<br><br>Given md5 of music per sequence file: ' + this.MP3FileNameMd5GivenSEQ.join('\n') +
          '<br>Actual md5 value of music file: ' + calcMd5
          // Wizard user can force the md5 to be added to validation array in Beats file or Seq file
          this.userType === '2' ? this.$bvModal.show('modalBadFile_Admin_FixSEQ') : this.$bvModal.show('modalBadFile')
          console.log(`Music MD5 checksum PROBLEM - expected vs fresh calc: ${this.MP3FileNameMd5GivenSEQ} || ${calcMd5}`)
        }
      }
    }
  },
  components: { songsMeasures, getMusic },
  mounted: function () {
    // see https://laracasts.com/discuss/channels/vue/how-to-add-atkeyup-globally-with-vue?page=1 -->
    console.log('MOUNTED Songs')
    this.musicVolLocal = this.$store.state.settingsStore.settings.musicVol
    BEATSFOLDER = path.join(RMDIR, 'compases_para_canciones')
    CALLFOLDER = path.join(RMDIR, this.RMEFolder, 'vueltas')
    this.$nextTick(function () {
      // make tabs non-draggable.
      // nextTick: because bootstrap-vue dynamically adds Measures/Sequence tabs AFTER mounted
      // annoying feature of bootstrap tabs: draggable image is distracting
      var cardtabs = document.getElementsByClassName('nav-link')
      // this hyperefficient version (from stack overflow) is TOO ARCANE!
      // for (var i = cardtabs.length; i--; cardtabs[i]['draggable'] = false) {}
      // ... so this is better
      for (var i = cardtabs.length - 1; i >= 0; i--) {
        cardtabs[i].draggable = false
      }

      window.addEventListener('resize', this.getWindowHeight)

      // Init
      this.getWindowHeight()
    })
  },
  updated: function () {
    this.getWindowHeight()
    console.log('UPDATED Songs')
  },
  deactivated: function () {
    console.log('Deactivated Songs')
    window.removeEventListener('resize', this.getWindowHeight)
  },
  methods: {
    startSongHandler (songPtr) {
      const fname = path.join(songPtr.path, songPtr.file)
      if (!this.discDataHelper.fileExists(fname)) {
        this.$bvToast.toast('File has apparently moved? ' + fname, { title: 'Error' })
        return
      }
      this.showMusicLoader = false
      this.$nextTick(() => {
        this.waveIsLoaded = false
        this.loadMusicFile(fname)
        this.tellMusicChanged = fname // notify Measures subcomponent
      })
    },
    setPlayable () {
      const currFile = path.parse(this.currentFile, path.parse(this.currentFile))
      this.$store.dispatch('setPlayable', { [currFile.base]: currFile.dir })
    },
    fixMd5InFile (type) {
      const authorId = this.$store.state.settingsStore.settings.authorId
      const schemeDate = this.$store.state.movesStore.schemeDate
      const schemeProvider = this.$store.state.movesStore.schemeProvider
      const schemeName = this.$store.state.movesStore.schemeName
      let newMd5
      if (type === 'SEQ') {
        const seqTags = this.$store.state.beatsAndSequenceStore.seqTags
        newMd5 = Array.isArray(this.MP3FileNameMd5GivenSEQ) ? this.MP3FileNameMd5GivenSEQ.concat(this.MP3FileNameMd5Actual) : [this.MP3FileNameMd5GivenSEQ, this.MP3FileNameMd5Actual]
        newMd5 = Array.isArray(newMd5) ? newMd5 : [newMd5]
        const payload = { // construct asWhat parameter, each "type" is handled appropriately by DiscDataHelper downstream
          type: 'sequence',
          filename: this.MP3FileName,
          md5: newMd5,
          lstSeq: this.lstSeq,
          RMEFolder: this.RMEFolder,
          schemeName: schemeName,
          schemeProvider: schemeProvider,
          schemeDate: schemeDate,
          authorId: authorId,
          authorDate: new Date().toISOString(),
          seqTags: seqTags
        }
        this.$store.commit('PERSIST_SEQ', payload)
      } else if (type === 'XML') {
        newMd5 = Array.isArray(this.MP3FileNameMd5GivenXML) ? this.MP3FileNameMd5GivenXML.concat(this.MP3FileNameMd5Actual) : [this.MP3FileNameMd5GivenXML, this.MP3FileNameMd5Actual]
        newMd5 = Array.isArray(newMd5) ? newMd5 : [newMd5]
        const payload = {
          type: 'beats',
          filename: this.MP3FileName,
          MP3URL: this.MP3URL,
          md5: newMd5,
          bpm: this.MP3FileNameBPM,
          lstTimes: this.lstTimesWork,
          date: new Date().toISOString(),
          RMEfolder: this.RMEFolder,
          authorId: authorId
        }
        this.$store.commit('PERSIST_BEATS', payload)
      }
    },
    // https://jijnasu.in/electron-open-file-explorer-with-file-selected/
    makeMd5Array (raw) {
      // reading md5 field from beats XML file or sequence SEQ (xml format) file
      //  we accept an array of md5 values in JSON format, or just a string.
      //  If it's an empty string, value should be null
      //  But if it's non-null, this program will treat require an array, so ensure it is one
      if (!raw) return []
      try {
        // works if it's an array, error if it's just a string
        return JSON.parse(raw)
      } catch (e) {
        // we want to convert string into 1-element array in the code
        try {
          return [].concat(raw)
        } catch (e1) {
          this.$bvToast.toast(e1, { title: 'Error parsing md5 field' })
        }
      }
    },
    openFileExplorer (argExt) {
      const itemFilePath = path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', path.basename(this.currentFile,
        path.extname(this.currentFile)) + argExt)
      if (!this.discDataHelper.fileExists(itemFilePath)) {
        this.$bvModal.msgBoxOk('No SEQ file exists until you create it!')
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
    meanCalculatedByMeasures (newValue) {
      if (newValue) {
        this.meanGapImproved = newValue
        const newBPM = Math.round(60 / (newValue / 8))
        if (newBPM !== this.MP3FileNameBPM) {
          this.$store.commit('SET_BEATS_BPM', { MP3FileNameBPM: newBPM })
          // this.persistRevisedBeats() // save it when saving the first order changes
        }
      }
    },
    changeMode (mode) {
      this.mode = mode
    },
    persistRevisedBeats () {
      this.awaitingBeatsSave = false // so subcomponent knows we have exited recording after "save option" dialog closed
      const authorId = this.$store.state.settingsStore.settings.authorId
      const payload = {
        type: 'beats',
        filename: this.MP3FileName,
        MP3URL: this.MP3URL,
        // spotifySongId: this.spotifySongId,  // although it is a computed property locally, it seems to lag: go direct to store!
        spotifySongId: this.$store.state.beatsAndSequenceStore.spotifySongId,
        md5: [this.MP3FileNameMd5Actual], // actual md5 is critical to loading the file now save the actual mp3 md5
        bpm: parseInt(this.MP3FileNameBPM),
        lstTimes: this.lstTimesWork,
        date: new Date().toISOString(),
        RMEfolder: this.RMEFolder,
        authorId: authorId
      }
      this.$store.commit('PERSIST_BEATS', payload)
    },
    getWindowHeight (event) {
      // just bail, if not showing the beats grid
      if (this.showMusicLoader) return
      // for adjusting to user resizing
      console.log('running getWindowHeight, windowHeight: ' + document.documentElement.clientHeight)
      this.windowHeight = document.documentElement.clientHeight
      if (this.$store.state.settingsStore.settings.userType === '1') {
        this.cardHeight = ((this.windowHeight - this.$refs.songsMeasures.$el.getBoundingClientRect().top)) + 90
      } else {
        this.cardHeight = ((this.windowHeight - this.$refs.songsMeasures.$el.getBoundingClientRect().top)) + 45
      }
    },
    addSeqMove (moveName, b) {
      console.log('added a sequence move')
      if (!this.dictCurrMoves[moveName]) {
        // getMoveByNameObj returns a deep clone of the move
        const move = this.$store.getters.getMoveByNameObj({ $: { name: moveName } })
        this.dictCurrMoves[moveName] = move
        if (move.$.file !== 'no-such-file.mp3') {
          this.dictCurrMoves[moveName].$.howl = new Howl({
            src: [path.join(CALLFOLDER, move.$.file)],
            html5: false
          })
        }
      }
    },
    inputTab: function (tabNum) {
      console.log('"input" on tab#: ' + tabNum)
      // console.log(this.$refs.songsTabs.value)
    },
    stopPlay () {
      if (this.stateRecordingBeats === true) {
        this.$bvModal.msgBoxOk('Aborted... reverted to previous beats!')
        const xmlFile = path.join(BEATSFOLDER, path.basename(this.currentFile,
          path.extname(this.currentFile)) + '.xml')
        this.loadExistingBeats(xmlFile) // aborting beats, show the saved beats.  fn traps err and assigns empty array.
      }
      this.stateRecordingBeats = false
      WAVESURFER.stop()
      this.$store.commit('CLEAR_BEAT_BOINGS')
      console.log('stopPlay, timeOuts to kill:')
      console.info(this.timeoutsRunning)
      this.timeoutsRunning.forEach((to) => clearTimeout(to))
      this.$nextTick(() => { this.timeoutsRunning = [] })
      // this.analyzeBeats(false, false)
    },
    persistSSA () {
      let sSSA = `[Script Info]
Title: RuedaMatic Editor Subtitle file: ${new Date()}
Original Script: <unknown>
ScriptType: v4.00
Collisions: Normal
Timer: 100.0000

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Tahoma,24,16777215,16711680,65280,0,-1,0,1,2,3,2,30,30,10,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: Marked=0,0:00:00.00,0:00:02.50,Default,NTP,0000,0000,0000,!Effect,{\\b1}SSA VIDEO CAPTIONS{\\b0}
`
      for (let i = 0; i < this.lstSeq.length; i++) {
        if (this.lstSeq[i]) {
          let time = this.lstTimesWork[i].time
          let minutes = Math.floor(time / 60)
          let seconds = time - minutes * 60
          const startString = '0:' + ('0' + minutes).slice(-3) + ':' + ('00' + (Math.round(seconds * 100) / 100).toFixed(2)).slice(-5)
          // now the ending time, given 2.5 seconds duration
          time = time + 2.5
          minutes = Math.floor(time / 60)
          seconds = time - minutes * 60
          const endString = '0:' + ('0' + minutes).slice(-3) + ':' + ('00' + (Math.round(seconds * 100) / 100).toFixed(2)).slice(-5)
          sSSA += 'Dialogue: Marked=0,' + startString + ',' + endString + ',Default,NTP,0000,0000,0000,!Effect,' + this.lstSeq[i].$.name + '\n'
        }
      }
      const mypath = this.$store.state.beatsAndSequenceStore.MP3FileName
      const ssaFile = path.basename(mypath, path.extname(mypath)) + '.ssa'
      const outFilePath = path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', ssaFile)
      fs.writeFile(outFilePath, sSSA, function (err) {
        if (err) {
          throw err
        }
      })
      console.log('The file ' + outFilePath + ' was saved!')
      setTimeout(() => {
        this.openFileExplorer('.ssa')
      }, 500)
    },
    adjustMusicVolume (vol) {
      // https://stackoverflow.com/questions/1165026/what-algorithms-could-i-use-for-audio-volume-level
      // bottom line: non-linear function of the actual setting
      // need something more extreme than: WAVESURFER.setVolume((Math.exp(this.musicVol) - 1) / (Math.E - 1))
      const base = 10 // bigger base, more gradual the volume increase
      if (WAVESURFER) WAVESURFER.setVolume((Math.pow(base, vol) - 1) / (base - 1))
    },
    playSong (replaceFlag = false, start = 0) {
      if (this.WAVESURFER.isPlaying() && start === 0) {
        console.log('Songs playSong called while playing already, but with no change: ignoring')
        return
      }
      if (replaceFlag === true) {
        // emitted by Measure subcomponent
        this.stateRecordingBeats = true
        // jun vuexify this will be a commit
        // TODO: clears all data??
        // June 27 TODO: recording only starts when there are no more beats already in lit
        this.$store.commit('INIT_BEATS', []) // sets Orig and Working
      } else {
        this.stateRecordingBeats = false // used by subcomponent
      }
      let nPositionAt // at the current position, what is the next beat in the song?
      if (start) {
        this.$store.commit('CLEAR_BEAT_BOINGS') // clear the special highlighting of the currently playing beat
        this.timeoutsRunning.forEach((to) => clearTimeout(to))
        this.timeoutsRunning = []
        nPositionAt = this.discDataHelper.binarySearch(this.lstTimesWork.map(tm => tm.time), start)
        WAVESURFER.play(start) // default 0
      } else {
        nPositionAt = this.discDataHelper.binarySearch(this.lstTimesWork.map(tm => tm.time), WAVESURFER.getCurrentTime())
        WAVESURFER.play()
      }
      this.adjustMusicVolume(this.musicVolLocal)

      if (this.lstTimesWork.length > 0) {
        let clrIdx = 0
        let bFirstIntervalFired = false
        let prevBeat // interval that has finished, and next interval is playing
        let currBeat // interval currently playing
        let nextBeat // next interval to be played
        const changeColors = () => {
          clrIdx++
          if (clrIdx === 10) clrIdx = 0
          // peach,lt green,violet,lt orange,lt blue,lt grey,cyan,tan,lt yellow
          const ColorValues = ['#FFFFFF', '#FFCCCC', '#99FF99', '#CCAFFF', '#FFCC99', '#A6BEFF',
            '#CCCCCC', '#99FFFF', '#D5CCBB', '#FFFF99']
          console.log('changing color to: ' + ColorValues[clrIdx])
          this.wsbgColor = ColorValues[clrIdx]
        }
        let beatIdx = Math.abs(-nPositionAt - 1)
        const that = this // this reference becomes 'that' for use in async code following
        const setBackGround = () => {
          console.log('setBackGround invoked')
          prevBeat = currBeat
          currBeat = nextBeat
          if (beatIdx < that.lstTimesWork.length) {
          // if (!( = timeIter.next()).done) {
            nextBeat = that.lstTimesWork[beatIdx]
            const nextTimeSecs = nextBeat.time
            if (nextTimeSecs && WAVESURFER.isPlaying()) {
              // SCHEDULE NEXT CHANGE
              const wsElapsedMs = WAVESURFER.getCurrentTime()
              const nextTimeoutMs = (nextTimeSecs - wsElapsedMs) * 1000
              console.log(`nextTimeSecs: ${nextTimeSecs}, playerTimerMs: ${wsElapsedMs}, nextTimeoutMs: ${nextTimeoutMs}`)
              let timeOffsetMs
              let comingGapMs
              // keep the calls coming
              if (that.lstSeq && that.lstSeq.length && !this.callsOff) {
                const curCall = that.lstSeq[beatIdx]
                // call should come between after beat 1 and, before 5.
                // Default is 1 beat leadin in the audio clip
                // so start it at 1.33 beats into current measure (nextTimeoutMs / 6)
                try {
                  // PREP to schedule the next call
                  if (curCall.$.length > -1) { // -1 is just signal  time for a continuation of previous call
                    // callDelay, if any, delays the call by a fraction of a measure.  This is the numerator
                    // and the denominator of the fraction is always 8 (counts per measure)
                    const callDelay = curCall.$.delaycount ? Number.parseInt(curCall.$.delaycount) : 0
                    // Aside from callDelay... The call should be hear a measure ahead of actually executing it
                    // Should it be heard on the 1, 2, 3?  User setting 'Beat to call on' (beatToCallOn)
                    if (!bFirstIntervalFired) {
                      // first time through, player is at 0 time, and the nextTimeoutMs includes the delay before first call
                      //  so for calc leadTime of call, we can't use nextTimeoutMs at all: use meanGapImproved
                      console.log('setting special TO gap, OPENING (FIRST) INTERVAL')
                      comingGapMs = that.meanGapImproved * 1000
                      timeOffsetMs = nextTimeoutMs - comingGapMs + (Math.round((that.beatToCallOn - 1) * comingGapMs / 8 + comingGapMs * callDelay / 8))
                    } else {
                      comingGapMs = nextTimeoutMs
                      timeOffsetMs = Math.round((that.beatToCallOn - 1) * comingGapMs / 8 + comingGapMs * callDelay / 8)
                    }
                    console.log(`timeOffsetMs: ${timeOffsetMs}, comingGapMs: ${wsElapsedMs}, nextTimeoutMs (rpt): ${nextTimeoutMs}`)
                    if (timeOffsetMs < 0) timeOffsetMs = 0
                    // schedule the next call: howl is the method to play the call immediately (see howler pkg)
                    that.timeoutsRunning.push(setTimeout(() => curCall && curCall.$ && that.dictCurrMoves[curCall.$.name].$.howl
                      // !console.log evals to true, && evaluation executes each part consecutively
                      ? !console.log('In call TO: calling:' + curCall.$.name) && WAVESURFER.isPlaying() && that.dictCurrMoves[curCall.$.name].$.howl.play()
                      : console.log('Shouldn\'t be here: in call TO, but no call - at:' + (currBeat ? currBeat.time : 0)),
                    timeOffsetMs))
                    console.log(`In call TO: Offset: ${timeOffsetMs} Delay: ${callDelay}`)
                  } else {
                    // -1 length is a continuation for a longer move, not a repetition!
                    console.log('setTimeout for call: no call, understood as continuation of previous. But keep call loop going.')
                  }
                } catch (e) {
                  // no call here
                  console.log('no setTimeout (no call) at time:' + (currBeat ? currBeat.time : 'undefined') + ', understood as repetition of previous.  But keep call loop going.')
                }
              }
              beatIdx += 1
              if (bFirstIntervalFired) {
                // COLOR selection, for BG
                changeColors()
                if (prevBeat) {
                  if (beatIdx > 59 && beatIdx < 63) console.log('RESET beat boing: ' + beatIdx)
                  this.$store.commit('SET_BEAT_BOING', { elem: prevBeat, boing: false })
                }
                this.$store.commit('SET_BEAT_BOING', { elem: currBeat, boing: true })
                if (this.scrollMe) {
                  scrollIntoView(document.getElementById('beat' + beatIdx))
                }
              } else {
                bFirstIntervalFired = true
              }
              // while the song is playing, this keeps the loop going
              that.timeoutsRunning.push(setTimeout(setBackGround, nextTimeoutMs)) // milliseconds delay
            }
          } else { // song is done, last clr chg
            changeColors()
            this.$store.commit('SET_BEAT_BOING', { elem: prevBeat, boing: false })
          }
        }
        setBackGround() // kick off the timing loop
      }
    },
    loadMusicFile (musicFile = this.MP3FileName) {
      this.awaitingBeatsSave = false // so subcomponent knows we have exited recording after "save option" dialog closed
      const remote = this.$electron.remote
      this.measuresComponentKey++ // causes destroy/recreate/remount
      // jun vuexify: this will be a commmit
      this.$store.commit('INIT_BEATS', []) // this just clears the store
      try {
        try {
          if (WAVESURFER) {
            WAVESURFER.destroy()
          }
        } catch (e) {
          console.log(e)
        }
      } catch (e) {
        console.log('ERR: destroy on WAVESURFER failed... ')
      }
      this.currentFile = musicFile
      this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: '' }) // this just clears the store for filename and all depenedent values
      // make the IPC call to run ffmpeg.exe, and get the actual Md5 checksum of the music file, put it in Vuex
      //  and then call commit('SET_MP3NAME_AND_DEPS' with actual values
      this.$store.dispatch('setMP3NameAndCalcMd5', { MP3FileName: musicFile }) // triggers md5 checksum validation in Vuex Action
      // get the XML (Beats) file
      const xmlFile = path.join(BEATSFOLDER, path.basename(this.currentFile,
        path.extname(this.currentFile)) + '.xml')
      if (this.discDataHelper.fileExists(xmlFile)) {
        this.loadExistingBeats(xmlFile)
        this.setPlayable() // path to music file will be saved in ini under playables
        //  The Songs tab loads all the beats files.  If the music file is NOT in user/Music, then
        //  the grid will need a link to know where is the actual music file, in order to be functional
      } else {
        const errMsg = 'No beats files exists yet for this song!  Create one (using the Wizard setting)'
        console.error(errMsg)
        this.$bvToast.toast(errMsg, { title: 'No Beats file yet' })
      }

      // get the Calls (Sequence) file
      if (this.$store.state.settingsStore.settings.presetOrAutofill === 1) {
        if (this.lstTimesWork.length > 0) {
          const seqFilePath = path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', path.basename(this.currentFile,
            path.extname(this.currentFile)) + '.seq')
          if (this.discDataHelper.fileExists(seqFilePath)) {
            this.loadExistingSequence()
          } else {
            this.$store.commit('LOAD_SEQ', []) // ensure we don't keep a previous file sequence if none for current song
            console.log('No Calls data file (seq) found for this song')
          }
        } else {
          this.$store.commit('LOAD_SEQ', []) // ensure we don't keep a previous file sequence if none for current song
          console.log('No Beats, so don\'t even look for a sequence file!')
        }
      }
      this.bLoading = true // trigger loading animation
      this.prepareSong()
      remote.getCurrentWindow().show() // ensure focus on the renderer window
    },
    loadExistingBeats (xmlFile) {
      const musicFile = this.currentFile
      try {
        const xmlData = this.discDataHelper.getXMLData(xmlFile, { type: 'beats' }) || []
        const xmlAuthor = xmlData.authorId
        const xmlDate = xmlData.authorDate
        const spotifySongId = xmlData.spotifySongId
        const MP3URL = xmlData.MP3URL
        const MP3FileNameMd5GivenXML = this.makeMd5Array(xmlData.md5)
        this.$store.commit('SET_MP3NAME_AND_DEPS', {
          MP3FileName: musicFile,
          MP3FileNameBPM: parseInt(xmlData.bpm),
          spotifySongId: spotifySongId,
          MP3FileNameMd5GivenXML: MP3FileNameMd5GivenXML,
          xmlAuthor: xmlAuthor,
          xmlDate: xmlDate,
          MP3URL: MP3URL
        })
        const lstTimesLocal = xmlData.beats.map(beat => {
          this.$set(beat, 'boing', false) // make sure "boing" is reactive, so the boing transition works!
          return beat
        })
        this.$store.commit('INIT_BEATS', lstTimesLocal) // actual initial value here!
      } catch (e) {
        if (e.message.search('ENOENT') === 0) {
          this.$bvToast.toast('Can\'t reload saved beats, the beats file does not exist.', { title: 'No Beats file yet' })
        } else {
          this.badFileModalTitle = 'XML file Illegal Format'
          this.badFileModalHTML = 'XML file (with beat times for this song) is illegal format.  You should replace it.  ' + e.message
          this.$bvModal.show('modalBadFile')
        }
        this.$store.commit('INIT_BEATS', [])
        console.log('ERROR: Failed to get measures data for music file: ' + '\n' + e.stack)
      }
    },
    loadExistingSequence () {
      // helper to loadMusicFile
      // factored out Jan 2020.  Use case: If a move name is changed, we want to reload the sequence in case it uses the move
      //  But if we reload everything, WaveSurfer can have an error on loading the blob the 2nd time.  For this case,
      // refactoring just the sequence load so it can be called in isolation.
      if (this.currentFile === 'no file') return // ** BAIL, this value is the default empty value
      const musicFile = this.currentFile
      const seqFilePath = path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', path.basename(this.currentFile,
        path.extname(this.currentFile)) + '.seq')
      try {
        const seqContent = this.discDataHelper.getXMLData(seqFilePath, { type: 'sequence' }) || []
        const MP3FileNameMd5GivenSEQ = this.makeMd5Array(seqContent.musicfile[0].$.md5)
        const seqData = seqContent.sequences[0].sequence[0].move || []
        const seqTags = seqContent.author[0].$.tags

        this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: musicFile, MP3FileNameMd5GivenSEQ: MP3FileNameMd5GivenSEQ, seqTags: seqTags }) // sets name and fresh calc of md5
        const clonedMoves = seqData.map(nameObj => this.$store.getters.getMoveByNameObj(nameObj))
        this.dictCurrMoves = clonedMoves.reduce((acc, curOrig) => {
          const cur = _cloneDeep(curOrig)
          // a silent move doesn't need an mp3, e.g. "Continue" was historically used to fill spaces for Android client
          if (cur.$.file !== 'no-such-file.mp3') {
            this.$set(cur.$, 'howl', new Howl({
              src: [path.join(CALLFOLDER, cur.$.file)],
              html5: false
            }))
          }
          this.$set(acc, cur.$.name, cur)
          return acc
        }, {})
        let extendedBars = 0 // how we mark the "extra" measures reserved for longer moves
        let extendedOffset = 0 // we are going to pad the array internally when there is an extended move
        const internalSeq = []
        // init the calls needed in this rueda
        clonedMoves.forEach((moveObj, index) => {
          if (moveObj.$.name === 'Continue') {
            internalSeq[index + extendedOffset] = undefined // Continue is do nothing, say nothing... just take up time
          } else {
            internalSeq[index + extendedOffset] = moveObj
            extendedBars = moveObj.$.length - 1
            // nov 2019: added 0 length moves, for short measures where there's a clave change.  These moves will not be extendable.
            // previously this test was "while (extendedBars)"
            while (extendedBars > 0) {
              extendedOffset += 1
              extendedBars -= 1
              // the source array does not hold the extended beats, we add them for visual effect - information
              internalSeq[index + extendedOffset] = _cloneDeep(moveObj) // clone, helps distinct appearance of extended measures
              internalSeq[index + extendedOffset].$.length = -1 // internal sign this the move is an extended count move
            }
          }
        })
        this.$store.commit('LOAD_SEQ', internalSeq) // sequence formatted for RME use, save a copy in store
      } catch (e) {
        this.badFileModalTitle = e.message // this contains the name of the move that was "not found"
        this.badFileModalHTML = 'SEQ file (with calls for this song) is illegal format.  You should replace it.  ' +
          'IF YOU DELETED a move and it is used in this SEQ, you must MANUALLY fix the file; or delete it and create it again.'
        this.$bvModal.show('modalBadFile')
        this.$store.commit('LOAD_SEQ', []) // ensure we don't keep a previous file sequence if none for current song
        console.log('ERROR: Failed to get sequence data for sequence file: ' + '\n' + e.stack)
      }
    },
    chooseFile () {
      this.$nextTick(() => {
        try {
          WAVESURFER.stop()
        } catch (e) {
          console.log('Wavesurfer stop command fails, not initialized')
        }

        console.log('browsing, choose file routine')
        const remote = this.$electron.remote
        const files = remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
          title: 'Choose dance music',
          defaultPath: MUSICFOLDER,
          buttonLabel: 'Select music',
          // we told them it's for mp3 files... but m4a should work if they try
          filters: [{ name: 'Songs', extensions: ['mp3', 'm4a'] }],
          properties: ['openFile']
        })
        if (files) {
          this.showMusicLoader = false
          this.waveIsLoaded = false
          this.loadMusicFile(files[0])
          this.tellMusicChanged = files[0] // notify Measures subcomponent
        }
      })
    },
    prepareSong () {
      try {
        if (WAVESURFER) {
          try {
            WAVESURFER.empty()
          } catch (err) {
            WAVESURFER.empty()
            console.log('retry empty API on wavesurfer: seems to fail alternate calls, unless retried')
          }
        }
        WAVESURFER = WaveSurfer.create({
          container: '#waveform',
          height: 64
        })
        this.WAVESURFER = WAVESURFER // put a reference at vue instance scope, so can be passed to components
      } catch (e) {
        console.log(e)
      }
      // is there a call file name, if so: does it exist in vueltas?
      if (this.currentFile) {
        const filePath = this.currentFile
        const that = this
        fs.readFile(filePath, (err, data) => {
          if (data && !err) {
            console.log('has data and no error!')
          }
          const fileData = new window.Blob([data])
          WAVESURFER.loadBlob(fileData)

          // event config
          WAVESURFER.on('loading', percent => {
            console.log('WAVESURFER loading', percent + '%')
          })

          WAVESURFER.on('error', err => {
            console.log('WAVESURFER error', err)
          })

          WAVESURFER.on('seek', progress => {
            console.log('WAVESURFER seek', progress)
            const wasPlaying = WAVESURFER.isPlaying()
            this.$store.commit('CLEAR_BEAT_BOINGS')
            WAVESURFER.pause()
            console.log('ws seek, timeOuts to kill:' + that.timeoutsRunning)
            that.timeoutsRunning.forEach((to) => clearTimeout(to))
            that.timeoutsRunning = []
            that.$nextTick(() => {
              that.timeoutsRunning = [] // clear any scheduled call events
              if (progress > 0 && wasPlaying) that.playSong(false)
            })
          })

          WAVESURFER.on('ready', () => {
            console.log('WAVESURFER ready')
            that.bLoading = false
            that.waveIsLoaded = true // this should enable play button
            const timeTotalLoc = WAVESURFER.getDuration()
            // total time for display in UI
            that.timeTotal =
              Math.floor((((timeTotalLoc % 31536000) % 86400) % 3600) / 60) +
              ':' +
              ('00' + Math.floor((((timeTotalLoc % 31536000) % 86400) % 3600) % 60)).slice(-2) +
              ' (' +
              timeTotalLoc.toFixed(1) +
              ' sec)'
            if (that.$store.state.settingsStore.settings.presetOrAutofill === 2) { // autofill please!
              const currentBeatIndex = 2 // give the dancers a few seconds, like IRL
              const editedMoves = that.$store.state.movesStore.editedMoves
              const editedCombos = that.$store.state.movesStore.editedCombos
              const minBaseName = that.MP3FileNameBaseName.substring(0, that.MP3FileNameBaseName.lastIndexOf('.'))
              that.autoFiller = new AutoFiller([], editedMoves, editedCombos, that.lstTimesWork, currentBeatIndex, minBaseName)
              this.$store.commit('LOAD_SEQ', []) // ensure we don't keep a previous file sequence if none for current song
              // eslint-disable-next-line no-unused-vars
              const [allMoves, audit] = that.autoFiller.autoFill()
              this.autofillAuditSongs = audit
              let offs = 0
              for (let i = 0; i < allMoves.length; i++) {
                if (allMoves[i]) {
                  const ind = that.autoFiller.editedMoves.binarySearchIndex(allMoves[i].move, m => m.$.nameSorted) // get the details need to save sequence
                  const fullMove = that.autoFiller.editedMoves[ind]
                  that.addSeqMove(allMoves[i].move) // Songs needs to add Howler for this to move dictionary)
                  that.$store.commit('ADD_THIS_SEQ_MOVE', { index: offs, item: _cloneDeep(fullMove), maxBeat: that.lstTimesWork.length })
                  offs += allMoves[i].length ? allMoves[i].length : 1 // cambio move takes a position on the grid, even if it's nominal length is 0 (signifying half a measure)
                } else {
                  offs += 1 // Continue is the empty move, exists just to take up a measure of time
                }
              }

              that.playSong() // don't know another way to reset to beginning
            }
          })

          WAVESURFER.on('finish', () => {
            try {
              WAVESURFER.play(0) // don't know another way to reset to beginning
              WAVESURFER.stop()
            } catch (e) {
              console.log('Err resetting WAVESURFER at time 0')
            }
            if (that.stateRecordingBeats === true) {
              that.awaitingBeatsSave = true // tell Measures to ignore space bar til we've got an answer!
              const obj = {
                title: 'Replace?',
                message: 'Do you want to keep this version?  (You can fix any issues later)', // string -- message alert
                type: 'warning', // string -- type : info (default), success, warning, error
                customCloseBtnText: 'Save New Beats?', // string -- close button text
                onClose: this.persistRevisedBeats, // function -- when close triggered
                useConfirmBtn: true, // boolean -- using confirm button
                onConfirm: this.loadMusicFile,
                customConfirmBtnText: 'Cancel' // string -- confirm button text
                // showXclose: false //boolean -- show x close button
              }
              this.$refs.simplert.openSimplert(obj)
              this.bAlreadyWarnedFlag = false
              that.stateRecordingBeats = false // wait til this dlg is closed, put it in the downstream actions
            }
            this.$store.commit('CLEAR_BEAT_BOINGS')
          })
        })
      }
    }
  }
}
</script>

<style scoped>
/* main not needed? */
main {
  display: flex;
}

* {
  box-sizing: border-box;
  margin: 10px;
  padding: 0px;
}
</style>
