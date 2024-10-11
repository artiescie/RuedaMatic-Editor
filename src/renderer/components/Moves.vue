<i18n src='./Moves/Moves.yaml'></i18n>
<!--
i18n trial case for translations, works ok but not followed up!  Not a priority...
 to use:
   in html, text: {{ $t('length') }}
   in html, custom directive: v-t="'save_the_moves'"
   in javascript: label: this.$i18n.t('col_move_name'),
 to automate, these are in the Google Sheets add-ons shop:
   Add-on Easy Localization by www.modernalchemy.de (execute Google translate, leaving non-empty cells)
   Add-on Java Translations Tool by simon.niederberger (downloads zip of java properties files, to convert to yaml)
 this is on github:
     (this script) prop2yaml.js to convert zipped props to required i18n yaml files
 e.g.
    node ~/Development/IdeaProjects/command-line-js/prop2yaml.js ~/Downloads/Moves.zip src/renderer/components/Moves/
-->
<template>
  <div id="wrapper">
    <b-container fluid>
      <simplert :useRadius="true" :useIcon="true" ref="simplert" />
      <!-- simple editing of beats in one of their manifestations: beat time, gear, move -->
      <b-card>
        <div>
          <input type="radio" id="moveMode" value="moveMode" v-model="modePerRadios">
          <label for="timeMode" title="Moves for this scheme">Moves</label>
          <input type="radio" id="comboMode" value="comboMode" v-model="modePerRadios">
          <label for="comboMode" title="Combos of moves in this scheme">Combos</label>
          <b-btn v-if="!!visibleMoves && !comboFlowShown" variant="success" class="m-1" @click="addNew" title="Create New Move/Combo">Create New
          </b-btn>
          <span class="float-right">{{ RMEFolder }}: <em>by {{ schemeProvider}}, {{ schemeDate }} </em></span>
        </div>
      </b-card>
      <br>

      <div v-if="!comboFlowShown" class="justify-content-center row">
        <!--filters and pagination-->

        <b-input-group label-cols="2" label="Search" class="col-6 my-0">
          <b-form-input :class="{'bg-warning': filter.length}" v-model="filter" ref="filtMovesCombos" placeholder="Search" />
          <b-input-group-append>
            <b-btn size="sm" style="height: 38px;width: 46px;" @click="filter=''">X</b-btn>
            <!-- clear the filter -->
          </b-input-group-append>
        </b-input-group>

        <b-form-fieldset label-cols="3" label="Rows per page" class="col-6">
          <b-form-select :options="[{text:10,value:10},{text:20,value:20},{text:50,value:50}]" v-model="perPage" />
        </b-form-fieldset>
      </div>

      <!-- MOVES table -->
      <b-table v-if="modePerRadios==='moveMode'" :items="visibleMoves" :fields="fields" :sort-compare="titleComparator"
        :filter-function="customFilterMoves" :current-page="currentPageMoves" :per-page="perPage" :filter="filter" primary-key="$.name"
        striped hover small @filtered="onFiltered" @row-clicked="rowClicked">
        <template v-slot:cell($.name)="row">
          <b-button size="sm" :title="row.item.$.name" :variant="row.item.$.demolink && row.item.$.demolink.substring(0,4)==='http' ? 'success': 'secondary'"
            @click="if (row.item.$.demolink && row.item.$.demolink.substring(0,4)==='http') open(row.item.$.demolink)"
          > {{row.value}}
          </b-button>
        </template>
        <template v-slot:cell($.lengthextendable)="row">
          <v-icon v-if="row.value" class="m-1" color="green" name="check-square"/>
          <v-icon v-else class="m-1" color="#ced4da" name="square"/>
        </template>
        <template v-slot:cell(actions)="row">
          <b-btn variant="warning" size="sm" @click="details(row.item)">Edit
          </b-btn>
          <b-btn variant="danger" size="sm" @click="showDeleteDlg(row.item)">Delete
          </b-btn>
        </template>
      </b-table>

      <!-- COMBOS table, or container for mermaid display and edit -->
      <div v-if="modePerRadios==='comboMode'">
        <b-table v-if="!comboFlowShown" :items="comboList" ref="combosTable" :fields="comboFields" :filter-function="customFilterCombos"
          :filter-included-fields="['name']" :current-page="currentPageCombos" :per-page="perPage" :filter="filter"  primary-key="name"
          striped hover small @filtered="onFiltered" @row-clicked="rowClicked">
          <template v-slot:cell(actions)="row">
            <b-btn variant="warning" size="sm" @click="showFlow(row.item)">Details
            </b-btn>
          </template>
        </b-table>
        <b-card v-if="comboFlowShown" header-tag="header" tag="article" class="mb-2">
          <b-row title="Click on Edit Details to change this">
            <b-col>
              <h4>{{currentComboHdr.name}}</h4>
              <h6>{{currentComboHdr.description}}</h6>
              <!-- Removed from hints for mow: For moves with same 'equivalency', one is chosen at random.  The node shows '∈'. -->
              <p title="Build a tree of possible calls.  Used in automated move selection, see docs.
Then, on the Songs tab, select the combo.  You'll get a choice of results that fit the gears of the song.

LEARN BY DOING: Scroll zooms, Click-Scroll pans.
Click a node, and set a move.
Or: delete it and its subtree, or extend with extra beats.
Extended beats: if you set a min and max, any length in the range could be selected.  The node then shows [min-max].
Suggest a move in your combo for an 'upshift' (spicy/climax) beat in the song.  The node shows '🔥'.
A move is created with a level, shown here as ⓵ to ⓺.
To build trees, add child moves to a node (Add Next).
More than 1 child means the combo will choose one of the possible branches.
Add a weight to a child (click), and random selection is influenced by relative weight of each branch.">
                <em>STARTUP: {{currentComboHdr.startup}}&nbsp;&nbsp;&nbsp; |&nbsp;&nbsp;&nbsp;
WEIGHT: {{currentComboHdr.weight}}&nbsp;&nbsp;&nbsp; |&nbsp;&nbsp;&nbsp; LENGTH min: {{currentComboHdr.minLength}} max: {{currentComboHdr.maxLength}}
                      &nbsp;&nbsp;&nbsp;  ||</em><strong>&nbsp;&nbsp;&nbsp;&nbsp;(HOVER here for tips!)</strong>
              </p>
            </b-col>
            <b-col cols="3" class="ml-auto">
              <b-button variant="warning" @click="editComboHeader" title="Change combo name, weight, startup flag, description">Edit Details</b-button>
              <b-button size="sm" variant="success" @click="testCombo(currentComboHdr)"
                 title="Test how well this combo fits songs available in the system" :disabled="graphReady">Test</b-button>
            </b-col>
          </b-row>
          <b-card-body style="padding:0rem" id="mermaid-graph">
            <RMMermaid @nodeClick="nodeClick" :graph-data="graphForMermaid" title="Click a node for edits and info!"/>
            <b-button variant="success" @click="comboFlowShown = false" title="Close this detail and see list of all Combos">
              <v-icon class="m-1" name="angle-left" />Back to List
            </b-button>
            <b-button variant="danger" @click="deleteCombo" title="Delete this entire combo (final)">Delete Combo</b-button>
          </b-card-body>
        </b-card>
      </div>
      <div v-if="modePerRadios==='moveMode' && !comboFlowShown" class="justify-content-center row my-1">
        <b-pagination :total-rows="totalRowsMoves" :per-page="perPage" v-model="currentPageMoves" size="md" />
      </div>
      <div v-if="modePerRadios==='comboMode' && !comboFlowShown" class="justify-content-center row my-1">
        <b-pagination :total-rows="totalRowsCombos" :per-page="perPage" v-model="currentPageCombos" size="md" />
      </div>

      <!--the modal: edit a move -->
      <!--v-if prevents error on startup-->
      <b-modal size="lg" v-if="currentItem" v-model="modalEditShown" :ok-disabled="bEditMoveOKDisabled()"
        :title="getEditDlgTitle()" close-title="Cancel" @ok="checkForIrregularBeat" @hide="removeDlgAlerts()"
        @shown="$refs.moveName.focus()">
        <b-alert v-model="alertPollyServerError" variant="danger" dismissible>
          Polly server timeout.  Please try again!
        </b-alert>
        <b-alert v-model="alertPollyServerNoContinue" variant="danger" dismissible>
          Not allowed: 'Continue' move name is reserved by the system.  A typical call for the purpose could be 'Sigue'.
        </b-alert>
        <b-alert v-model="alertNameGeneral" variant="danger" dismissible>
          Not valid yet.  Hover for tips!
        </b-alert>
        <b-alert v-model="alertNameUnique" variant="danger" dismissible>
          Name conflict with existing Move {{ currentItem.$.name }}. You could rename/delete the original, then
          continue.
        </b-alert>
        <div id="waveform" title="Important: minimize opening silence.  Also, trim length, and check loudness." >
          <pulse-loader v-if="bLoading" color="red" style="height: 64px;display: flex;align-items: center;justify-content: center" />
        </div>
        <b-form-fieldset :variant="valnName() ? 'primary':'danger'" title="Move name - 3-50 chars, capitalize first letter.  No quotes, braces or square brackets.
No double space, or dash.  If there's descriptive text after the bare name, not part of the actual call - place in parentheses '()'.
Use proper diacritics [áéíóúñ].
Accents are important for Polly AI to pronounce Spanish words correctly!
You can use copy/paste from https://blog.busuu.com/spanish-accents/"
          label="Name:">
          <b-form-input ref="moveName" :variant="valnName() ? 'primary':'danger'" v-model="currentItem.$.name"
            type="text" />
        </b-form-fieldset>
        <b-form-fieldset ref="file" :variant="valnFile() ? 'primary':'danger'" title="Sound file (MP3) with actual call.  Should be found in the &quot;vueltas&quot; folder.
If button is red, change to a valid file.
The same call file might be used for separate moves, each with different context.
To create the sound file: choose Polly (automated) or Audacity (must first install to use).">
          <b-row>
            <b-col sm="3">
              <b-button :variant="valnFile() ? 'primary':'danger'" @click="chooseFile(currentItem.$.file)">
                Choose call file:
              </b-button>
            </b-col>
            <b-col sm="5">
              <span variant="primary"><em><strong>'{{ currentItem.$.file }}'</strong></em></span>
            </b-col>
            use:
            <b-col sm="1">
              <b-button :disabled="!valnName()"
                title="EASY: AWS 'Polly' will read your call as named.
Overwrites any existing file" @click="createWithPolly">
                Polly
              </b-button>
            </b-col>
            <b-col sm="1">
              <b-button title="HARD: Install Audacity if you want to create all your own calls.
