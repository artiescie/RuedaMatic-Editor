<template>
  <div>
    <b-card
      tag="article"
      class="mb-1">
        <b-container title="List of songs that have beats files ready to use">
          <div class="col-12">
            <b-button style="display: inline-block;" size="sm" id="choose-file" href="#" variant="warning" @click="$emit('choose-file')">Browse</b-button>
            <div style="display: inline-block;">&nbsp; to load a song <em>that has no beats yet</em>&mdash; <em>OR click a green </em>LOAD button <em>below</em> <small><em>(hover for more info)</em></small></div>
          </div>
          <br>
        </b-container>
      <div class="justify-content-center row">
        <!--filters and pagination-->
        <b-form-fieldset label-cols="5" label="Rows/pg" class="col-3">
          <b-form-select :options="[{text:10,value:10},{text:20,value:20},{text:50,value:50}]" v-model="perPage" />
        </b-form-fieldset>
<!-- :variant="rowCriteria.stringName.length>0?'bg-secondary':'bg-light'"  -->
        <b-row class="col-3 mb-2">
          <b-input-group class="mb-1" title="Filter by file name" label="Name" label-cols="3" label-for="inputFiltName">
            <b-form-input :class="{'bg-warning': rowCriteria.stringName.length}" id="inputFiltName" ref="inputFiltName"
              size="sm" v-model="rowCriteria.stringName" placeholder="Filter by name" debounce="400"/>
            <b-input-group-append>
              <b-btn size="sm" style="height: 31px; width: 50px;" @click="rowCriteria.stringName=''">X</b-btn>
              <!-- clear the filter -->
            </b-input-group-append>
          </b-input-group>
          <b-input-group class="mt-1" title="Filter by the Tags for the sequence (if seq exists)" label="Tags" label-cols="3" label-for="inputFiltTags">
            <b-form-input :class="{'bg-warning': rowCriteria.stringTags.length}" id="inputFiltTags" size="sm" v-model="rowCriteria.stringTags"
              placeholder="Filter by tag" debounce="400"/>
            <b-input-group-append>

              <b-btn size="sm" style="height: 31px; width: 50px;" @click="rowCriteria.stringTags=''">X</b-btn>
              <!-- clear the filter -->
            </b-input-group-append>
          </b-input-group>
        </b-row>

        <b-col title="Show only music that is slow (beats-per-minute), or
