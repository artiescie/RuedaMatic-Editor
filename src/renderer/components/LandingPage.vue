<template>
  <div id="wrapper">
    <!--<img id="logo" src="~@/assets/logo.png" alt="electron-vue">-->
    <table>
      <tr>
        <td height="120">
          <object
            height="100%"
            type="image/jpeg"
            data="static/rueda4_fill.jpg">
          </object>
        </td>
        <td title="😁 Perfect timing of reuda calls... plus...
😆 Tighten moves, less guapea, no caller stress... plus...
😎 Experience dancing rueda WITH the music for a change...
      ...  RuedaMatic ticks all the boxes for you!">
          <h1>RuedaMatic Editor</h1>
          <h6><v-icon  class="m-1" color="green" name="check-square"/><v-icon  class="m-1" color="green" name="check-square"/><v-icon  class="m-1" color="green" name="check-square"/><em>... for rueda that ticks all the boxes</em></h6>
        </td>
      </tr>
    </table>

    <main>
      <div>
        <div><p>Wizard or Caller level?  Set that in the top right corner!</p></div>
        <div title="Click navbar 'User' to change!" class="title">As a Wizard:<em>Lay the foundation</em></div>
        <b-card class="my-0" bg-variant="dark" text-variant="white">
          <p class="card-text">
            <ul>
              <li><p class="card-text">Use or make Schemes: complete set of moves for a specific style</p></li>
              Possible schemes a teacher could make: Beginner, Advanced, Salsa Suelta, <br>Mixta, Torno, Wheelchair Rueda, etc., etc...
              <li><p class="card-text">Beats files: record the rhythm - done once for all schemes</p></li>
            </ul>
          </p>
        </b-card>
        <div title="Click navbar 'User' to change!" class="title">As a Caller:<em>Choose the moves to call</em></div>
        <b-card class="my-0" bg-variant="dark" text-variant="white">
          <ul>
            <li><p class="card-text">KEEP REVIEWING as you add rueda calls</p></li>
            <li><p class="card-text">MATCH calls to song dynamics (gears and verses)</p></li>
          </ul>
        </b-card>
        <b-container>
          <b-row>
            <b-col>
              <b-button variant="success"
                style="margin:0px;padding:6px 12px;border:1;"
                @click="open('http://come2think.com/RuedaMatic/')">RuedaMatic docs
              </b-button>
            </b-col>
          </b-row>
        </b-container>
      </div>

      <div>
        <system-information/>
      </div>
    </main>
    <b-modal :title="RMEFolder? RMEFolder.substring(7) : 'no folder selected'" v-model="bShowConfigProblem" @ok="getData('sample.zip')">
       <p class="my-4">The data folder "{{RMEFolder ? RMEFolder.substring(7) : ''}}" and subfolders were not found.  </p>
      <div v-if="schemesCount === 0">
        <p>NOW: We'll get the basic rueda scheme for you... </p>
        <p><em>Including a sample music file for your Music folder "RM Sample.mp3"... Load it from your Music folder to experiment!</em></p>
        <p>Click OK to continue... </p>
      </div>
      <div v-else>
         <p>Select an installed scheme in the dropdown list.</p>
      </div>
    </b-modal>
  </div>
</template>

<script>

import SystemInformation from './LandingPage/SystemInformation'
import DiscDataHelper from '../store/shared/DiscDataHelper.js'
import path from 'path'
import electron from 'electron'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'

const discDataHelper = new DiscDataHelper()

export default {
  data () {
    return {
      bShowConfigProblem: false
    }
  },
  name: 'LandingPage',
  components: { SystemInformation },
  created: function () {
    try {
      this.$store.commit('INIT_SETTINGS_DATA') // checks if needed
      this.bShowConfigProblem = true // default til tested
      if (this.RMEFolder) {
        if (discDataHelper.fileExists(path.join(RMDIR, this.RMEFolder, 'vueltas'))) {
          this.bShowConfigProblem = false
        }
      } else {
        discDataHelper.ensureSchemeFoldersExist(this.RMEFolder) // after rme folder is SET
        this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
        this.$store.commit('ORIGINAL_MOVE_STATE', this.RMEFolder)
      }
    } catch (error) {
      this.bShowConfigProblem = true // mounted hook will show
    }
  },
  // mounted: function () {
  //   if (this.bShowConfigProblem) {
  //     this.$bvModal.show('configProblem')
  //   }
  // },
  computed: {
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    schemesCount () {
      const schemes = this.$store.state.movesStore.installedSchemes
      return schemes.length
    }
  },
  methods: {
    getData (scheme) {
      if (this.schemesCount === 0) {
        this.$store.commit('SET_BUSY_NOTICE')
        discDataHelper.getData(scheme, this.setRefreshSchemesFlag)
      }
    },
    setRefreshSchemesFlag () {
      // pass this to discDataHelper to call when done with update
      this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
    },
    findLinksHelper () {
      // this.$store.getters
      console.log('clicked findLinksHelper!')
    },
    open (link) {
      this.$electron.shell.openExternal(link)
    }
  }
}
</script>

<style scoped>
/* @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro'); */

* {
  box-sizing: border-box;
  margin: 9px;
  padding: 0px;
}

body {
  font-family: "Source Sans Pro", sans-serif;
  line-height: 1.3px;
}

main {
  display: flex;
}

.title {
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
}

.title.alt {
  font-size: 18px;
  margin-bottom: 10px;
}

.doc p {
  color: black;
  margin-bottom: 10px;
}

.doc button {
  font-size: 0.8em;
  cursor: pointer;
  outline: none;
  padding: 0.75em 2em;
  border-radius: 2em;
  display: inline-block;
  color: #fff;
  background-color: #4fc08d;
  transition: all 0.15s ease;
  box-sizing: border-box;
  border: 1px solid #4fc08d;
}

.doc button.alt:hover {
  color: #42b983;
  background-color: transparent;
}
</style>
