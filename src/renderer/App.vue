 /*  so far doesn't seem to be necessary to put in comment delimiters outside tags in vue files
might need:
 moves not used in any sequence
 list of sequences

done: rationalize buttons on Get Scheme
done: shorten the scheme name, exclude the "scheme_" prefix
done: BUG: play song, change scheme. wave is empty, grid is empty - But song and calls will play weirdly

-- COMBOS features ---
TODO: 1x at start: backup data files!
TODO: Loading a scheme: ensure "Continue" move exists( & 4 countdown? ).  It's used as start of new Combo.
TODO: what is WITH the quotes in the combos???
TODO: include filter for Moves, and one for Combos - checkbox for each item
TODO: change scheme while on combos... breaks.  On ch scheme, reset the flag to show the graph
TODO: what is currentItem when using Combos?
TODO: combos for cuerpo: add like rueda flaca, gorda
TODO: propagate move name changes to combos.  And disallow deletes if in combo

--- updates ---
TODO: add "get program update" to Landing page
TODO: zero length moves, to add e.g. "Piso" in a guapea _OR maybe not neeeded, just add a call

--- cross-purpose features ----
TODO: scheme management page, list, show desc, allow rename and delete
TODO: SEQ management page, list, show desc, allow rename and delete (if there are multiple seq for same song)
TODO: (folder-hash) Has a scheme been customized?  move to [scheme]_rc_2019_07_22_hh SEQ_upgrade management + lose the warning about overwrite
TODO: (folder-hash)has a DL'd SEQ been customized? move to [song]_rc_2019_07_22_hh multiple SEQ files + lose the warning about overwrite

--- docs ---
TODO - docs, short movies
--- misc ---
TODO - some visibility when there are calls after the end of the beats provided

*/
<template>
  <div class="h-100" title="Hover over controls for info!">
    <!-- rule is in eslint-plugin-vue: html-self-closing -->
    <b-navbar
      toggleable="lg"
      type="dark"
      variant="success">

      <b-navbar-brand
        href="#">
        <span>RuedaMatic</span>
      </b-navbar-brand>

      <!-- <b-collapse id="nav_collapse" is-nav> -->

        <b-navbar-nav>
          <b-nav-item :active="activeTab==='Dashboard'" @click="activeTab='Dashboard';navToLanding()" title="Overview of the loaded scheme, the program version, and the operating system."><strong>Dashboard</strong></b-nav-item>
          <b-nav-item :active="activeTab==='Moves'" @click="activeTab='Moves';navToMoves()"
              v-show="$store.state.settingsStore.settings.userType === '2'" title="Each scheme has a set of moves that work with that scheme.
You will be able to assign moves on the Songs tab, but only if each move is set up on the Moves tab."><strong>Moves</strong></b-nav-item>
          <b-nav-item :active="activeTab==='Songs'" @click="activeTab='Songs';navToSongs()" title="Lists beats files in folder 'compases_para_canciones' and any you load via Browse.
Program finds beats and gears for a song, results are indicated in the table below.
If there is a call sequence for the song, that is also shown.  Load the song, and calls will be heard when the song plays."><strong>Songs</strong></b-nav-item>
          <b-nav-item :active="activeTab==='Get More'" @click="activeTab='Get More';navToGetData()" title="Get latest schemes, call sequences, sample songs."><strong>Get More</strong></b-nav-item>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <!-- Navbar dropdowns -->
          <b-nav-item-dropdown
            id="scheme-dd"
            title="Scheme (a set of moves) to load and use."
            :text="CurrentSchemeForGUI"
            right>
            <b-dropdown-item v-for="scheme in GUIfiedSchemes" :key="scheme" @click="clickScheme(scheme)" :active="scheme===CurrentSchemeForGUI">
              {{scheme}}
            </b-dropdown-item>
          </b-nav-item-dropdown>
          <!-- don't show the language dropdown, test only and Moves tab only for now -->
          <b-nav-item-dropdown v-if=false
            id="lang-dd"
            title="Choose language (Moves tab only!)"
            text="Lang"
            right>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='en'">en</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='fr'">fr</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='es'">es</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='it'">it</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='ru'">ru</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='uk'">uk</b-dropdown-item>
            <b-dropdown-item
              to="#"
              @click="clickLang" :active="$i18n.locale==='zh-CN'">zh-CN</b-dropdown-item>
          </b-nav-item-dropdown>

          <b-nav-item-dropdown id="user-dd" right v-model="userType" title="Normally Caller, change to Wizard to work on beats/schemes">
            <!-- Using button-content slot -->
            <template slot="button-content">
              <span style="font-weight: bold;">{{parseInt(userType) === 1?"Caller":"Wizard"}}</span>
            </template>

            <b-dropdown-item id="1" @click="onClickUser" :active="userType==='1'">Caller</b-dropdown-item>
            <b-dropdown-item id="2" @click="onClickUser" :active="userType==='2'">Wizard</b-dropdown-item>
          </b-nav-item-dropdown>

        </b-navbar-nav>

      <!-- </b-collapse> -->

    </b-navbar>
    <b-modal title="Danger!" id="wizardWarning" ok-only>
      <p>Beginning users should choose the Caller setting.</p>
      <p>Song sequences depend on valid beats and scheme data, visible only under the Wizard setting.</p>
      <p>Invalid changes to Wizard data can make Sequences unplayable!</p>
    </b-modal>
    <b-modal title="Change to schemes and data installed" id="newSchemesInstalled" ok-only>
      <p class="my-4">If you don't see an update, just restart RuedaMatic Editor.</p>
    </b-modal>

    <!-- busyModal can be displayed and hidden via flag: store.state.movesStore.showBusy -->
    <b-modal title="Please wait a moment while we get that for you..." v-model="bBusy">
      <div>
        <pulse-loader color="red" style="height: 64px;display: flex;align-items: center;justify-content: center" />
      </div>
        <!-- dummy slot use to stop buttons showing -->
        <div slot="modal-footer" class="w-100">
      </div>
    </b-modal>
    <!-- routed page change uses an animation; also keep-alive is set on all tabs here -->
    <transition
      name="slide"
      mode="out-in">
      <keep-alive>
        <router-view/>
      </keep-alive>
    </transition>
  </div>