that was loaded from a file on this local computer" class="col-3">
          <b-form-checkbox title="Show only music that is slow (beats-per-minute)" v-model="rowCriteria.onlySlow" @input="manageLogicOnlySlow">only Slow music <small><em>(&lt;= 172 bpm)</em></small> </b-form-checkbox>
          <b-form-checkbox title="Show only music that is not slow (beats-per-minute)" v-model="rowCriteria.notSlow" @input="manageLogicNotSlow">not Slow music <small><em>(&gt; 172 bpm)</em></small></b-form-checkbox>
        </b-col>

        <b-col title="Show only music that is NOT slow (beats-per-minute)" class="col-3">
          <b-form-checkbox title="Show only music I have loaded from a file on this computer" v-model="rowCriteria.onlyLocal">only Downloaded music</b-form-checkbox>
          <b-form-checkbox title="Show only music that is not slow (beats-per-minute)" v-model="rowCriteria.onlyWithCalls">songs with Preset calls</b-form-checkbox>
        </b-col>
      </div>
      <b-table striped hover sort-by="filename " small :items="beatsFiles" :fields="fields" :current-page="currentPage" :per-page="perPage"
          :filter="rowCriteria" :filter-function="customFilter" @filtered="onFiltered">
        <template slot="filename" slot-scope="each">
          {{ each.item.filename }}
        </template>
        <template v-slot:cell(link)="row">
          <b-btn v-if="maybeShow(row)" class="py-0"
              :title="getLoadTitle(row.item.link)" variant="warning" size="sm"
              @click="startSongMaybe(row)">
              <v-icon v-if="row.item.seqExists" class="m-1" name="microphone"/>
              <v-icon v-else class="m-1" name="microphone-slash"/>
              Load
          </b-btn>
          <b-btn disabled v-else-if="row.item.link && row.item.link.toLocaleLowerCase().substring(0, 4)==='http'" variant="warning" size="sm" class="py-0"
            title="If you have this song, click Browse above and link it.  If not, click BUY to get your song!"
          >no link: [Browse? or Buy?]
          </b-btn>
          <b-btn v-else size="sm" variant="light" title="Wizard needs to Set a URL to buy the song" class="py-0"><v-icon class="m-1" name="exclamation-triangle"/>Get URL
          </b-btn>
        </template>
        <template v-slot:cell(mp3URL)="row">
          <b-button v-if="!!(row.item.mp3URL && row.item.mp3URL.substring(0,4).toLocaleLowerCase() === 'http')" size="sm" id="setURL" variant="warning"
            title="Buy URL is set, but could be revised here in the Wizard mode." @click="showBuyDialog(row)" class="py-0"><v-icon class="m-1" name="cloud-download-alt"/>Buy</b-button>
          <b-button v-else size="sm" id="setURL" variant="outline-warning"
            title="No Buy URL: Wizards should set it, so regular Caller users know where to buy the song." @click="showBuyDialog(row)" class="py-0">???</b-button>
        </template>
        <template v-slot:cell(spotifySongId)="row">
          <b-btn v-if="!validSpotifyId(row.item.spotifySongId)" size="sm" variant="warning" :title="'The Spotify Song ID.  Required to play your sequence on the Spotify app RM Spot. \n' +
              row.item.spotifySongId" class="py-0" @click="showSpotifyIdDialog(row)">
            <v-icon class="m-1" name="exclamation-triangle"/>Spot ID
          </b-btn>
          <b-btn v-else size="sm" variant="warning" :title="'The Spotify Song ID.  Required to play your sequence on the Spotify app RM Spot. \n' +
              row.item.spotifySongId" class="py-0" @click="showSpotifyIdDialog(row)">
            {{row.item.spotifySongId.substr(0,4) + '…'}}
          </b-btn>
        </template>
      </b-table>
      <div class="justify-content-center row my-1">
        <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" size="md" />
      </div>
    </b-card>
    <b-modal id="getSpotifyId" @ok="saveSpotifyId">
      <b-form-fieldset title="Spotify song ID (from Spotify app context menu)" label="Song ID from Spotify app: ">
        <b-form-input v-model="spotifySongId"/>
        <span><v-icon v-if="!validSpotifyId(spotifySongId)" class="m-1" name="exclamation-triangle"/>Valid Spotify IDs have 22 characters, uppercase or lowercase English alphabet, and digits 0-9</span>
      </b-form-fieldset>
    </b-modal>
    <b-modal v-if="userType === '2'" id="getBuyURL" size="lg" title="Where can the user buy this EXACT music file?" @ok="saveBuyURL" @hidden="showingBuyDialog=false">
      <b-form-fieldset title="Wizard version: Users will be sent to URL for online store where you bought the music file" label="Insert 'Buy Song' URL here: ">
        <b-form-input v-model="buySongURLInput" />
      </b-form-fieldset>
    </b-modal>
    <b-modal v-else id="getBuyURL" size="lg" title="Get this music" @hidden="showingBuyDialog=false" ok-only>
      <div v-if="buySongURLInput">
        <p><em>{{buySongURLInput}}</em></p>
        <p>To find out how to buy and download this <em>exact</em> song from iTunes - click here:
          <b-btn variant="success" title="URL to buy the song" class="py-0" @click="opn(buySongURLInput)"
            >Song info
          </b-btn><p>... Then on the web page, you can buy it in iTunes.  (Click "Open in Music", "Open iTunes").</p>
          <p>iTunes is currently (as of 2022) the most complete source of Cuban Timba music for purchase and download!   Their m4a format is compatible with RuedaMatic!</p>
        </p>
      </div>
      <div v-else>
        <p>No purchase URL has been supplied!</p>
      </div>
    </b-modal>
  </div>
</template>