Export as MP3, make sure it's trimmed of blank sound, and saved in the vueltas folder."
                @click="editWithAudacity">
                Audacity
              </b-button>
            </b-col>
          </b-row>
        </b-form-fieldset>
        <b-row>
          <b-col>
            <b-form-fieldset ref="length" :variant="valnLength() ? 'primary':'danger'"
              title="No of measures (counting 8 beats per measure) to complete the BASIC move."
              label-cols="5" label="Length: ">
              <!-- stop decimal (190, 110) -->
              <b-form-input class="mt-1 ml-sm-2 mb-sm-0" :variant="valnLength() ? 'primary':'danger'" v-model="currentItem.$.length" size="sm" type="number" min="0" max="20"
                @keydown.native.190.prevent @keydown.native.110.prevent />
            </b-form-fieldset>
          </b-col>
          <b-col>
            <b-form-fieldset ref="level" title="Level of this move (also used by automated combos)" label-cols="3"
              label="Level:">
              <b-form-input class="mt-1 ml-sm-2 mb-sm-0" type="number" size="sm" min="1" max="6" v-model="currentItem.$.level" />
            </b-form-fieldset>
          </b-col>
          <b-col>
            <b-form-fieldset ref="delaycount" :variant="valnDelayCount() ? 'primary':'danger'"
              title="No. of beats delayed (for calling a bit late).  This will usually be blank (zero)"
              label-cols="4" label="Delay: ">
              <b-form-input class="mt-1 ml-sm-2 mb-sm-0" :variant="valnDelayCount() ? 'primary':'danger'" v-model="currentItem.$.delaycount"
                size = "sm" type="number" min="0" max="7" @keydown.native.190.prevent @keydown.native.110.prevent />
            </b-form-fieldset>
          </b-col>
        </b-row>
        <b-form-fieldset label-cols="4" label="Comment: ">
          <b-form-textarea rows="3" v-model="currentItem.comment[0]" type="text" />
        </b-form-fieldset>
        <b-form-fieldset title="Where to see a demo of this move: YouTube, or any other URL">
          <b-row  class="ml-1" cols="4">
            <span>Demo URL:</span>
            <b-col cols="9">
              <b-form-input size="sm" ref="moveLink" :variant="valnName() ? 'primary':'danger'" v-model="currentItem.$.demolink"
                type="text" />
            </b-col>
            <b-col cols="1">
              <b-button title="View this URL"
                @click="open(currentItem.$.demolink)"
              > View
              </b-button>
            </b-col>
          </b-row>
          <hr>
          <b-row class="bg-warning" title="If this move is to be used in RM-Spot, web app, for automatic generation of rueda calls">
            <b-col cols="4" class="mt-1 ml-sm-2 mb-sm-0">
              <em>For automatic calling only:</em>
            </b-col>
            <b-col>
              <b-form-fieldset title="Extendable: Can the move just continue until caller ends it?" label-cols="7"
                label="Extendable:">
                <b-form-checkbox ref="lengthextendable" size="lg" class="mt-1 ml-sm-2 mb-sm-0" v-model="currentItem.$.lengthextendable" />
              </b-form-fieldset>
            </b-col>
            <b-col>
              <b-form-fieldset ref="equivalency" title="Equivalency: moves with identical equivalence value can be automatically interchanged" label-cols="8\7"
                label="Equivalence:">
                <b-form-input class="mt-1 ml-sm-2 mb-sm-0" type="number" size="sm" min="1" max="33" v-model="currentItem.$.equivalency" />
              </b-form-fieldset>
            </b-col>
            <b-col>
              <b-form-fieldset ref="setupbars" title="Setup bars: for extended moves, how many setup measures
are used to prepare for the main move (usu. 0 or 1).
E.g. enchufla is used to setup the tumba francesa move, and the setup takes 1 measure"
                 label-cols="7" label="Setup bars:">
                <b-form-input class="mt-1 ml-sm-2 mb-sm-0" type="number" size="sm" min="0" max="3" v-model="currentItem.$.setupbars" />
              </b-form-fieldset>
            </b-col>
          </b-row>
        </b-form-fieldset>
      </b-modal>
<!-- modals related to move edits -->
      <b-modal v-model="showLengthWarning" title="Sequence Files Problem!" okOnly>
        <p class="my-4">Downstream files use this move -- remove and fix sequence. </p>
        <p>You will need to remove this move from the following sequence files, before changing the length.  Then do any fix-up later!</p>
        <ul>
          <li v-for="(item, index) in seqFilesAffected" :key="index">
            {{item}}
          </li>
        </ul>
      </b-modal>
      <b-modal id="dlgModifyFiles" title="Sequence Files Affected Warning!" @ok="modifyFilesBeforeSaveEditedMove">
        <p class="my-4">Downstream files are affected. </p>
        <p>Do you want to change SEQ files as well? Or cancel the name change?</p>
        <p>IF YOU GO AHEAD: Be aware - SEQ files NOT present on this computer are NOT fixed.</p>
        <ul>
          <li v-for="(item, index) in seqFilesAffected" :key="index">
            {{item}}
          </li>
        </ul>
      </b-modal>
      <b-modal id="filesInfoNoDelete" title="Files Affected Warning!">
        <p class="my-4">You have sequence files using this move:  {{currentItem && currentItem.$.name || ["error"]}}</p>
        <p>Wherever this move is used in these sequences, remove or change it. Then you can delete it here.</p>
        <ul>
          <li v-for="(item, index) in seqFilesAffected" :key="index">
            {{item}}
          </li>
        </ul>
      </b-modal>
      <b-modal id="combosInfoNoDelete" title="Combos Affected Warning!">
        <p class="my-4">You have combos using this move:  {{currentItem && currentItem.$.name || ["error"]}}</p>
        <p>Wherever this move is used in these combos, remove or change it. Then you can delete it here.</p>
        <ul>
          <li v-for="(item, index) in comboFilesAffected" :key="index">
            {{item}}
          </li>
        </ul>
      </b-modal>
      <b-modal id="modalPicker" v-model="modalPickerShown" v-if="currentItem" title="Pick a call file" ok-title="OK"
        @shown="$refs.filterInput.focus()">
        <b-container fluid>
          <b-row ref="filterRow">
            <b-col class="my-1" md="12" ref="filterCol">
              <b-form-group class="my-0" ref="filterGrp">
                <b-input-group>
                  <b-form-input v-model="callFilter" ref="filterInput" style="width: 300" placeholder="Search" debounce="400"/>
                  <b-input-group-append>
                    <b-btn :disabled="!callFilter" @click="callFilter=''">X</b-btn>
                    <!-- clear the filter -->
                  </b-input-group-append>
                </b-input-group>
              </b-form-group>
            </b-col>
          </b-row>
          <b-table ref="callsTable" striped small hover :items="callFiles" :filter-function="customFilterCallsPicker" :filter="callFilter"
            @row-clicked="onCallClicked">
          </b-table>
        </b-container>
      </b-modal>

      <!-- editing Combos -->
      <b-modal id="nodeEditSwitchboard" :title="'Editing move: ' + modalEditNodeTitle()" v-model="modalEditSwitchboardShown" :no-close-on-esc="true" ok-only ok-title="Close">
        <template v-slot:modal-ok>Cancel</template>
        <b-container fluid>
          <b-row class="mb-1">
            <b-col cols="6">Delete move, and its branch</b-col>
            <b-col>
              <b-button :disabled="currentEditNode === 'node2'" variant="danger"
                :title="currentEditNode === 'node2'?'First move may be changed... but not deleted!' :'... and following moves!'"
                @click="showDelNodeMsgbox">
                Delete
              </b-button>
            </b-col>
          </b-row>
          <b-row class="mb-1">
            <b-col cols="6">Change branch odds</b-col>
            <b-col>
              <b-button :disabled="nodeEditDisableWeight" variant="info"
                :title="nodeEditDisableWeight?'Disabled: No alternative branches':'Relative chance of this branch being called'"
                @click="nodeEditWeightVars.weightTemp = nodeEditWeightVars.weight; showWeightDlg=true">
                Chg Weight
              </b-button>
            </b-col>
          </b-row>
          <b-row class="mb-1">
            <b-col cols="6">Make move longer</b-col>
            <b-col>
              <b-button :disabled="nodeEditDisableExtraTime" variant="info"
                :title="nodeEditDisableExtraTime?'Disabled: Move length is non-variable':'How long can this move be extended?.  Generates more possibilities to fit the music.'"
                @click="nodeEditExtraTimeMaxTemp = nodeEditExtraTimeMax; nodeEditExtraTimeMinTemp=nodeEditExtraTimeMin; showExtraTimeDlg = true">
                Extra Beats Allowed
              </b-button>
            </b-col>
          </b-row>
          <!--
          <b-row class="mb-1">
            <b-col cols="6">Allow equivalent move</b-col>
            <b-col>
              <b-button variant="info" title="If this move has an equivalency value (see Moves) other moves
with the same equivalency may be substituted." @click="showAllowEquivalentDlg = true">
                Allow equivalent move
              </b-button>
            </b-col>
          </b-row>
          -->
          <b-row class="mb-1">
            <b-col cols="6">Suits an upshift beat (spicy)</b-col>
            <b-col>
              <b-button variant="info" title="This Move is allowed to fall on upshift.