</template>

<script>
import klawSync from 'klaw-sync' // file system walker
import path from 'path'
import electron from 'electron'
import fs from 'fs-extra'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
export default {
  name: 'RuedamaticEditor', // default name hardcoded here
  data () {
    return {
      activeTab: 'Dashboard',
      pendingFolderChange: ''
    }
  },
  mounted: function () {
    // hate to get that dragging image when all you want is to click
    var links = document.getElementsByClassName('nav-link')
    // this hyperefficient version (from stack overflow) is TOO ARCANE!
    // for (var i = links.length; i--; links[i]['draggable'] = false) {}
    // ... so this is better
    for (var i = links.length - 1; i >= 0; i--) {
      links[i].draggable = false
    }
    this.updateInstalledSchemes()
  },
  computed: {
    userType () {
      return this.$store.state.settingsStore.settings.userType
    },
    bBusy () {
      return this.$store.state.movesStore.showBusy
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    CurrentSchemeForGUI () {
      if (this.RMEFolder) return this.RMEFolder.substring(7) || ''
      return ''
    },
    GUIfiedSchemes () {
      return this.showSchemes.map((item) => {
        if (item.substring(0, 7).toLocaleLowerCase() === 'scheme_') {
          return item.substring(7)
        } else {
          return item
        }
      })
    },
    showSchemes () {
      const schemes = this.$store.state.movesStore.installedSchemes
      if (schemes.length > 0) {
        return schemes
      } else {
        return ['No schemes installed!']
      }
    },
    bUpdateInstalledSchemes () {
      return this.$store.state.movesStore.bUpdateInstalledSchemes
    }
  },
  watch: {
    bUpdateInstalledSchemes (val) {
      this.$store.commit('UNSET_BUSY_NOTICE')
      this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', false)
      this.updateInstalledSchemes()
      this.$bvModal.show('newSchemesInstalled')
    }
  },
  methods: {
    navToLanding () { this.$router.push({ name: 'landing-page' }) },
    navToMoves () { this.$router.push({ name: 'moves' }) },
    navToSongs () { this.$router.push({ name: 'songs' }) },
    navToGetData () { this.$router.push({ name: 'get-data' }) },
    updateInstalledSchemes () {
      const filterFn = item => {
        const basename = path.basename(item.path)
        // base name hardcoded here
        return basename.indexOf('scheme_') === 0
      }
      fs.ensureDir(RMDIR)
      // nofile: return only directories
      try {
        const rmeFolders = klawSync(RMDIR, { nofile: true, filter: filterFn })
        const installedSchemes = rmeFolders.map(item => path.basename(item.path))
        this.$store.commit('BUFFER_INSTALLED_SCHEMES', installedSchemes)
        this.$store.commit('INIT_SETTINGS_DATA')
        this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
        this.$store.commit('ORIGINAL_MOVE_STATE', this.RMEFolder)
      } catch (e) {
        console.log(e.message)
      }
    },
    clickLang (event) { this.$i18n.locale = event.target.innerHTML.trim() },
    clickScheme (schemeGUIname) {
      this.pendingFolderChange = 'scheme_' + schemeGUIname
      this.onSchemeChange()
    },
    onSchemeChange () {
      this.$store.commit('CHANGE_RME_FOLDER', this.pendingFolderChange)
      // one safety check: in case scheme was acquired with no SEQ files, ADMZIP probably dropped the folder
      // ensure folder exists
      fs.ensureDir(path.join(RMDIR, this.pendingFolderChange, 'secuencias_para_canciones'))
      // ok, now we gotta change all the dependent things
      this.$store.commit('INIT_SETTINGS_DATA')
      this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
      this.$store.commit('ORIGINAL_MOVE_STATE', this.RMEFolder)
    },
    onClickUser (event) {
      if (event.target.id === '1') {
        this.$store.commit('CHANGE_USERTYPE', '1')
      } else if (event.target.id === '2') {
        this.$bvModal.show('wizardWarning')
        this.$store.commit('CHANGE_USERTYPE', '2')
      } else {
        console.log('ERR in USER select: selection not handled')
      }
    }
  }
}
</script>

<style scoped>
    .slide-enter-active {
        animation: slide-in 200ms ease-out forwards;
    }

    .slide-leave-active {
        animation: slide-out 200ms ease-out forwards;
    }

    @keyframes slide-in {
        from {
            transform: translateY(-30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slide-out {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-30px);
            opacity: 0;
        }
    }
</style>