<script>
import replace from 'replace-in-file'
import electron from 'electron'
import path from 'path'
import he from 'he'
import fs from 'fs-extra'
import xml2js from 'xml2js'
// eslint-disable-next-line no-unused-vars
import { toRegex, toString } from 'diacritic-regex'

const HOMEDIR = electron.remote.app.getPath('home')
const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const MUSICFOLDER = path.join(HOMEDIR, 'Music')

export default {
  name: 'GetMusic',
  data () {
    return {
      // showSpotifyIdDlg: false,
      spotifySongId: '',
      spotifySongIdFileName: '',
      rowCriteria: { stringName: '', stringTags: '', onlySlow: false, onlyLocal: false, notSlow: false, onlyWithCalls: false },
      buySongURLInput: '',
      buySongURLFileName: '',
      totalRows: 1,
      currentPage: 1,
      perPage: 10,
      beatsFiles: [] // {filename: 'xx', URL: 'xx'}
    }
  },
  props: ['showMusicLoader'],
  beforeMount () {
    this.refresh()
    console.log('BEFORE MOUNT GetMusic')
  },
  activated () {
    // this.refresh()
    this.$refs.inputFiltName.focus()
    console.log('ACTIVATED GetMusic')
  },
  watch: {
    showMusicLoader (newVal) {
      if (newVal) {
        this.refresh()
      }
    },
    MP3URL (newVal) {
      this.buySongURLInput = newVal
    },
    RMEFolder (newValue) {
      this.refresh()
    }
  },
  computed: {
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    userType () {
      return this.$store.state.settingsStore.settings.userType
    },
    MP3FileName () {
      return this.$store.state.beatsAndSequenceStore.MP3FileName
    },
    MP3URL () {
      return this.$store.state.beatsAndSequenceStore.MP3URL
    },
    fields () {
      // user === wizard will see the Spotify ID column
      const retVal =
        this.userType === '2' ? [
          {
            key: 'filename',
            sortable: true,
            tdAttr: 'tdCommentTitle',
            formatter: comment => {
              const ELLIPSIS_CHARACTER = '\u2026'
              const max = 72
              if (comment.length > max) {
                return comment.slice(0, max - 1) + ELLIPSIS_CHARACTER
              } else {
                return comment
              }
            }
          },
          { key: 'tags', label: 'Seq Tags', sortable: true, tdAttr: 'tdTags' },
          { key: 'bpm', label: 'bpm', sortable: true, tdAttr: 'tdBpm' },
          { key: 'link', sortable: true },
          { key: 'mp3URL', label: 'Buy', sortable: false },
          { key: 'spotifySongId', sortable: true }
        ]
          : [
            {
              key: 'filename',
              sortable: true,
              tdAttr: 'tdCommentTitle',
              formatter: comment => {
                const ELLIPSIS_CHARACTER = '\u2026'
                const max = 72
                if (comment.length > max) {
                  return comment.slice(0, max - 1) + ELLIPSIS_CHARACTER
                } else {
                  return comment
                }
              }
            },
            { key: 'tags', label: 'Seq Tags', sortable: true, tdAttr: 'tdTags' },
            { key: 'bpm', label: 'bpm', sortable: true, tdAttr: 'tdBpm' },
            { key: 'link', sortable: true },
            { key: 'mp3URL', label: 'Buy', sortable: false }
          ]
      return retVal
    }
  },
  methods: {
    validSpotifyId (str) {
      // soft validation, we don't really know if there is a reliable rule but this seems to be current practice
      // e.g. https://jtr13.github.io/cc21/resources/getting_data_using_apis/Getting_Data_using_APIs.pdf
      return str ? str.match(/^[a-zA-Z0-9]{22}$/gi) : false
    },
    maybeShow (row) {
      return row.item.link && row.item.link.substring(0, 2).match(/[a-z]:/gi) && row.item.mp3Exists
    },
    tdCommentTitle (value, key, item) {
      const wrap = (s, w) => s.replace(
        new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
      )
      return { title: wrap(value, 26) }
    },
    clickGetURL (row) {
      this.opn(row.item.mp3URL)
    },
    startSongMaybe (row) {
      const stateCtrl = event.getModifierState('Control')
      const stateShift = event.getModifierState('Shift')
      if (stateCtrl && stateShift) {
        try {
          this.opn(row.item.mp3URL)
        } catch (e) {
          this.$bvToast.toast('No `valid URL to launch', { title: 'Error' })
        }
      } else {
        this.$emit('start-song', { path: row.item.link, file: row.item.filename })
      }
    },
    getLoadTitle (link) {
      return `LOOKING IN: ${link}
If that isn't where your song is, or your song has no beats yet:
  click BROWSE, find the matching music: we'll remember the one you pick.
MIC icon: There are PRESET CALLS for this song in this scheme.
NO MIC icon: There are NO PRESET CALLS.
BEATS: Only songs with beats are listed.  To set beats, click "To Workbench" on this SONGS tab.  `
    },
    manageLogicOnlySlow (value) {
      // the checkboxes for beats file grid may be mutually exclusive, handle that
      if (value) this.rowCriteria.notSlow = false
    },
    manageLogicNotSlow (value) {
      // the checkboxes for beats file grid may be mutually exclusive, handle that
      if (value) this.rowCriteria.onlySlow = false
    },
    customFilter (row, criteria) {
      try {
        if (!!criteria.stringName && !row.filename.match(toRegex()(criteria.stringName))) return false
        if (!!criteria.stringTags && (row.tags.toLocaleLowerCase().indexOf(criteria.stringTags.toLocaleLowerCase()) < 0)) return false
        else if (criteria.onlySlow && parseInt(row.bpm) > 172) return false
        else if (criteria.notSlow && parseInt(row.bpm) <= 172) return false
        // if there's not a row link, or if there is a row link and it doesn't start with X:\ a drive letter
        else if (criteria.onlyLocal && (!row.link || (!!row.link && !row.link.substring(0, 3).match(/[a-z]:\\/gi)))) return false
        else if (criteria.onlyWithCalls && (!row.seqExists)) return false
        else return true
      } catch (e) {
        console.log(e)
      }
    },
    saveSpotifyId () {
      if (path.basename(this.MP3FileName) === this.spotifySongIdFileName) {
        this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: this.MP3FileName, spotifySongId: this.spotifySongId })
        // persist the new revised beats XML
        this.$emit('persist-revised-beats') // **COMMIT**
        setTimeout(this.refresh, 300) // cheaper await !
      } else {
        // not the current beats file we are editing, let's use replace-in-file and find the right file with the files argument
        const file = path.basename(this.spotifySongIdFileName, path.extname(this.spotifySongIdFileName)) + '.xml'
        // eslint-disable-next-line no-unused-vars
        const results = replace.sync({
          files: path.join(RMDIR, 'compases_para_canciones', file),
          from: /(authorAndSongURL date=".{23}Z" authorId="[^"]*")( *)(spotifySongId="[A-Za-z0-9]*")*(>.*<\/authorAndSongURL>)/gi,
          to: '$1 spotifySongId="' + this.spotifySongId + '"$4',
          dry: false
        })
        if (results[0].hasChanged) {
          console.log(`File "${file}" has been modified for new spotifySongId`)
        } else {
          console.error(`File "${file}" no match: no change has been made`)
        }
        this.refresh()
      }
    },
    saveBuyURL () {
      if (!(this.buySongURLInput.toLocaleLowerCase().match(/http[s]?:\/\//))) {
        this.$bvToast.toast('Clearing: NO URL is saved for this song', { title: 'Clearing' })
        this.buySongURLInput = 'NO SONG URL'
      }
      if (path.basename(this.MP3FileName) === this.buySongURLFileName) {
        this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: this.MP3FileName, MP3URL: this.buySongURLInput })
        // persist the new revised beats XML
        this.$emit('persist-revised-beats') // **COMMIT**
        setTimeout(this.refresh, 300) // cheaper await !
      } else {
        // must be able to change any song, not the currently loaded one, replace-in-file will be used
        const builder = new xml2js.Builder()
        const newDate = new Date().toISOString()
        const authorId = this.$store.state.settingsStore.settings.authorId
        const xmlNewTag = builder.buildObject({ authorAndSongURL: { $: { date: newDate, authorId: authorId, spotifySongId: this.spotifySongId }, _: this.buySongURLInput } })
        const element = xmlNewTag.replace(/<?.*\n/gm, '')
        const file = path.basename(this.buySongURLFileName, path.extname(this.buySongURLFileName)) + '.xml'
        // eslint-disable-next-line no-unused-vars
        const results = replace.sync({
          files: path.join(RMDIR, 'compases_para_canciones', file),
          from: /(<authorAndSongURL.*authorAndSongURL>)/gi,
          to: element,
          dry: false
        })
        this.refresh()
      }
    },
    showSpotifyIdDialog (row) {
      this.spotifySongIdFileName = row.item.filename
      this.spotifySongId = row.item.spotifySongId
      this.$bvModal.show('getSpotifyId')
      // this.showingBuyDialog = true
    },
    showBuyDialog (row) {
      this.buySongURLFileName = row.item.filename
      this.buySongURLInput = row.item.mp3URL
      this.$bvModal.show('getBuyURL')
      this.showingBuyDialog = true
    },
    refresh () {
      // the main population of the beatsFiles array behind the song grid
      const dictSpotifySongId = {} // detect duplicate spotify song id
      this.filter = null
      const that = this
      const playable = that.$store.getters.getUserData('playables')

      function lookin (args) { // helper loads the available beats in folder compases_para_canciones
        // arg 0: 'entire match'
        // arg 1: capture 1 base filename+ext
        // arg 2: capture 2 full URL
        // arg 3: seeing 'undefined'
        // arg 4: seeing 65
        // arg 5: entire input file
        // arg 6: input filename
        // he lib: "= html entity"; MP3 filename many be encoded when saved in beats file, e.g. ampersand character
        //   so decode it for display and comparison inside the program
        const embFile = he.decode(args[1])
        // eslint-disable-next-line no-unused-vars
        const localBeatsFile = he.decode(path.basename(args[6]))
        let bpm, spotifySongId
        let tags = ''
        let seqExists = false
        let mp3Exists = false
        try {
          bpm = args[0].match(/bpm="(.*)"/)[1]
        } catch (e) {
          bpm = '<no beats>' // this should never happen!
        }
        try {
          spotifySongId = args[0].match(/spotifySongId="(.*)"/)[1]
        } catch (e) {
          spotifySongId = ''
        }
        const baseName = path.basename(args[1], path.extname(args[1]))
        const seqFile = baseName + '.seq'
        let link = args[2] // can be same as mp3URL, or undefined... in that case, will be assigned folder pointer on hard drive below
        if (playable[args[1]]) { // if there is a playable mp3 file in settings
          // Scenario: it's always possible there could be 2 copies of a music file w/same name, different path
          // Scenario: user built the beats and/or sequence based on a Music folder song, then moved that mp3 elsewhere on their system.
          //   -- then they Browse for the file, and it will be found and be able to be loaded in the grid.
          // If the user loaded the file with Browse button on Songs tab, then the exact one they used is saved in settings (playables)
          // So we check first when building the grid if they browsed for their copy of the file.
          // Then we fall back to user Music folder.
          mp3Exists = !!fs.existsSync(path.join(playable[args[1]], args[1])) // value is folder, key is filename
          if (mp3Exists) link = playable[args[1]]
          if (!mp3Exists) { // it's not where it was once found any more, is it in Music?
            mp3Exists = !!fs.existsSync(path.join(MUSICFOLDER, embFile))
            if (mp3Exists) link = MUSICFOLDER
          }
        } else {
          mp3Exists = !!fs.existsSync(path.join(MUSICFOLDER, embFile))
          if (mp3Exists) {
            link = MUSICFOLDER
          }
        }
        seqExists = !!fs.existsSync(path.join(RMDIR, that.RMEFolder, 'secuencias_para_canciones', seqFile))

        function lookin2 (args) { // helper
          // find tags if any
          try {
            tags = args[0].match(/tags="(.*)"/)[1] || ''
          } catch (e) {
            tags = ''
          }
        } // end of helper lookin2

        replace.sync({ // don't need results
          files: path.join(RMDIR, that.RMEFolder, 'secuencias_para_canciones', seqFile),
          from: /<author.*(tags="(.*)")?>.*<\/author>/gi,
          to: (...args) => lookin2(args),
          dry: true
        })
        if (spotifySongId) {
          if (dictSpotifySongId[spotifySongId]) that.$bvModal.msgBoxOk('WARNING: Duplicate Spotify songID: ' + spotifySongId, { title: 'Duplicate Spotify ID error' })
          dictSpotifySongId[spotifySongId] = embFile
        }
        that.beatsFiles.push({ filename: embFile, tags: tags, bpm: bpm, link: link, mp3URL: args[2], spotifySongId: spotifySongId, seqExists: seqExists, mp3Exists: mp3Exists })
      } // end of helper "lookin"

      this.beatsFiles = [] // here we put all the beats files we have
      // replace-in-file used READONLY in this case,
      // to search the beats xml files for a "buy song" url: authorAndSongURL

      // not matching WINDOWS CRLF EOL: https://unix.stackexchange.com/questions/323343/how-to-handle-crlf-line-endings-in-grep
      // ...grep will only buffer lines terminated by \n, whereas \r does not terminate a line from the buffering standpoint.
      // note: \s between lines matches linux EOL, \s+ matches windows as well
      // eslint-disable-next-line no-unused-vars
      const results = replace.sync({
        files: path.join(RMDIR, 'compases_para_canciones', '*.xml'),
        from: /<musicfile.*">([^<]*)<\/musicfile>\s+.*authorAndSongURL.*>(http[^<]*)?(.+)?<\/authorAndSongURL>/gi,
        to: (...args) => lookin(args), // here the beatsFiles array is populated
        dry: true // dry-run, no real replace happens!
      })
      if (this.beatsFiles.length !== results.length) {
        const diff = results.map(r => path.basename(r.file, '.xml')).filter(b => !this.beatsFiles.map(f => path.basename(f.filename, path.extname(f.filename))).includes(b))
        this.$bvToast.toast('Beats files with invalid content: ' + diff.join('//'), { title: 'Error' })
      }
      this.totalRows = this.beatsFiles ? this.beatsFiles.length : 0
    },
    tdBpm (value, key, item) {
      const getBg = (value) => {
        if (value <= 172) return '#AAE68A' // light green
        if (value <= 192) return '#E6DC8A' // light yellow
        if (value <= 210) return '#E6B38A' // light orange
        else return '#FC8383' // light red
      }
      return { style: 'background-color : ' + getBg(value) + ';' }
    },
    tdTags (value, key, item) {
      const getBg = (value) => {
        if (value === '' && !item.seqExists) return '#E3DFDF' // grey
        else return '#8ABCE6' // light yellow
      }
      const getTitle = value => {
        const howTo = `Load song.  On Songs workbench, click on Call sequence.
Build a sequence of calls, then add tags to it. \nTag Examples: 'Beginners', 'Lesson2', 'Thursday'.
Tags field may be up to 20 chars.  Then, use tags to filter your prepared songs here.`
        if (!item.seqExists) {
          return 'No sequence exists yet!\n' + howTo
        } else if (value === '') {
          return 'Sequence exists, but no tags\n' + howTo
        } else return 'Sequence exists, with tags\n' + howTo
      }
      return { title: getTitle(value), style: 'background-color : ' + getBg(value) + ';' }
    },
    onFiltered (filteredItems) {
      if (this.totalRows !== filteredItems.length) {
        this.totalRows = filteredItems.length
        this.currentPage = 1
      }
    },
    opn (event) {
      this.$electron.shell.openExternal(event)
    }
  }
}
</script>

<style scoped>
    /* .fa-icon {
        background-color: white;
        padding: 1.5px;
    } */

</style>