Normally, combos won't extend past an upshift (e.g. climax, spicy)).
This goes toward 'dancing with the music' - an upshift in gear should always be recognized by the dancers.
So an upshift step should be for example, a high energy move." @click="showAllowUpshiftDlg = true">
                Ok for upshift beat
              </b-button>
            </b-col>
          </b-row>
          <b-row class="mb-1">
            <b-col cols="6">Change to different move</b-col>
            <b-col>
              <b-button variant="warning" @click="nodeMoveMode='changeMove'; $bvModal.show('modalEditNode')">Change move
              </b-button>
            </b-col>
          </b-row>
          <b-row class="mb-1">
            <b-col cols="6">Add next or alternative next</b-col>
            <b-col>
              <b-button variant="warning" @click="nodeMoveMode='addChild'; $bvModal.show('modalEditNode')"
                @shown="$refs.filterInput.focus()">Add next</b-button>
            </b-col>
          </b-row>
          <small><em>( {{currentEditNode}} )</em></small>
        </b-container>
      </b-modal>

      <!-- Combos header level details -->
      <b-modal id="modalEditComboHeader" v-model="modalEditComboHeaderShown" :ok-disabled="!valnComboHeader"
        title="Combo (should end in open rueda position!)" close-title="Cancel" @ok="persistComboHeader" @hide="removeDlgAlerts()"
        @shown="$refs.moveName.focus()">
        <b-alert v-model="alertNameUnique" variant="danger" dismissible>
          Name is not unique, already in use!
        </b-alert>
        <b-form-fieldset :variant="valnName() ? 'primary':'danger'"
          title="Combo name; Mixed case - Capitalize first letter. (At least 3 characters)."
          label="Name (capitalized, 3 char min): ">
          <b-form-input ref="moveName" :variant="valnName() ? 'primary':'danger'" v-model="tempCurrentComboHdr.name"
            type="text" />
        </b-form-fieldset>
        <b-form-fieldset label="Description: (at least 10 char)" title="Description of combo (at least 10 characters)">
          <b-form-textarea rows="3" v-model="tempCurrentComboHdr.description" type="text" />
        </b-form-fieldset>
        <b-form-fieldset title="Move is designed for dance startup, simple steps in open or closed position">
          <b-form-checkbox v-model="tempCurrentComboHdr.startup" >Startup: good for rueda startup (usually guapea, or al medio).</b-form-checkbox>
        </b-form-fieldset>
        <b-form-fieldset title="Weight (relative odds of picking this combo)"><b-form-group label="Relative weight in AUTOMATIC mode (0 means don't use in autofill):"
            label-for="cboWeight"
            label-cols-sm="6"
            label-cols-lg="10"
            content-cols-sm
            content-cols-lg="1">
          <b-form-input ref="cboWeight" v-model="tempCurrentComboHdr.weight"  min="0" max="20" type="number" /></b-form-group>
        </b-form-fieldset>
      </b-modal>
      <!-- modal to edit node on the Mermaid graph -->
      <b-modal size="lg" id="modalEditNode" v-model="modalEditNodeShown" :no-close-on-esc="true"
        :title="(nodeMoveMode==='changeMove'?'Changing move':'Add move after') + ': ' +  modalEditNodeTitle()"
        close-title="Cancel" @shown="$refs.filterInput.focus()" @hidden="moveFilterTemp=''" scrollable ok-only>
        <template v-slot:modal-ok>Cancel</template>
        <b-container>
          <b-row>
            <b-col class="my-1" md="12">
              <b-alert :show="nodeMoveMode==='changeMove'" variant="warning">REPLACE this move with...</b-alert>
              <b-alert :show="nodeMoveMode==='addChild'" variant="warning">FOLLOW this move with...</b-alert>
            </b-col>
            <b-col class="my-1" md="12" ref="filterCol">
              <b-form-group class="my-0" ref="filterGrp">
                <b-input-group>
                  <b-form-input v-model="moveFilterTemp" ref="filterInput" style="width: 300"
                    placeholder="Search" debounce="400" />
                  <b-input-group-append>
                    <b-btn :disabled="!moveFilterTemp" @click="moveFilterTemp = ''">X</b-btn>
                    <!-- clear the filter -->
                  </b-input-group-append>
                </b-input-group>
              </b-form-group>
            </b-col>
          </b-row>
          <!-- flowchart nodes (moves picker) -->
          <b-table ref="modalEditNodeCalls" v-model="lstModalDisplayedMoves" striped small hover :items="graphMoves"
            :filter="moveFilterTemp" :filter-function="customFilterMovesComboPicker" :fields="graphFields" @row-clicked="onNodeReplaceOrAdd"
            title="try: arrow down and enter key">
          </b-table>
        </b-container>
      </b-modal>
      <!-- mermaid graph edits -->
      <b-modal :title="'Weight of this branch: '  +modalEditNodeTitle()" v-model="showWeightDlg"
        :ok-disabled="!/^[0-9]{1,2}$/g.test(nodeEditWeightVars.weightTemp)"
        @ok="nodeEditWeightVars.weight=nodeEditWeightVars.weightTemp; setNodeWeight(); $bvModal.hide('nodeEditSwitchboard')">
        <b-form-fieldset
          title="Move weight - (1 to 20 rec)) a number for the likelihood of this branch being selected vs. siblings"
          label="Relative weight vs sibling branch: (0 to 20 rec.)">
          <b-form-input ref="nodeWeight" v-model="nodeEditWeightVars.weightTemp" type="text" />
        </b-form-fieldset>
      </b-modal>
      <b-modal :title="'Allow shift to \'climax\' or \'spicy\' here: ' + modalEditNodeTitle()"
        v-model="showAllowUpshiftDlg" @ok="updateNodeExtras(); $bvModal.hide('nodeEditSwitchboard')">
        <b-form-fieldset title="Allow move to fall on an UpShift in dancing intensity">
          <b-form-checkbox v-model="nodeEditAllowUpshift" >Allow this move to fall on a climax/spicy beat
             (the gear setting of the beat).  If a combo instance doesn't qualify, we'll avoid using it in the song if possible!.</b-form-checkbox>
        </b-form-fieldset>
      </b-modal>
      <b-modal :title="'Allow another move with same equivalency to be selected here: ' + modalEditNodeTitle()"
        v-model="showAllowEquivalentDlg" @ok="updateNodeExtras(); $bvModal.hide('nodeEditSwitchboard')">
        <b-form-fieldset title="Allow substitution of an equivalent move (this is a setting on the Move)">
          <b-form-checkbox v-model="nodeEditAllowEquivalent" >Allow an equivalent move to be substituted (a setting in the Move).</b-form-checkbox>
        </b-form-fieldset>
      </b-modal>
      <b-modal :title="'Stretch measures: ' +modalEditNodeTitle()" v-model="showExtraTimeDlg"
        :ok-disabled="!(/^[0-9]$/g.test(nodeEditExtraTimeMinTemp) && /^[0-9]$/g.test(nodeEditExtraTimeMaxTemp) && ((nodeEditExtraTimeMaxTemp >= nodeEditExtraTimeMinTemp) || nodeEditExtraTimeMaxTemp == 0))"
        @ok="nodeEditExtraTimeMax = nodeEditExtraTimeMaxTemp; nodeEditExtraTimeMin = nodeEditExtraTimeMinTemp; updateNodeExtras(); $bvModal.hide('nodeEditSwitchboard')">
        <b-alert show=true variant="info">
          Enter 0 (zero) in the MAX box to cancel extra time
        </b-alert>
        <b-form-fieldset title="Move extra measures range - minimum" label="Min extra measures: (0 to 9)">
          <b-form-input ref="nodeEditExtraTimeMin" v-model="nodeEditExtraTimeMinTemp" type="number" />
        </b-form-fieldset>
        <b-form-fieldset title="Move extra measures range - maximum" label="Max extra measures: (0 to 9)">
          <b-form-input ref="nodeEditExtraTimeMax" v-model="nodeEditExtraTimeMaxTemp" type="number" />
        </b-form-fieldset>
      </b-modal>
    </b-container>
  </div>
</template>

<script>
import Vue from 'vue'
import wget from 'wget-improved'
import DiscDataHelper from '../store/shared/DiscDataHelper.js'
import WaveSurfer from 'wavesurfer.js'
// eslint-disable-next-line no-unused-vars
import fs from 'fs-extra'
import path from 'path'
import _cloneDeep from 'lodash/cloneDeep'
import opn from 'opn'
import electron from 'electron'
import Differ from 'deep-diff'
import replace from 'replace-in-file'
import RMMermaid from './Moves/RMMermaid'
// eslint-disable-next-line no-unused-vars
import { toRegex, toString } from 'diacritic-regex'
import AutoFiller from './../components/Songs/AutoFiller'

// Pretty-printing is implemented natively in JSON.stringify(). The third argument enables pretty printing and sets the spacing to use:
// var str = JSON.stringify(obj, null, 2); // spacing level = 2

const discDataHelper = new DiscDataHelper()
const DLDIR = electron.remote.app.getPath('downloads')
const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = path.join(DOCDIR, 'RuedaMaticEditor')

let WAVESURFER // v2, new syntax

let waveSurferInitDone = false

export default {
  name: 'Moves',
  components: { RMMermaid },
  data () {
    return {
      tempReadonlyList: [], // might need to reset some RO SEQ files writable, then back to RO
      gateClosed: null, // debounce flag: see onNodeReplaceOrAdd
      bLoading: false,
      bLoadingSprites: false,
      valNameMaxLen: 45,
      valNameMinLen: 3,
      valComboDescMinLen: 10,
      modalEditComboHeaderShown: false,
      showLengthWarning: false,

      nodeMoveMode: 'changeMove', // or 'addChild' see modal nodeEditSwitchboard
      nodeEditDisableWeight: false,
      nodeEditDisableExtraTime: false,
      nodeEditExtraTimeMin: 0,
      nodeEditExtraTimeMinTemp: 0,
      nodeEditExtraTimeMax: 0,
      nodeEditExtraTimeMaxTemp: 0,
      nodeEditTextWithoutMinMax: '',
      nodeEditWeightVars: {}, // betw getter and setter of editNodeWeight, name: is node name, idx is index in the link array of that node, weight: is the weight
      nodeEditAllowUpshift: null,
      nodeEditAllowEquivalent: null,
      showExtraTimeDlg: false,
      showWeightDlg: false,
      showAllowUpshiftDlg: false,
      showAllowEquivalentDlg: false,

      alertPollyServerError: false,
      alertPollyServerNoContinue: false,
      alertNameGeneral: false,
      alertNameGeneralCombo: false,
      alertNameUnique: false,
      modalEditShown: false,

      moveFilter: '',
      moveFilterTemp: '',
      graphFields: [{ key: 'name', label: 'Name', sortable: true },
        { key: 'length', label: 'Length', sortable: true },
        { key: 'level', label: 'Lvl', sortable: true },
        { key: 'delaycount', label: 'Delay' },
        { key: 'lengthextendable', label: 'Ext', sortable: true },
        { key: 'equivalency', label: 'Eq', headerTitle: 'Interchangable moves are linked by the same Equivalence value (used by combos, automated calling)', sortable: true },
        { key: 'setupbars', label: 'Setup' },
        { key: 'comment', label: 'Comment' }],
      currentComboHdr: {},
      tempCurrentComboHdr: { name: '', description: '', startup: false, weight: 0, hasUpshift: false, maxLength: 0, minLength: 0 },
      currentEditNode: '',
      currentEditNodeDisableWeight: false,
      currentEditNodeDisableExtraTime: false,
      lstModalDisplayedMoves: [],
      comboFlowShown: false,
      modePerRadios: 'moveMode',
      modalPickerShown: false,
      modalEditNodeShown: false,
      modalEditSwitchboardShown: false,

      showDeleteAlert: false,
      detailClicked: false,
      currentItem: null,
      currentItemBeforeEdit: null,
      // variables for the b-table
      currentPageMoves: 1,
      currentPageCombos: 1,
      perPage: 10,
      filter: '',
      callFilter: '',

      locale: this.$i18n.locale, // used by i18n for initial display, but see watch on locale for changes
      seqFilesAffected: [], // by changing a move name, downstream seq files need changing
      seqFilesOldMoveName: '', // by changing a move name, downstream seq files need changing
      seqFilesNewMoveName: '', // by changing a move name, downstream seq files need changing
      seqFilesOldMoveLength: '', // by changing a move name, downstream seq files need changing
      seqFilesNewMoveLength: '', // by changing a move name, downstream seq files need changing
      seqFilesReplaceOptionsXML: {}, // by changing a move name, downstream seq files need changing
      comboFilesAffected: '', // for warning if trying to delate a Move, but it is in use in a Combo

      comboTestsByPerm: {},
      comboTestsBySong: {}
    }
  },
  computed: {
    totalRowsMoves: {
      get: () => this.visibleMoves ? this.visibleMoves.length : 0,
      set: (val) => val // placebo for Vue error "has no setter"
    },
    totalRowsCombos () {
      return this.comboList ? this.comboList.length : 0
    },
    graphReady () {
      // if (document.getElementById('mermaid-graph')) {
      if (document.getElementById('mermaid')) {
        // if (document.getElementById('mermaid-graph').innerHTML.class === 'v-spinner') return true
        return false
      } else {
        return false // true
      }
    },
    valnComboHeader () {
      this.alertNameGeneralCombo = false // removed this alert for now?
      this.alertNameUnique = false
      let retVal = false // default
      if (this.tempCurrentComboHdr.name) {
        if (Object.keys(this.editedCombos).includes(this.tempCurrentComboHdr.name) &&
          this.tempCurrentComboHdr.name !== this.currentComboHdr.name) {
          this.alertNameUnique = true
          return false
        }
        const firstLetter = this.tempCurrentComboHdr.name.charAt(0)
        if (firstLetter) {
          if (firstLetter !== firstLetter.toUpperCase()) {
            this.alertNameGeneralCombo = false // annoying, set false for now
            return false
          }
        }
        retVal = this.tempCurrentComboHdr.name.length > 2
        if (retVal) {
          // check description and gears
          retVal = retVal && this.tempCurrentComboHdr.description.length >= this.valComboDescMinLen
          if (!retVal) this.alertNameGeneralCombo = true
          // else this.alertNameGeneralCombo = false
          return retVal
        } else {
          this.alertNameGeneralCombo = true
          return false
        }
      } else {
        this.alertNameGeneralCombo = true
        return false
      }
    },
    graphForMermaid () {
      // the storage format of combos is already dictated a lot by Mermaid rules
      //   but at runtime we add
      //    - certain graphical aids,
      //    - editable flag for mermaid runtime,
      //    - management of our artificial "Start" node
      const that = this // due to JS scope issue

      const getMoveName = function (moveText) {
        // ONLY TWO formats of move name expected here:
        // 1: The bare name
        // 2. The bare name + space + [n-n]
        //  OR it could be either of the above, surrounded by quote characters in the string itself
        const bareText = that.stripOuterQuotes(moveText)
        const match = /^(.*) +\[([0-9])-([0-9])\]$/g.exec(bareText) // assume at least a single space between move and min-max
        let localNodeEditTextWithoutMinMax
        try {
          localNodeEditTextWithoutMinMax = match[1]
        } catch (e) {
          // match fails: there is no extra measures range... the whole text field is just the move name
          localNodeEditTextWithoutMinMax = bareText
        }
        return localNodeEditTextWithoutMinMax
      }
      const narr = []
      const combo = _cloneDeep(this.editedCombos[this.currentComboHdr.name])
      try {
        Object.keys(combo.nodes).forEach(k => {
          // Mermaid will display a clues to the most relevant fields of each node
          const n = combo.nodes[k]
          const movename = getMoveName(n.text)
          // Start node is not a real node, and not editable
          if (that.dictVisibleMoves[movename]) {
            Object.assign(n, { editable: 'true' })
            // n.editable = 'true'
            const level = that.dictVisibleMoves[movename].$.level
            // note edgeType camel case, which is preserved in the XML
            // level field is a string in the dict
            const levels = { 1: '⓵', 2: '⓶', 3: '⓷', 4: '⓸', 5: '⓹', 6: '⓺' }
            let flags = levels[level]
            if (n.allowUpshift) flags += '🔥'
            if (n.allowEquivalent) flags += '∈'
            if (flags) n.text = '"' + that.stripOuterQuotes(n.text) + ' ' + flags + '"'
          } else if (movename.toLowerCase() === 'click to set first move') Object.assign(n, { editable: 'true' })
          narr.push(Object.assign({ id: k }, n))
        })
      } catch (e) {
        console.log('No content for this combo!')
      }
      return narr
    },
    comboList: {
      get () {
        return Object.keys(this.editedCombos).map(n => {
          const o = this.editedCombos[n]
          return { name: n, description: o.$.description, minLength: o.$.minLength, maxLength: o.$.maxLength, startup: o.$.startup, weight: o.$.weight, hasUpshift: o.$.hasUpshift }
        })
      }
    },
    graphMoves: {
      get () {
        return this.visibleMoves.map(item => {
          const rec = {
            name: item.$.name,
            length: item.$.length,
            lengthextendable: item.$.lengthextendable,
            equivalency: item.$.equivalency,
            setupbars: item.$.setupbars,
            delaycount: item.$.delaycount,
            level: item.$.level,
            comment: item.comment[0]
          }
          return rec
        })
      }
    },
    dictVisibleMoves: {
      get () {
        const dictMoves = this.visibleMoves.reduce(function (acc, cur, i) {
          acc[cur.$.name] = cur
          return acc
        }, {}) // initial value is an empty object
        return dictMoves
      }
    },
    visibleMoves: {
      // GUI does not include the reserved system move "Continue"
      get () {
        return this.storeMoves.filter(function (mv) {
          if (mv.$.name === 'Continue') {
            return false
          } else {
            return true
          }
        })
      }
    },
    storeMoves: {
      get () {
        return this.$store.state.movesStore.editedMoves
      }
    },
    editedCombos: {
      // in the case of combos, no diff between combos seen in the GUI and the full set
      //  i.e. no need for a "visibleCombos" version
      get () {
        return this.$store.state.movesStore.editedCombos
      }
    },
    callFiles () {
      return this.$store.state.movesStore.originalCalls.map(item => {
        return { name: item }
      })
    },
    schemeProvider () {
      return this.$store.state.movesStore.schemeProvider || '[no id]'
    },
    schemeDate () {
      return this.$store.state.movesStore.schemeDate || '[no date]'
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    CALLFOLDER () { return path.join(RMDIR, this.RMEFolder, 'vueltas') },
    SEQSPEC () { return path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', '*.seq') },
    JSEQSPEC () { return path.join(RMDIR, 'rm-spot', this.RMEFolder, 'secuencias_para_canciones', '*.jseq') },
    // fields for the moves b-table
    fields: {
      get () {
        return [
          {
            key: '$.name',
            label: this.$i18n.t('col_move_name'),
            headerTitle: 'If move name shows in green, \nyou can click to watch a demonstration.\n\n' +
              'If you sort by clicking header, you can see a smart sort,\n where leading articles are ignored.\nFor example: "El Flaco" is then sorted under the letter F.',
            sortable: true,
            formatter: name => {
              const ELLIPSIS_CHARACTER = '\u2026'
              const max = 35
              if (name && name.length > max) {
                return name.slice(0, max - 1) + ELLIPSIS_CHARACTER
              } else {
                return name
              }
            }
          },
          {
            key: 'comment[0]',
            label: this.$i18n.t('col_comment'),
            headerTitle: 'Add your comments',
            sortable: false,
            tdAttr: 'tdMakeTitle',
            formatter: comment => {
              const ELLIPSIS_CHARACTER = '\u2026'
              const max = 50
              if (comment && comment.length > max) {
                return comment.slice(0, max - 1) + ELLIPSIS_CHARACTER
              } else {
                return comment
              }
            }
          },
          { key: '$.length', label: this.$i18n.t('col_length'), headerTitle: 'How many measures to complete this move once', sortable: true },
          { key: '$.level', label: 'Lvl', headerTitle: 'Set the move level', sortable: true },
          { key: '$.delaycount', label: this.$i18n.t('col_delay'), headerTitle: 'For moves that start late: how many beats to delay', sortable: true },
          {
            key: '$.lengthextendable',
            label: 'Ext',
            headerTitle: 'After basic move is done, can the move \n continue indefinitely until there is a new call?',
            sortable: true,
            formatter: possBool => {
              return (typeof possBool === 'string' ? possBool === 'true' : possBool)
            }
          },
          { key: '$.equivalency', label: 'Eq', headerTitle: 'Interchangable moves are linked by the same Equivalence value (used by combos, automated calling)', sortable: true },
          { key: '$.setupbars', label: 'Setup', headerTitle: 'For automated calls: bars used to setup main move', sortable: true },
          { key: 'actions', label: this.$i18n.t('col_actions'), sortable: false, headerTitle: 'Change your data' }
        ]
      }
    },
    comboFields: {
      get () {
        return [
          {
            key: 'name',
            label: 'Name',
            formatter: name => {
              const ELLIPSIS_CHARACTER = '\u2026'
              const max = 35
              if (name && name.length > max) {
                return name.slice(0, max - 1) + ELLIPSIS_CHARACTER
              } else {
                return name
              }
            },
            tdAttr: 'tdMakeTitle'
          },
          {
            key: 'description',
            label: 'Description',
            formatter: desc => {
              const ELLIPSIS_CHARACTER = '\u2026'
              const max = 42
              if (desc && desc.length > max) {
                return desc.slice(0, max - 1) + ELLIPSIS_CHARACTER
              } else {
                return desc
              }
            },
            tdAttr: 'tdMakeTitle'
          },
          // startup can be set by Vue reading the checkbox, i.e. boolean, although the XML tools save it as a string 'true', 'false'
          { key: 'startup', label: 'Startup', formatter: val => val === 'true' || val === true ? '▶️' : '', headerTitle: 'Use for start and restart of dancing' },
          { key: 'weight', label: 'Weight', headerTitle: 'Weight (rel odds to select)' },
          { key: 'minLength', label: 'Min Length', headerTitle: 'Shortest result possible (beats)' },
          { key: 'maxLength', label: 'Max Length', headerTitle: 'Longest result possible (beats)' },
          { key: 'hasUpshift', label: 'Has Upshift', formatter: val => val === 'true' ? '🔥' : '', headerTitle: 'Contains spicy/climax marked move (upshift)' },
          { key: 'actions', label: 'Actions', headerTitle: 'Bring up the combo graph for review or edit' }
        ]
      }
    }
  },
  watch: {
    // 'currentItem.$.name': function (val) {
    //   if (!this.valnName()) this.alertNameGeneral = true
    // },
    // 'currentItem.$.file': function (val) {
    //   if (!this.valnFile()) this.alertNameGeneral = true
    // },
    // 'currentItem.$.length': function (val) {
    //   if (!this.valnLength()) this.alertNameGeneral = true
    // },
    locale (val) {
      this.$i18n.locale = val // this changes it for current view of current component
      this.$root.$i18n.locale = val // this changes it for all components
    },
    RMEFolder (newVal) {
      this.comboFlowShown = false
      this.filter = ''
    },
    modePerRadios (newVal) {
      if (newVal === 'moveMode') {
        // no surprises: if you click on Combos after Moves
        //  you should see a table of Combos -- not details of one of the combo flows previously opened
        this.comboFlowShown = false
      }
      this.filter = '' // don't use the same filter on moves vs combos
    }
  },
  activated: function () {
    // hate to get that dragging image when all you want is to click
    var links = document.getElementsByClassName('page-link')
    for (var i = links.length - 1; i >= 0; i--) {
      links[i].draggable = false
    }
    // see https://laracasts.com/discuss/channels/vue/how-to-add-atkeyup-globally-with-vue?page=1 -->
    document.addEventListener('keydown', this.keyDownHandler)
    // focus
    try {
      this.$refs.filtMovesCombos.focus()
    } catch (error) {
      console.log('Cannot set focus on moves filter right now')
    }
    console.log('Moves component activated')
  },
  deactivated: function () {
    console.log('Moves component deactivated')
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  beforeRouteLeave (to, from, next) {
    this.filter = ''
    next() // you gotta manually call next if you use this hook
  },
  methods: {
    testCombo (cboHdr) {
      this.$bvToast.toast('Testing this combo against available songs, please wait... ', { title: 'Testing...' })
      setTimeout(() => this.testComboImpl(cboHdr), 100)
    },
    testComboImpl (cboHdr) {
      if (!document.getElementById('mermaid')) return // doesnt work
      const getFilename = () => {
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

      const timeStart = new Date()
      this.comboTestsByPerm = {}
      this.comboTestsBySong = {}
      const that = this
      const songList = replace.sync({
        files: path.join(RMDIR, 'compases_para_canciones', '*.xml'),
        from: /<musicfile.*">([^<]*)<\/musicfile>\s+.*authorAndSongURL.*>(http[^<]*)?(.+)?<\/authorAndSongURL>/gi,
        to: 'dummy',
        dry: true // dry-run, no real replace happens!
      })

      const copy = songList.slice()
      copy.sort(() => Math.random() - 0.5)
      const chosenSongs = copy.slice(0, 9) // 10 max sample size

      for (let i = 0; i < chosenSongs.length; i++) {
        const xmlFilePath = chosenSongs[i].file
        const xmlFile = path.basename(xmlFilePath)
        that.comboTestsBySong[xmlFile] = {}
        let xmlData
        const audit = []
        try {
          xmlData = discDataHelper.getXMLData(xmlFilePath, { type: 'beats' }) || []
        } catch (e) {
          if (e.message.search('ENOENT') === 0) {
            this.$bvToast.toast('Can\'t reload saved beats, the beats file does not exist.', { title: 'No Beats file yet' })
          } else {
            this.$bvToast.toast('Can\'t reload saved beats, file is illegal format.', { title: 'Illegal format' })
          }
          console.error('ERROR: Failed to get measures data for music file: ' + '\n' + e.stack)
        }

        const beats = xmlData.beats
        for (let j = 0; j < beats.length; j++) {
          const minBaseName = xmlFile.substring(0, xmlFile.lastIndexOf('.xml'))
          const autoFiller = new AutoFiller([], that.storeMoves, that.editedCombos, beats, j, minBaseName) // arg1 is an existing sequence, or empty array if none
          autoFiller.genOkPerms(audit, { $: cboHdr }) // arg1 is now an audit log, not used here
          // cboHdr is augmented during the above call, by discovering and attaching endNodes collection
          if (!Object.keys(that.comboTestsByPerm).length) that.comboTestsByPerm = _cloneDeep(cboHdr.endNodes) // initialize only the first time through here
          if (!Object.keys(that.comboTestsBySong[xmlFile]).length) that.comboTestsBySong[xmlFile] = _cloneDeep(cboHdr.endNodes) // initialize only the first time through here
          for (let j = 0; j < autoFiller.okPerms.length; j++) {
            const p = autoFiller.okPerms[j]
            const node = 'node' + p.hdr.id.split('-')[1]
            that.comboTestsByPerm[node].permCount += 1
            that.comboTestsByPerm[node].permDict[p.hdr.id] += 1
            that.comboTestsBySong[xmlFile][node].permCount += 1
            that.comboTestsBySong[xmlFile][node].permDict[p.hdr.id] += 1
          }
        }
      }

      let comboData = JSON.stringify(that.comboTestsByPerm, null, 2)
      comboData = 'Combo: "' + cboHdr.name + '" - perms that fit OK by song, starting at all positions in song\n' + comboData
      fs.writeFile(path.join(DLDIR, '/RM-MOV-COMBOS-TEST-' + getFilename() + '.json'), comboData, err => {
        if (err) {
          throw err
        }
        console.log('JSON Combo data is saved.')
      })
      let songData = JSON.stringify(that.comboTestsBySong, null, 2)
      songData = 'Combo: "' + cboHdr.name + '" - perms that fit OK by song, starting at all positions in song\n' + songData
      fs.writeFile(path.join(DLDIR, '/RM-MOV-SONGS-TEST-' + getFilename() + '.json'), songData, err => {
        if (err) {
          throw err
        }
        console.log('JSON Song data is saved.')
      })
      this.$bvModal.msgBoxOk('Done: results are in your Download folder (ms: ' + (new Date() - timeStart) + ')', { title: 'Finished' })
    },
    titleComparator (a, b, fldname) {
      function titleComparatorHelper (a, b) {
        const articles = ['un', 'unos', 'el', 'los', 'una', 'unas', 'la', 'las', 'lo']
        const re = new RegExp('^(?:(' + articles.join('|') + ') )(.*)$') // e.g. /^(?:(foo|bar) )(.*)$/
        const replacor = function ($0, $1, $2) {
          return $2 + ', ' + $1
        }
        a = a.toLowerCase().replace(re, replacor)
        b = b.toLowerCase().replace(re, replacor)
        return a === b ? 0 : a < b ? -1 : 1
      }
      if (fldname === '$.name') return titleComparatorHelper(a.$.name, b.$.name)
    },
    open (link) {
      this.$electron.shell.openExternal(link)
    },
    tdMakeTitle (value, key, item) {
      // wrap the comment "title" attribute, regex
      // https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
      const wrap = (s, w) => s.replace(
        new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
      )
      return { title: wrap(value, 26) }
    },
    onFiltered (filteredItems) {
      if (this.modePerRadios === 'moveMode') {
        if (this.totalRowsMoves !== filteredItems.length) {
          this.totalRowsMoves = filteredItems.length
          this.currentPageMoves = 1
        }
      } else {
        if (this.totalRowsCombos !== filteredItems.length) {
          this.totalRowsCombos = filteredItems.length
          this.currentPageCombos = 1
        }
      }
    },
    customFilterMoves (row, filter) {
      try {
        if (!!filter && !row.$.name.match(toRegex()(filter))) return false
        else return true
      } catch (e) {
        return false
      }
    },
    customFilterMovesComboPicker (row, filter) {
      try {
        if (!!filter && !row.name.match(toRegex()(filter))) return false
        else return true
      } catch (e) {
        return false
      }
    },
    customFilterCallsPicker (row, filter) {
      try {
        if (!!filter && !row.name.match(toRegex()(filter))) return false
        else return true
      } catch (e) {
        return false
      }
    },
    customFilterCombos (row, filter) {
      try {
        if (!!filter && !row.name.match(toRegex()(filter))) return false
        else return true
      } catch (e) {
        return false
      }
    },
    escapeRegExp (string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
    },
    calcComboHeader (cboHdr) {
      if (!cboHdr) cboHdr = this.currentComboHdr
      // calculate and save the min/max for the combo
      const myCbo = _cloneDeep(this.editedCombos[cboHdr.name])
      let cboMax = 0 // winning pathMax so far
      let cboMin = 0 // winning pathMin so far
      let pathMax = 0 // accumulator for one iteration arrivaing at an end point; cf to cbo max so far, if greater, replace
      let pathMin = 0 // accumulator for one iteration arrivaing at an end point; cf to cbo min so far, if less, replace
      const arrBranchTrail = [] // tracks unvisited branches
      let errMsg = '' // possible string for later
      // first node, Start node... should only have one child
      let currNode = { branch: 'node2', parent: myCbo.nodes.node1 } // always the real first move, no siblings
      // loop over the nodes
      // get the actual move, separte the extra time if any
      let hasUpshift = false // init before we find at least one Upshift node
      while (currNode) { // break to exit loop
        const me = myCbo.nodes[currNode.branch]
        if (!hasUpshift) if (me.allowUpshift === true) hasUpshift = true // set our combolevel flag
        let localNodeEditTextWithoutMinMax
        let localNodeEditExtraTimeMin
        let localNodeEditExtraTimeMax
        const origText = this.stripOuterQuotes(me.text)
        const match = /^["]?(.*) +\[([0-9])-([0-9])\]( *)?["]?$/g.exec(origText) // assume at least a single space between move and min-max
        // handle if no extra time field in the header
        try {
          localNodeEditTextWithoutMinMax = match[1]
          localNodeEditExtraTimeMin = parseInt(match[2])
          localNodeEditExtraTimeMax = parseInt(match[3])
        } catch (e) {
          // match fails: there is no extra time field, the whole text field is just the move name
          localNodeEditTextWithoutMinMax = origText
          localNodeEditExtraTimeMin = 0
          localNodeEditExtraTimeMax = 0
        }
        // we got name, and extra time: now let's get the move length itself
        const moveIndex = discDataHelper.binarySearch(this.visibleMoves, { $: { name: localNodeEditTextWithoutMinMax } })
        let moveLength
        try {
          moveLength = parseInt(this.visibleMoves[moveIndex].$.length)
        } catch (e) {
          errMsg = 'Illegal move in combo: ' + cboHdr.name + ', move: ' + localNodeEditTextWithoutMinMax
          console.error(errMsg)
          this.$bvToast.toast(errMsg, { title: 'Error' })
          return
        }
        // compare to comboMax and Min; if it beats current setting, update
        pathMax += moveLength + localNodeEditExtraTimeMax
        pathMin += moveLength + localNodeEditExtraTimeMin
        Vue.set(me, 'accMax', pathMax)
        Vue.set(me, 'accMin', pathMin)

        // NEXT NODES to process: links discovered here, to be visited in future
        if (me.next && me.next.length > 0) {
          // add any new branches discovered
          arrBranchTrail.push(...me.next.map(n => {
            // update the parent
            return { branch: n, parent: me }
          }))
        } else {
          // currNode is tip of a path
          // cmp and upd min max for Combo
          if (pathMax > cboMax) cboMax = pathMax
          if (cboMin === 0 || pathMin < cboMin) cboMin = pathMin
          pathMax = 0
          pathMin = 0
        }
        // NEXT NODE, WHILE LOOP prep: set currNode
        // console.log(currNode.branch, JSON.stringify(arrBranchTrail.map(b => b.branch)))
        if (arrBranchTrail.length > 0) {
          currNode = arrBranchTrail.pop() // obj like {choice: 'node9', parent: ....}
          // here we reuse the parents max-min calculated previously
          pathMax = currNode.parent.accMax
          pathMin = currNode.parent.accMin
        } else {
          console.log('final node, no more to do: ' + currNode.branch)
          currNode = null
          // break // loop is done: set results
        }
      }
      Vue.set(cboHdr, 'hasUpshift', hasUpshift ? 'true' : 'false')
      Vue.set(cboHdr, 'maxLength', cboMax)
      Vue.set(cboHdr, 'minLength', cboMin)
      this.$store.commit('UPDATE_COMBO_HEADER', { comboName: cboHdr.name, newCombo: cboHdr })
    },

    setNodeWeight () {
      const vars = this.nodeEditWeightVars
      if (vars) {
        const payload = {
          combo: this.currentComboHdr.name,
          parent: vars.parent,
          weight: vars.weight,
          indexInParent: vars.indexInParent
        }
        this.$store.commit('UPDATE_WEIGHT_IN_COMBO', payload)
        // persist moves file (including combos)
        const authorId = this.$store.state.settingsStore.settings.authorId
        const payload1 = {
          date: new Date().toISOString(),
          folder: this.RMEFolder,
          authorId: authorId,
          schemeProvider: authorId, // because I am saving this file, I am the new author!
          schemeDate: new Date().toISOString(),
          schemeName: this.RMEFolder
        }
        this.$store.commit('PERSIST_ALL_MOVES', payload1)
      }
    },
    updateNodeExtras () {
      const payload = {
        node: this.currentEditNode,
        combo: this.currentComboHdr.name,
        baseMoveName: this.nodeEditTextWithoutMinMax, // will be 'text' in XML
        extraTimes: [this.nodeEditExtraTimeMin, this.nodeEditExtraTimeMax], // will be [m-n] in text in XML
        allowUpshift: this.nodeEditAllowUpshift || false, // will be allowupshift attr in node element in XML
        allowEquivalent: this.nodeEditAllowEquivalent || false // will be allowequivalent attr in node element in XML
      }
      this.$store.commit('UPDATE_EXTRA_TIME_NODE_IN_COMBO', payload)
      // now update the header totals in the store
      this.calcComboHeader(this.currentComboHdr)
      // persist moves file (including combos)
      const authorId = this.$store.state.settingsStore.settings.authorId
      const payload1 = {
        date: new Date().toISOString(),
        folder: this.RMEFolder,
        authorId: authorId,
        schemeProvider: authorId, // because I am saving this file, I am the new author!
        schemeDate: new Date().toISOString(),
        schemeName: this.RMEFolder
      }
      this.$store.commit('PERSIST_ALL_MOVES', payload1)
    },
    showDelNodeMsgbox () {
      this.$bvModal.msgBoxConfirm('Delete this node and its child nodes: Are you sure?')
        .then(value => {
          if (value) {
            const payload = {
              node: this.currentEditNode,
              combo: this.currentComboHdr.name
            }
            this.$bvModal.hide('modalEditNode')
            this.$store.commit('DELETE_SUBTREE_IN_COMBO', payload)
            const authorId = this.$store.state.settingsStore.settings.authorId
            const payload1 = {
              date: new Date().toISOString(),
              folder: this.RMEFolder,
              authorId: authorId,
              schemeProvider: authorId, // because I am saving this file, I am the new author!
              schemeDate: new Date().toISOString(),
              schemeName: this.RMEFolder
            }
            this.calcComboHeader()
            this.$store.commit('PERSIST_ALL_MOVES', payload1)
            this.$bvModal.hide('nodeEditSwitchboard')
          }
        })
        .catch(err => {
          console.log('Error: ' + err)
        })
    },
    editComboHeader () {
      this.tempCurrentComboHdr = _cloneDeep(this.currentComboHdr)
      this.$bvModal.show('modalEditComboHeader')
    },
    persistComboHeader () {
      // from OK in dialog
      const payload = {
        comboName: this.currentComboHdr.name,
        newCombo: this.tempCurrentComboHdr
      }
      this.$bvModal.hide('modalEditNode')
      this.$store.commit('UPDATE_COMBO_HEADER', payload)
      const authorId = this.$store.state.settingsStore.settings.authorId
      const payload1 = {
        date: new Date().toISOString(),
        folder: this.RMEFolder,
        authorId: authorId,
        schemeProvider: authorId, // because I am saving this file, I am the new author!
        schemeDate: new Date().toISOString(),
        schemeName: this.RMEFolder
      }
      this.$store.commit('PERSIST_ALL_MOVES', payload1)
      this.$store.dispatch('diagMovesWithUsage')
      this.currentComboHdr = this.tempCurrentComboHdr
    },
    modalEditNodeTitle () {
      let title = '' // default
      if (this.currentEditNode) {
        const idx = this.graphForMermaid.findIndex(o => o.id === this.currentEditNode)
        if (idx >= 0) {
          title = this.stripOuterQuotes(this.graphForMermaid[idx].text)
          title = '\'' + title + '\''
        }
      }
      return title
    },
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
    },
    onNodeReplaceOrAdd (item, index) {
      // Where this dialog pops up:
      // From looking at mermaid combo graph, we've clicked on a node.
      // Then we've clicked to select a move, either REPLACE or ADD CHILD
      // Then looking at the TABLE of moves, we select a move to select a move
      //  FINALLY, here is where we do the REPLACE or ADD CHILD

      // find the node we clicked on in the graph
      const test = this.graphForMermaid.findIndex(o => o.id === this.currentEditNode)
      let payload
      if (test >= 0) {
        payload = {
          move: item,
          combo: this.currentComboHdr.name,
          node: this.currentEditNode
        }
      } else {
        console.error('BUG: onNodeReplaceOrAdd: Node not found!')
        return
      }
      if (this.nodeMoveMode === 'changeMove') {
        this.$store.commit('UPDATE_NODE_IN_COMBO', payload)
      } else { // add a move "addChild"
      // quickie debounce, since sometimes duplicate add happens!
        if (this.gateClosed) return
        this.gateClosed = true
        setTimeout(() => { this.gateClosed = false }, 500)
        console.log('Moves calling adding node in combo, gateClosed: ' + this.gateClosed)
        this.$store.commit('ADD_NODE_IN_COMBO', payload)
      }
      const authorId = this.$store.state.settingsStore.settings.authorId
      const payload1 = {
        date: new Date().toISOString(),
        folder: this.RMEFolder,
        authorId: authorId,
        schemeProvider: authorId, // because I am saving this file, I am the new author!
        schemeDate: new Date().toISOString(),
        schemeName: this.RMEFolder
      }
      this.calcComboHeader()
      this.$store.commit('PERSIST_ALL_MOVES', payload1)
      this.$store.dispatch('diagMovesWithUsage')
      this.$bvModal.hide('modalEditNode')
      this.$bvModal.hide('nodeEditSwitchboard')
    },
    setFocusMoves () {
      this.$refs.filterInput.focus()
    },
    nodeClick (id) {
      // click on a combo node
      this.currentEditNode = id

      const that = this
      const nodeList = this.editedCombos[this.currentComboHdr.name].nodes
      let mother
      let testIdx
      let wt = 0
      // find parent node
      Object.keys(nodeList).forEach(sNode => {
        // TODO: rewrite with Array.find, so we can break when we find mother
        if (nodeList[sNode].next) {
          testIdx = nodeList[sNode].next.indexOf(that.currentEditNode)
          // WEIGHT: does this node point to me?
          if (testIdx >= 0) {
            // found our parent!
            mother = sNode
            // does our parent have other children?
            if (nodeList[sNode].next.length > 1) {
              // yes: go ahead, we'll need a weight for this node too!
              this.nodeEditDisableWeight = false
              if (!nodeList[sNode].link) {
                // there's NOT already a weight
                //  initialize it to four for edit dialog
                this.nodeEditWeightVars = {
                  parent: '',
                  indexInParent: -1,
                  weight: 4,
                  weightTemp: 0 // temp value while editing
                }
              } else {
                const wtText = nodeList[sNode].link[testIdx]
                wt = /^[- ]*([0-9]*)+[ ->]*$/g.exec(wtText)[1] // mermaid likes the -- and --> arrow bits to be included, strip them off for editing
              }
            } else {
              console.log('No other children, so we don\'t want to put a weight on this link!')
              this.nodeEditDisableWeight = true
            }
            this.nodeEditWeightVars = {
              parent: mother,
              indexInParent: testIdx,
              weight: wt,
              weightTemp: wt // temp value while editing
            }
          }
        }
      })
      this.nodeEditAllowUpshift = nodeList[this.currentEditNode].allowUpshift
      this.nodeEditAllowEquivalent = nodeList[this.currentEditNode].allowEquivalent
      // EXTRA TIME: get move reference, so we know if it's extendable
      const origText = this.stripOuterQuotes(nodeList[this.currentEditNode].text)
      if (origText.toLowerCase() === 'click to set first move') {
        // combo has no moves yet, just a placeholder for move 1
        // so, present the dialog to pick a move to replace the placeholder
        this.nodeMoveMode = 'changeMove'
        this.$bvModal.show('modalEditNode')
      } else {
        const match = /^["]?(.*) +\[([0-9])-([0-9])\]["]?$/g.exec(origText) // assume at least a single space between move and min-max
        // fail if no extra time
        try {
          this.nodeEditTextWithoutMinMax = match[1]
          this.nodeEditExtraTimeMin = match[2]
          this.nodeEditExtraTimeMax = match[3]
        } catch (e) {
          // there is no extra time field, the whole text field is just the move name
          this.nodeEditTextWithoutMinMax = origText
          this.nodeEditExtraTimeMin = 0
          this.nodeEditExtraTimeMax = 0
        }
        const moveIndex = discDataHelper.binarySearch(this.visibleMoves, { $: { name: this.nodeEditTextWithoutMinMax } })
        // disable extend button, if move is not extendable
        if (moveIndex >= 0) this.nodeEditDisableExtraTime = this.visibleMoves[moveIndex].$.lengthextendable !== 'true'

        this.$nextTick(function () {
          this.moveFilterTemp = this.moveFilter
          this.$bvModal.show('nodeEditSwitchboard')
        })
      }
    },
    deleteCombo () {
      this.$bvModal.msgBoxConfirm('Delete this combo completely: Are you sure?')
        .then(value => {
          if (value) {
            const payload = {
              combo: this.currentComboHdr
            }
            this.$store.commit('DELETE_NODE_IN_COMBO', payload)
            // persistence
            const authorId = this.$store.state.settingsStore.settings.authorId
            const payload1 = {
              date: new Date().toISOString(),
              folder: this.RMEFolder,
              authorId: authorId,
              schemeProvider: authorId, // because I am saving this file, I am the new author!
              schemeDate: new Date().toISOString(),
              schemeName: this.RMEFolder
            }
            this.$store.commit('PERSIST_ALL_MOVES', payload1)
            this.$store.dispatch('diagMovesWithUsage')
            this.comboFlowShown = false
          }
        })
        .catch(err => {
          console.log('Error: ' + err)
        })
    },
    showFlow (item) {
      this.currentComboHdr = item
      this.comboFlowShown = true
    },
    onCallClicked (item, index) {
      console.log('selected call: ' + item.name)
      this.currentItem.$.file = item.name // was path.posix
      this.surfCurrent()
      this.$bvModal.hide('modalPicker')
      this.callFilter = ''
    },
    rowClicked (item, index) {
      if (this.modePerRadios === 'moveMode') {
        this.currentItem = _cloneDeep(item) // prob. redundant so far
        console.log('row-clicked' + '-' + item + '-' + index)
      }
    },
    keyDownHandler (event) {
      const kcDown = 40
      const kcEnter = 13
      const kcEsc = 27
      if (this.modalPickerShown) {
        if (event.keyCode === kcDown) { // space key
          try {
            this.$refs.callsTable.$el.rows[1].focus()
          } catch (e) {
            console.log('can\'t focus first row, doesn\'t exist?')
          }
        } else if (event.keyCode === kcEnter) { // space key
          try {
            this.$refs.callsTable.$el.rows[1].focus()
          } catch (e) {
            console.log('can\'t focus first row, doesn\'t exist?')
          }
        }
      // order of next three is important!  modalEditNodeShown, modalEditSwitchboardShown, comboFlowShown
      } else if (this.modalEditNodeShown) {
        if (event.keyCode === kcEsc) { // auto close stopped, because of overlay
          this.modalEditNodeShown = false
        } else if (event.keyCode === kcDown) { // space key
          try {
            this.$refs.modalEditNodeCalls.$el.rows[1].focus()
          } catch (e) {
            console.log('can\'t focus first row, doesn\'t exist?')
          }
        } else if (event.keyCode === kcEnter) { // space key
          try {
            this.$refs.modalEditNodeCalls.$el.rows[1].focus()
          } catch (e) {
            console.log('can\'t focus first row, doesn\'t exist?')
          }
        }
      } else if (this.modalEditSwitchboardShown) {
        if (event.keyCode === kcEsc) { // auto close stopped, because of overlay
          this.modalEditSwitchboardShown = false
        }
      } else if (this.comboFlowShown) {
        if (event.keyCode === kcEsc) { // space key
          this.comboFlowShown = false
        }
      } else {
        // event.preventDefault() // mainly if a button has focus, stops "space" "enter" from clicking it
      }
      this.$refs.simplert.justCloseSimplert()
    },
    bEditMoveOKDisabled () {
      // move input dialog:
      // iterate over visible fields, see if any are invalid
      let retVal
      if (this.modalEditComboHeaderShown) {
        retVal = !this.tempCurrentComboHdr.name // ok if there is a name
      } else if (this.modalEditShown) {
        retVal = !(this.valnName() && this.valnFile() && this.valnLength() && this.valnDelayCount() && this.valnSetupBars())
        console.log('OK disabled? ' + retVal)
        // this.alertNameGeneral = retVal // TOO REACTIVE, this fn is triggered by dismissing the alert (to false)
        return retVal
      } else {
        console.log('OK disabled? true (fallthru)')
        return true
      }
    },
    // BEGIN VALIDATION
    valnKeepIntegralHelper (value) {
      return !isNaN(value) &&
        parseInt(Number(value)).toString() === value &&
        !isNaN(parseInt(value, 10))
    },
    valnName () {
      if (this.currentItem && this.currentItem.$.name.trim()) {
        const test = this.currentItem.$.name.trim()
        const firstLetter = test.charAt(0)
        if (firstLetter) {
          if (firstLetter !== firstLetter.toUpperCase()) {
            return false
          }
        }
        if (test === 'Continue') {
          return false // reserved name Continue
        }
        if (test.indexOf('  ') > 0) return false // single space reqd, if more allowed things look deceptive
        // note this regex should be consistent with validation in moveStore::getMovesInCombos method
        const resRe = test.match(/^(([\wáéíóúñÁÉÍÓÚÑ.'\-, ]*[\wáéíóúÁÉÍÓÚ.']+)( \([\wáéíóúñÁÉÍÓÚÑ'\-/, ]*\))?)$/u)
        if (resRe === null) return false // illegal characters
        if (resRe[2].length > 50) return false // basic move name
        if (resRe[1].length > 70) return false // basic move name PLUS comment in parentheses
        // part of name after '(' can be an saved as explanation of context, but is not to be pronounced:
        return true
      } else {
        return false
      }
    },
    valnFile () {
      return (this.currentItem.$.file.length > 0) // used to check against files found at startup... but now we can create mp3 while program is running
    },
    valnLength () {
      // zero now allowed: it's a fractional measure e.g. for a beat/clave switch, 4 beats not eight
      return (this.currentItem.$.length >= 0 && this.valnKeepIntegralHelper(this.currentItem.$.length))
    },
    valnDelayCount () {
      return (this.currentItem.$.delaycount >= 0 && this.valnKeepIntegralHelper(this.currentItem.$.delaycount)) ||
        !this.currentItem.$.delaycount
    },
    valnSetupBars () {
      // range 0 to 3
      // rely on string to number comparison https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Greater_than_or_equal
      return (this.valnKeepIntegralHelper(this.currentItem.$.setupbars) && this.currentItem.$.setupbars >= 0 && this.currentItem.$.setupbars < 4) ||
        !this.currentItem.$.setupbars
    },
    // END VALIDATION
    removeDlgAlerts () {
      // alerts that are displayed in the move edit dialog
      this.alertNameGeneral = false
      this.alertNameGeneralCombo = false
      this.alertNameUnique = false
    },
    getEditDlgTitle () {
      return this.currentItemBeforeEdit ? 'Edit move (hover for tips)' : 'Add move (hover for tips)'
    },
    editWithAudacity () {
      try {
        opn(path.join(this.CALLFOLDER, this.currentItem.$.file), { app: 'audacity' })
      } catch (e) {
        // ?retry here, using the normal installation path?
        console.log('Audacity launch failed, is it installed, and on the path?')
      }
    },
    createWithPolly () {
      this.alertPollyServerError = false
      const that = this // keep a handle on context through the async steps
      if (!this.valnName()) {
        // this.alertNameForPolly = true
        this.alertNameGeneral = true
        return
      }
      const indParen = this.currentItem.$.name.indexOf('(') // parenths may be used in name to explain context, but content is not pronounced by call voice
      let pollyTxt = this.currentItem.$.name
      if (indParen > 0) {
        pollyTxt = pollyTxt.substring(0, indParen).trim() // remove the non-voiced description in brackets (if any)
      }

      if (pollyTxt === 'Continue') {
        this.alertPollyServerNoContinue = true
        return
      }

      try {
        WAVESURFER.destroy()
      } catch (e) {
        // if it doesn't exist first time round
      }
      this.bLoading = true
      var data = {
        text: pollyTxt,
        voice: 'Lupe'
      }
      console.log('>>> POST #1.... send call name text, make MP3 file in temp folder via a call to Polly')
      var API_ENDPOINT = 'https://bj6m5mor4j.execute-api.us-east-1.amazonaws.com/dev' // rueda-calls-using-polly
      fetch(API_ENDPOINT, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json', // 'Content-Type': 'application/x-www-form-urlencoded',
          'x-api-key': 'AqViEIc4ZM1o094NKHXwb92benx4aIBt1Y2pgmM7' // the gateway is open//public, cost-limited by usage plan quota
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data) // body data type must match "Content-Type" header
      })
        .then(async response => {
          console.log('>>> In first "then" clause....')
          const data = await response.json()
          console.log('>>> response: ' + JSON.stringify(data, null, 2))
          // check for error response
          if (!response.ok) {
            // get error message from body or default to response statusText
            const error = (data && data.message) || response.statusText
            return Promise.reject(error)
          }
          let bareFilename
          try {
            bareFilename = data.substring(data.lastIndexOf('/') + 1)
          } catch (err) {
            console.error('Promise retd ok but string not delivered, should try again')
            throw err
          }
          console.log('>>> POST #2.... run ffmpeg against the quiet call file from Polly, make it max volume and slightly distorted in main polly-api/mp3calls folder')
          API_ENDPOINT = 'https://kyppaom4ab.execute-api.us-east-1.amazonaws.com/dev/' // rueda-move-amplifier-api
          fetch(API_ENDPOINT, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json', // 'Content-Type': 'application/x-www-form-urlencoded',
              'x-api-key': 'AqViEIc4ZM1o094NKHXwb92benx4aIBt1Y2pgmM7' // the gateway is open//public, cost-limited by usage plan quota
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(bareFilename) // body data type must match "Content-Type" header
          })
            .then(async response => {
              console.log('>>> In second "then" clause....')
              const resp = await response.json()
              console.log('>>> response: ' + JSON.stringify(resp, null, 2))
              // check for error response
              if (!response.ok) {
                // get error message from body or default to response statusText
                const error = (resp && resp.message) || response.statusText
                return Promise.reject(error)
              }
              const download = wget.download(encodeURI('https://s3.amazonaws.com/polly-api/' + bareFilename), this.CALLFOLDER + '/' + bareFilename, {})
              download.on('error', err => {
                console.log(err)
              })
              download.on('end', response => {
                try {
                  this.bLoading = false
                  console.log(`file ${data} was downloaded`)
                  // this.runCompressAndAmplify(this.CALLFOLDER, callname) // run ffmpeg to compress and amplify the file, result replaces the original file
                  that.currentItem.$.file = bareFilename
                  that.valnFile() // button should show we have selected a valid file (be blue, not red)
                  that.$nextTick(function () {
                    that.surfCurrent()
                  })
                  // execution resumes on "result" of ipc call below
                } catch (error) {
                  console.error(error.stack || error.message || String(error))
                  throw error
                }
              })
            })
        })
        .catch(error => {
          this.alertPollyServerError = true
          this.bLoading = false
          console.error('>>> Error :', error)
        })
    },

    checkForIrregularBeat (e) {
      // arg e is event, may be used to cancel downstream
      // if length is 0... confirm that we intend the move to be for irregular beat
      //  like a clave change, 4 beats for example
      if (parseInt(this.currentItem.$.length) === 0) {
        this.$bvModal.msgBoxConfirm('ZERO length move is for irregular beat \'cambio\' only, OK?  (e.g. a beat switch, 4 beats)')
          .then(value => {
            if (value) {
              // proceed since they are so sure...
              this.preSaveEditedMove(e)
            }
          })
          .catch(err => {
            console.log('Error: ' + err)
          })
      } else {
        // no problem, just proceed
        this.preSaveEditedMove(e)
      }
    },
    preSaveEditedMove (e) {
      // i.e. OK click
      // trim the name in case padded with spaces
      this.currentItem.$.name = this.currentItem.$.name.trim()
      this.currentItem.$.nameSorted = this.currentItem.$.name.toLocaleLowerCase()
      // if the edit is ok, where will we insert it?
      // FIXME check if any change was made -- used?
      if (this.currentItemBeforeEdit) {
        if (Differ.diff(this.currentItemBeforeEdit, this.currentItem)) {
          console.log('yep, it\'s been modified') // if we trust this, skip unneeded work
        }
      }

      // VALID'N: TRUE, or we don't save
      let bNameNoConflict = false

      // NOW find the value of the flag
      // bNameNoConflict value:
      const nInsertAt = discDataHelper.binarySearch(this.visibleMoves, this.currentItem)
      if (this.currentItemBeforeEdit) { // editing existing move
        // name unchanged OR changed but unused so far
        bNameNoConflict = ((this.currentItemBeforeEdit.$.name === this.currentItem.$.name) && (nInsertAt >= 0)) ||
          ((this.currentItemBeforeEdit.$.name !== this.currentItem.$.name) && (nInsertAt < 0))
      } else {
        // if it's ADD new move, the same name didn't exist before
        bNameNoConflict = (nInsertAt < 0)
      }

      // NOW find the value of the flag
      // BAIL if flag false with warning

      // if the new name already exists:
      if (!bNameNoConflict) {
        // raise the dialog, no mutation
        this.alertNameUnique = true
        this.$bvModal.msgBoxOk('Unfortunately we can\'t save that move name, it already exists!')
        return // *** BAIL
      }
      if (this.currentItemBeforeEdit) {
        const oldName = this.currentItemBeforeEdit.$.name
        const newName = this.currentItem.$.name.trim()

        // NAME CHANGE
        if (oldName !== newName) {
          // FIX sequences that use this move, and combos that include it
          const SEQFileCanWrite = (fn) => {
            if (discDataHelper.fileExists(fn)) {
              return discDataHelper.fileCanWrite(fn)
            } else {
              return true
            }
          }
          this.tempReadonlyList = [] // clear this for use
          const checkForRO = (args) => {
            // we will change to writeable temporarily, change content, then revert to RO
            console.log('RO CHECK')
            if (!SEQFileCanWrite(args[3])) {
              if (this.tempReadonlyList.indexOf(args[3]) === -1) {
                this.tempReadonlyList.push(args[3])
              }
            }
            return this.seqFilesNewMoveName
          }

          // ARE SEQ FILES AFFECTED?
          this.seqFilesOldMoveName = 'name="' + oldName + '"'
          this.seqFilesNewMoveName = 'name="' + newName + '"' // also done later while saving
          this.seqFilesReplaceOptionsXML = {
            files: this.SEQSPEC,
            from: new RegExp(this.escapeRegExp(this.seqFilesOldMoveName), 'g'),
            to: (...args) => checkForRO(args)
          }
          const results = replace.sync(Object.assign(_cloneDeep(this.seqFilesReplaceOptionsXML), { dry: true })) // READONLY just a dry run!
          this.seqFilesAffected = results.filter(item => item.hasChanged).map(item => path.basename(item.file))
          if (this.seqFilesAffected.length) {
            this.$bvModal.show('dlgModifyFiles')
            return // *** BAIL pending dialog answer, IF YES modifyFilesBeforeSaveEditedMove()
          }
        }

        // MOVE LENGTH CHANGE:
        // if they change this, PREVENT with warning
        //  if there are SEQ files that use it
        //  User warned to remove the move from those files first
        if (this.currentItem.$.length !== this.currentItemBeforeEdit.$.length) {
          this.seqFilesReplaceOptionsXML = {
            files: this.SEQSPEC,
            from: new RegExp('name="' + this.escapeRegExp(this.currentItemBeforeEdit.$.name) + '"', 'g'),
            to: 'xxx' // DRY RUN - we just need a list of files with move
          }
          const results2 = replace.sync(Object.assign(_cloneDeep(this.seqFilesReplaceOptionsXML), { dry: true })) // READONLY just a dry run!
          this.seqFilesAffected = results2.filter(item => item.hasChanged).map(item => path.basename(item.file))
          if (this.seqFilesAffected.length) {
            this.showLengthWarning = true // **** <<< HERE IS THE RESULT, later
            return // BAIL - user must fix
          }
        }
      }
      this.saveEditedMove()
    },
    fixCombos (oldName, newName) {
      // when the name of a move on the Moves tab is changed.
      //  go through the Combos and update any occurrences there
      const keys = Object.keys(this.editedCombos)
      let countChanges = 0
      for (let i = 0; i < keys.length; i++) {
        const cbo = this.editedCombos[keys[i]]
        const nodes = Object.keys(cbo.nodes)
        for (let j = 1; j < nodes.length; j++) {
          // node1 is always just the Start node
          const nodeText = this.stripOuterQuotes(cbo.nodes[nodes[j]].text)
          const repl = nodeText.replace(oldName, newName)
          if (repl !== nodeText) {
            countChanges += 1
            // node.text = repl
            // UPDATE_NODE_IN_COMBO (state, payload) {
            //   state.editedCombos[payload.combo].nodes[payload.node].text = '"' + payload.move.name + '"' // or else mermaid chokes on brackets etc
            // },
            const payload = { combo: keys[i], node: nodes[j], move: { name: repl } }
            this.$store.commit('UPDATE_NODE_IN_COMBO', payload)
          }
        }
      }
      this.$bvToast.toast('Change applies to Combos: ' + countChanges, {
        title: 'Moves were changed in Combos',
        autoHideDelay: 4000
      })
    },
    modifyFilesBeforeSaveEditedMove () {
      // IF YES TO DIALOG 'dlgModifyFiles', set in motion the save of an edited move
      // THIS DLG only comes up when called from preSaveEditedMove
      //   where **this.seqFilesReplaceOptionsXML** is set to match SEQ files
      // IF YES: come here, change the seq files
      // happens if a move name is changed, but the move is already used in a sequence
      //  the sequence must be edited to change that move name

      // first set the RO files to be writable
      for (let j = 0; j < this.tempReadonlyList.length; j++) {
        // revert the files that were readonly to RO again
        fs.chmodSync(this.tempReadonlyList[j], 0o666)
        console.log(`The permissions for file ${this.tempReadonlyList[j]} have been changed! (666 WRITABLE)`)
      }
      this.$bvToast.toast('SEQ files were RO, restored to ReadOnly: ' + this.tempReadonlyList.length, {
        title: 'Moves were changed in SEQ files',
        autoHideDelay: 4000
      })

      // the current to is a function checking for RO files, we've fixed that, just get the to name
      this.seqFilesReplaceOptionsXML.to = 'name="' + this.currentItem.$.name.trim() + '"'

      try {
        replace.sync(this.seqFilesReplaceOptionsXML)
      } catch (error) {
        this.$bvModal.msgBoxOk('SEQ File(s) set READ-ONLY, protected from changes here!  You must change the file permissions to do this.')
        this.$bvModal.hide('filesWarning')
        return
      }
      // as well as the RME XML files with .seq extension, also affected are
      //  the RM-spot json files with .jseq extension.  Here we populate that object:

      // revert previously RO files to be RO once more
      for (let j = 0; j < this.tempReadonlyList.length; j++) {
        // revert the files that were readonly to RO again
        fs.chmodSync(this.tempReadonlyList[j], 0o444)
        console.log(`The permissions for file ${this.tempReadonlyList[j]} have been changed! (444 RO)`)
      }
      this.$bvToast.toast('SEQ files were RO, changed to writable temporarily: ' + this.tempReadonlyList.length, {
        title: 'Moves were changed in SEQ files',
        autoHideDelay: 4000
      })

      const jseqFilesOldMoveName = '"name": "' + this.currentItemBeforeEdit.$.name + '"'
      const jseqFilesNewMoveName = '"name": "' + this.currentItem.$.name.trim() + '"' // trim also done later while saving!
      const jseqFilesReplaceOptionsJSON = {
        files: this.JSEQSPEC, // computed so must be at global scope
        from: new RegExp(this.escapeRegExp(jseqFilesOldMoveName), 'g'),
        to: jseqFilesNewMoveName
      }
      const results = replace.sync(Object.assign(_cloneDeep(jseqFilesReplaceOptionsJSON)))
      const jseqFilesAffected = results.filter(item => item.hasChanged).map(item => path.basename(item.file))
      console.log('RME seq files changed/RM-spot jseq files changed: ' + this.seqFilesAffected.length + '/' + jseqFilesAffected.length)

      // fix the Combos in memory, the ones saved in moves.xml
      try {
        const from = this.currentItemBeforeEdit.$.name
        const to = this.currentItem.$.name.trim()
        this.fixCombos(from, to)
      } catch (e) {
        this.$bvToast.toast('Error replacing ' + this.seqFilesReplaceOptionsXML, {
          title: 'Error replacing move in Combos',
          autoHideDelay: 4000
        })
      }
      this.saveEditedMove()
    },
    saveEditedMove () {
      // called direct from Move edit, unless there are SEQ files affected
      //  if SEQ files affected, this is called from a YES/NO modify dialog
      // IF YES TO DIALOG 'dlgModifyFiles', that modifies the affected files,
      //   and then calls here.
      let nInsertAt = 0
      if (this.currentItemBeforeEdit) { // editing existing move
        // update made to top of the food chain, the store moves, which should flow through to our "visibleMoves"
        const nPosBeforeEdit = discDataHelper.binarySearch(this.storeMoves, this.currentItemBeforeEdit)
        this.$store.commit('DELETE_MOVE', nPosBeforeEdit)
        // recalculate insert At, since the previous delete could have changed it
      }
      nInsertAt = discDataHelper.binarySearch(this.storeMoves, this.currentItem)
      if (this.currentItem.$.file) {
        // if not true, this shows red bg on Choose File button, i.e. invalid file
        delete this.currentItem._cellVariants // no effect if missing property}
      }
      // ***  ONLY SAVED TO CACHE HERE!
      // so far, we could have an undefined comment, which could be a problem later
      if (!this.currentItem.comment[0]) this.currentItem.comment[0] = ''
      this.$store.commit('BUFFER_MOVE_EDIT', { move: this.currentItem, pos: nInsertAt })
      const authorId = this.$store.state.settingsStore.settings.authorId
      const payload = {
        date: new Date().toISOString(),
        folder: this.RMEFolder,
        authorId: authorId,
        schemeProvider: authorId, // because I am saving this file, I am the new author!
        schemeDate: new Date().toISOString(),
        schemeName: this.RMEFolder
      }
      this.$store.commit('PERSIST_ALL_MOVES', payload)
      this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder)
      this.$store.commit('SET_RELOAD_CURRENT_SEQ')
    },
    addNew () {
      // from button in gui
      if (this.modePerRadios === 'comboMode') {
        // this should be a template to fill in with the modal
        this.tempCurrentComboHdr = {
          name: '',
          description: '',
          weight: 4,
          startup: false,
          hasUpshift: false,
          maxLength: 1,
          minLength: 1
        }
        // this flags that there is no "currentComboHdr": it's a new Combo
        this.currentComboHdr = {
          name: ''
        }
        this.$bvModal.show('modalEditComboHeader')
      } else { // it's not a Combo, it's a Move
        this.currentItem = {
          $: {
            name: '',
            file: '',
            length: '',
            lengthextendable: '',
            equivalency: '',
            level: 6,
            delaycount: '',
            setupbars: 0
          },
          comment: []
        }
        this.currentItemBeforeEdit = null
        this.$nextTick(function () {
          this.modalEditShown = true
          this.alertPollyServerError = false
        //  since it's handling an "add new" click, there isn't any
        //   this.surfCurrent()
        })
      }
    },
    chooseFile (rFile) {
      console.log('file arg: ' + rFile)
      this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
      this.$bvModal.show('modalPicker')
    },
    surfCurrent () {
      if (waveSurferInitDone) {
        // clear out old waveforms, else each diff file selected accumulates a wave form
        try {
          WAVESURFER.destroy()
        } catch (e) {
          // if it doesn't exist first time round
        }
      }
      WAVESURFER = WaveSurfer.create({
        container: '#waveform'
      })
      // WAVESURFER.init() // v2 update, not needed
      waveSurferInitDone = true
      // is there a call file name, if so: does it exist in vueltas?
      // 06-08-2022 removed test for being included in startup version of moves.xml: we might change the name, ask Polly to say it, and want to load Polly's response before saving the name change
      if (this.currentItem.$.file) {
        const filepath = path.join(this.CALLFOLDER, this.currentItem.$.file)
        fs.readFile(filepath, function (err, data) {
          if (data && !err) {
            console.log('read file, got data and no error: ' + filepath)
          }
          const fileData = new window.Blob([data])
          WAVESURFER.loadBlob(fileData)

          WAVESURFER.on('loading', function (e) {
            console.log('loading', e)
          })

          WAVESURFER.on('error', function (err) {
            console.log(err)
          })

          WAVESURFER.on('ready', function () {
            WAVESURFER.play()
          })
        })
      }
    },
    showDeleteDlg (item) {
      // PREVENT IF:
      //  - there are SEQUENCES using the move
      //  - there are COMBINATIONS using the move
      this.currentItem = _cloneDeep(item)

      this.seqFilesOldMoveName = 'name="' + item.$.name + '"'
      this.seqFilesNewMoveName = 'xx' // it's 'dry' (not executed), we don't use a real "new name"
      this.seqFilesReplaceOptionsXML = {
        files: this.SEQSPEC,
        from: new RegExp(this.escapeRegExp(this.seqFilesOldMoveName), 'g'),
        to: this.seqFilesNewMoveName,
        dry: true
      }
      const results = replace.sync(this.seqFilesReplaceOptionsXML) // READONLY just a dry run!
      this.seqFilesAffected = results.filter(item => item.hasChanged).map(item => path.basename(item.file))
      if (this.seqFilesAffected.length) {
        this.$bvModal.show('filesInfoNoDelete')
        return
      }

      const res = []
      let cname = ''
      let count = 0
      let totalCount = 0

      Object.entries(this.editedCombos).forEach(c => {
        cname = c[0] // name of combo
        count = 0
        Object.entries(c[1].nodes).forEach(n => {
          try {
            if (n[1].text.match(/"(.*[\w)])( \[\d-\d\])?"/u)[1] === item.$.name) {
              count += 1
            }
          } catch (e) {
            // expected error console.log(e + ': ' + n.text)
          }
        })
        if (count) res.push(' ' + cname + '(' + count + ')')
        totalCount += count
      })

      if (totalCount > 0) {
        this.comboFilesAffected = res // to module scope for template use
        this.$bvModal.show('combosInfoNoDelete')
        return
      }

      this.$nextTick(function () {
        const obj = {
          title: this.$i18n.t('dlg_title_ipl_delete', [this.currentItem.$.name]),
          message: this.$i18n.t('dlg_text_delete'), // string -- message alert
          type: 'warning', // string -- type : info (default), success, warning, error
          customCloseBtnText: 'Delete', // string -- close button text
          onClose: () => { this.deleteItem(this.currentItem) }, // function -- when close triggered
          useConfirmBtn: true, // boolean -- using confirm button
          customConfirmBtnText: 'Cancel' // string -- confirm button text
          // showXclose: false //boolean -- show x close button
        }
        this.$refs.simplert.openSimplert(obj)
      })
    },
    deleteItem () {
      const nDeleteAt = discDataHelper.binarySearch(this.storeMoves, this.currentItem)
      this.$store.commit('DELETE_MOVE', nDeleteAt)
      const authorId = this.$store.state.settingsStore.settings.authorId
      const schemeDate = this.$store.state.movesStore.schemeDate
      const schemeProvider = this.$store.state.movesStore.schemeProvider
      const schemeName = this.$store.state.movesStore.schemeName
      const asWhat = {
        folder: this.RMEFolder,
        date: new Date().toISOString(),
        authorId: authorId,
        schemeName: schemeName,
        schemeProvider: schemeProvider,
        schemeDate: schemeDate
      }
      this.$store.commit('PERSIST_ALL_MOVES', asWhat)
    },
    details (item) {
      this.currentItem = _cloneDeep(item)
      this.currentItemBeforeEdit = item // overwrite will save it, but just to the working buffer
      this.detailClicked = true
      this.$nextTick(function () {
        this.modalEditShown = true
        this.alertPollyServerError = false
        this.bLoading = false
        this.$nextTick(function () {
          this.surfCurrent()
        })
      })
    }
  }
}
</script>

<style scoped>
.table th,
.table td {
  padding: 0rem;
}
</style>
