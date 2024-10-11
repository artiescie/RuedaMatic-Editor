/*
Features of Permutations
our terms:
 - Combo is a set of moves, links, alternative branches, weights per branch.  Used to generate Perms.
 - Perm is a generated set of calls and durations, one of the possible permutations from the Combo.
 - permGenerator creates all possible Perms.
 - Insert algorithm picks perms that fit free spaces, then randomly selects one based on the 'weights' (odds)

CREATE COMBO in MOVES TAB

 - create, add header info, replace the default first move 'Continue' with your starting move
 - add a child to continue the combo.
 - add more than 1 child to create alternatives.  Each branch is equally 'likely'.  Or, you can click on each child and give it a 'weight'.
 - for moves that continue indefinitely, add a range of extra moves to the minimum.
     e.g. tumba francesa is at MINIMUM
      enchufla(2),
      then exit immediately:
        - pass fwr with left hand, take fwr with right hand (1)
        - exit with enchufla (1)
        - dqn (1)
      SO: 5 is the base length.  The length in the moves tab for Tumba Francesa.
      But in the middle it can extend indefinitely.
      Within a combo, you can specify a range IN ADDTION to the basic five.
       e.g. Min=2, Max=4 means the move could take from 7 to 9 beats in total (5+2, 5+4).
       The algorithm is then allowed to choose from whatever perm fits the point of insertion
       Fits: Alogirithm asses the sync points.  Where gear = 'accent', or 'climax'.
          If we can break to new move at all but 1 "accent", and exacty at a single "climax" shift, it's a fit.
       Fits: Alogirithm asses the sync points.  Where gear = 'accent', or 'climax'.
          If we can break to new move at all but 1 "accent", and exacty at a single "climax" shift, it's a fit.
       If more than one possibility, a choice is made - randomly... but weighted by the branches and weights in the Combo graph.

USE OF COMBOS in SONGS tab

NON CLIMAX/SPICY section of the song (all in the less intense gear "mellow"...
  ... except for Accent, we suggest there is usually an emphasis every 8 beats.  Don't pack accent too densely!)

- In the BEATS view: the gear "accent" should be assigned to beats where there's a fresh start in the music.
   I.e. Start of a verse, a phrase, certain percussion (cymbal etc)
   BUT: Something that would be a signal to an imaginary typical suelta dancer... at "La Tropical" in Havana...
      to change their step... and express the musical change with a step change.
      Music may be all the same gear, but there is still phrases starting and ending... and small musical punctuation.
   If there's an important-for-dancers "upshift", bomba or climax in the song...
      THEN: call it "climax" gear.  Often there's one climax gear a song, maybe another sometimes...
- In the CALLS view:
   Click on an empty beat (i.e. no move is already there)... that will raise the Move/Combo dlg.  Select a Combo.
   THEN the program picks a perm so that a MOVE CHANGE corresponds to the ACCENT.

NON-HOMOGENEOUS
  UPSHIFT section of the song (has 1+ 'accent' gears, and then a 'climax' or 'spicy')

- When designing the Combo (In the MOVES tab) : Mark a move in the Combo as Climax or spicy.
   THEN in the Songs Tab, click a beat to add a Combo:
   IF the range of the Combo includes a "beat" marked 'climax' or 'spicy')...
   THEN select from JUST the perms where the UPSHIFT occurs at the same time as the BEAT.
   So: matching the dance to the music.
*/

<template>
  <div>
    <div v-if="!comboFlowShown">
      <simplert :useRadius="true" :useIcon="true" ref="simplert"/>
      <b-alert :show="dismissCountDown" dismissible variant="warning" @dismiss-count-down="alertCountingDown">
        <h3>Hit 'space' on every 1 count</h3>
        <b-progress :max="dismissSecs" :value="dismissCountDown" variant="warning" height="8px" />
      </b-alert>
      <b-row ref="expertControls" v-show="this.$store.state.settingsStore.settings.userType==2" style="height:45px;margin:0;"
        title="Beat times and gears: saved in [song].xml file.
Call seq: saved in [song].seq file.
Moves: saved in moves.xml file">
        <b-col md="4" style="margin:0;" >
          <input type="radio" id="timeMode" value="timeMode" v-model="modePerRadios">
          <label for="timeMode" title="MODE: Beats must be created first; they are saved in the beats XML file (HIT ALT-B)">Beats</label>
          <input type="radio" id="gearMode" value="gearMode" v-model="modePerRadios">
          <label for="gearMode" title="MODE: Gears are saved in the beats XML file.  They are hints about music, to help select calls.
A Cambio gear is used to help automate meter changes - for example, a clave change in a song (see docs) (HIT ALT-G).">Gears</label>
          <input type="radio" id="callsMode" value="callsMode" v-model="modePerRadios">
          <label for="callsMode" title="MODE: Your Call seqence is saved in SEQ file (HIT ALT-C)">Call sequence</label>
        </b-col>
        <b-col v-show="mode === 'timeMode'" md="3" style="margin:0;">
            <span v-show="mode === 'timeMode'" title="Adjust all times by approx 1/4 beat">
                Nudge:
              <b-button :disabled="disableNudge" class="mx-0" @click="nudgeBeatsUp"><v-icon  class="m-1" scale=0.6 name="plus"/></b-button>
              <b-button :disabled="disableNudge" class="mx-0" @click="nudgeBeatsDown"><v-icon class="m-1" scale=0.6 name="minus"/></b-button>
            </span>
        </b-col>
        <b-col v-show="mode === 'timeMode'" md="4" style="margin:0;">
          <b-button class="m-2" @click="startNewBeatsCountdown" title="Play song and record all new beats" ref="btnRecordNew" :disabled="!waveIsLoaded" variant="danger">
              Record new beats
          </b-button>
        </b-col>
        <b-col v-show="mode !== 'timeMode'" md="4" style="margin:0;" id="more-buttons">
            <span v-show="mode === 'callsMode'" title="Shift all calls left or right (drop first or last)">
                Shift calls:
              <b-button size="sm" :disabled="disableNudge" class="mx-0" @click="nudgeCallsUp"><v-icon  class="m-1" scale=0.6 name="plus"/></b-button>
              <b-button size="sm" :disabled="disableNudge" class="mx-0" @click="nudgeCallsDown"><v-icon class="m-1" scale=0.6 name="minus"/></b-button>
              <b-button size="sm" class="m-2" @click="zapTheCalls(0, undefined, true)" title="All calls in this song will be deleted!">Delete All</b-button>
            </span>
        </b-col>
        <b-col v-show="mode === 'callsMode'">
          <b-button size="sm" variant="warning" class="mx-0" @click="seqTagsWorking=seqTags;showSeqTags=true" title="Change tags: distinguish beginner, adv, emphasis...
so you can filter, select in the loader.">
            Tags
          </b-button>
          <span>
            : {{ seqTags }}
          </span>
        </b-col>
      </b-row>
    </div>
    <div>
      <div v-if="!comboFlowShown" :title="callsModeTooltipInMargins()">
        <ul class="eightUp" :style="{ height: (cardHeight - 145) + 'px', position: 'relative', 'overflow-y': 'scroll'} ">
          <li class="eightUp" v-for="(item, index) in lstTimesWork" :key="item.time" @click="clickListItem" :id="'beat' + index">
            <b-button v-show="mode === 'timeMode'" :variant="checkForWeird(index)" @click="details(index)" :class="{boing: item.boing}"
                style="height:35px;width:105px;white-space:normal;" :title="'Start time, and interal to next beat.' + (item.comment || '(no comment)') + '[' + index + ']'">
                <!-- show the duration for the current beat, not the prior beat   -->
              {{ item.time.toFixed(1) }} <v-icon  class="m-1" scale=0.6 name="hand-lizard"/>{{ lstTimesWork[index + 1]? (lstTimesWork[index + 1].time - item.time).toFixed(1):0 }}
            </b-button>
            <b-button v-show="mode === 'gearMode'" :variant="calcVariant(item)" @click="details(index)" :class="{boing: item.boing}"
                style="height:35px;width:105px;white-space:normal;" :title="(item.comment || '(no comment)') + '[' + index + ']'">
              {{ item.gear }}
            </b-button>
            <b-button v-show="mode === 'callsMode'" :variant="calcVariant(item)" @click="details(index)" :class="{boing: item.boing,
                extensionbeat: isExtension(item, index), notextensionbeat: !isExtension(item, index)}"
                style="height:35px;width:105px;" :title="getItemTitle(item, index)">
              {{ displayMove(item, index) }}
            </b-button>
          </li>
        </ul>
      </div>
      <div v-if="comboFlowShown">
        <b-card title=""
          header-tag="header"
          tag="article"
          class="mb-2">
            <b-row>
              <b-col>
                <h4>{{currentComboHdr.name}}</h4>
                <h6>{{currentComboHdr.description}}</h6>
                <ul>
                <li>Startup: {{currentComboHdr.startup || false}}</li>
                <li>Length max: {{currentComboHdr.maxLength}} min: {{currentComboHdr.minLength}}</li>
                <li>Weight: {{currentComboHdr.weight}}  Has Upshift: {{currentComboHdr.hasUpshift}}</li>
                </ul>
              </b-col>
            </b-row>
          <p>Combos can be edited on the Moves tab</p>
          <b-card-body>
              <!-- @nodeClick="nodeClick" -->
            <RMMermaid
              :graph-data="graphForMermaid" />
          </b-card-body>
          <b-card-body>
            <div v-if="autoFiller.okPerms.length">
              <h4>Allowed Permutations to fit gears in the song, 1 randomly selected</h4>
              <p>Format: The name shows abbreviated moves included.  The format is: 3 chars of move name, * for upshift here, followed by numeric length of move.
              And at the end, total beats in particular permutation.</p>
              <p>The legal moves must fit to Accent and Climax/Spicy gears found in the song.  You can allow one miss using the check box above on the right.</p>
              <b-form-group label="One is randomly selected.  You may choose another if available.  Hover over combo for full details!">
                <div v-for="(perm, idx) in autoFiller.okPerms" :title="getPermTitle(perm)" :key="perm.hdr.id">
                  <b-form-radio v-model="autoFiller.selPermIndex" name="perm-radios" :value="idx">{{perm.hdr.id}}</b-form-radio>
                </div>
              </b-form-group>
              <b-button variant="warning" @click="usePerm();comboFlowShown = false" title="Use the selected combo below; or change it, then click"><v-icon class="m-1" name="plus-square"/>Add Selected</b-button>
              <b-button variant="success" @click="comboFlowShown = false"><v-icon  class="m-1" name="angle-left"/>Back to Song</b-button>
              <p>Click "Add Selected" to add the sequence of moves in the selected combo (see list below).  Or, change selection then click.</p>
            </div>
            <div v-else>
              <h4>No Allowed Permutations fit the gear shifts in the song!</h4>
              <p>If there's a Accent gear, a move call must fall exactly at that point.
                This is to support the goal of the dancers "Dancing with the music".</p>
              <b-button variant="success" @click="comboFlowShown = false"><v-icon  class="m-1" name="angle-left"/>Back to Song</b-button>
            </div>
          </b-card-body>
        </b-card>
      </div>
    </div>
    <!--the modals: edit a move info, click so there is a "current item" -->
    <!--v-if prevents error on startup-->
    <b-modal id="modalNoMoveHere" v-if="currentItem" title="Clicked on continuation" ok-only>
      This is a continuation of a previous move.  No move can be placed here unless the previous move is changed or removed.
    </b-modal>
    <b-modal id="modalConflict" v-if="currentItem" title="Runs into existing move" ok-only>
      This would overwrite an existing move.  Change the other move first.  Or select a shorter move here.
    </b-modal>
    <b-modal id="modalConfirmDelete" v-if="currentItem" title="Delete move(s)?" ok-title='Cancel' ok-only>
      <b-container fluid>
      <b-row class="mb-1">
        <b-col cols="6">Delete just this move</b-col>
        <b-col><b-button style="margin:0px;padding:6px 12px;border:1;" @click="deleteThisMove" title="Delete just this move" variant="warning">Delete this move</b-button></b-col>
      </b-row>
      <b-row class="mb-1">
        <b-col cols="6">Delete all from here</b-col>
        <!-- method zapTheCalls(index, shift, allRemaining(default: false)) -->
        <b-col><b-button style="margin:0px;padding:6px 12px;border:1;" @click="zapTheCalls(currentBeatIndex, undefined, true)" title="Delete this move, and all the moves after" variant="danger">Delete Starting Here</b-button></b-col>
      </b-row>
      <b-row class="mb-1">
        <b-col cols="6">Shift all to right</b-col>
        <b-col><b-button style="margin:0px;padding:6px 12px;border:1;" @click="zapTheCalls(currentBeatIndex, 1)" title="Shift moves from here to the right" variant="warning">Shift right</b-button></b-col>
      </b-row>
      <b-row class="mb-1">
        <b-col cols="6">Shift all to left, deleting this move</b-col>
        <b-col><b-button style="margin:0px;padding:6px 12px;border:1;" @click="zapTheCalls(currentBeatIndex, -1)" title="Delete this move, shift the rest to the left" variant="danger">Delete 1, shift left</b-button></b-col>
      </b-row>
      </b-container>
    </b-modal>

    <!-- MAIN EDIT MODAL, all modes -->
    <b-modal id="modalEdit" size="lg" v-if="currentItem" v-model="modalEditShown" :title="getModalTitle()" close-title="Cancel"
        @cancel="cancelEdit" @ok="saveEdit" @hide="removeDlgAlerts()" @shown="setFocus();moveFilter=null;comboFilter=null">
      <!-- simple editing of rows of beats to modify one of their ASPECTS: as beat time, or gear, or move -->
      <!-- case of raw beat time: more complex now - go through details() to show them modalBeatAction dlg, go to onBeatAction to set this.beatAction
      and then finally details, go back to details() with this.beatAction set and determining what happens (edit, delete1, deleteRest, insert).  -->
      <b-form-fieldset v-if="mode === 'timeMode'" ref="time" title="Start time (secs) for this interval" label-cols="2" label="Time: ">
        <b-form-input ref="newTimeInput" @keydown.enter="saveEdit" v-model.number="currentItem.time" />
      </b-form-fieldset>
      <b-container v-else-if="mode === 'gearMode'" >
        <b-form-fieldset ref="gear" label-cols="3" title="Timba gear/comment" label="Gear:">
          <!-- must use standard select to get the colors we want in the dropdown list -->
          <select ref="gearSelect" v-model="currentItem.gear">
          <option :key="option.value" v-for="option in gearOptions" :style=option.style :value="option.value">
            {{ option.text }}
          </option>
          </select>
        </b-form-fieldset>
        <b-form-fieldset ref="comment" title="Text to help caller select a move here" label-cols="3" label="Comment: ">
          <b-form-input v-model="currentItem.comment" />
        </b-form-fieldset>
        <b-row v-if="isValidCambioShift" class="mb-1" title="Is there a clave change at this cambio?  You can switch counts 1 and 5 between here and next cambio.
WHAT THE SHIFT WILL DO:
- add a measure to the end of range
- make that new measure short, and the first measure short as well (4-counts, not 8-counts)
- shift the measures in between, make them a half measure sooner
- basically, switches the 1 beat and 5 beat between the 2 cambio gears">
          <b-col cols="3"><p>Shift beat times in cambio:</p></b-col>
          <b-col><b-button style="margin:0px;padding:6px 12px;border:1;" @click="validateForCambioShift"
            variant="danger">Shift times</b-button></b-col>
        </b-row>
      </b-container>
      <b-container v-else fluid>  <!-- v-else:  so this will be callsMode! -->
        <div>
          <input type="radio" id="moveMode" value="moveMode" v-model="movesCombosOrAuto">
          <label for="moveMode" title="Choose Moves of this scheme">Moves</label>
          <input type="radio" id="comboMode" value="comboMode" v-model="movesCombosOrAuto">
          <label for="comboMode" title="Choose Combo of moves in this scheme">Combos</label>
          <input type="radio" id="autoMode" value="autoMode" v-model="movesCombosOrAuto">
          <label for="autoMode" title="Use combos to automatically fill remaining beats">Autofill</label>
        </div>
        <b-row  style="height: 60px;">
          <b-form-group class="my-0" ref="filterGrp">
            <b-input-group v-if="movesCombosOrAuto === 'moveMode'">
              <b-form-input v-model="moveFilter" ref="filterInput" style="width: 300;" placeholder="Filter" debounce="100"/>
              <b-input-group-append>
                <b-btn :disabled="!moveFilter" @click="moveFilter = null">X</b-btn>
                <!-- clear the filter -->
              </b-input-group-append>
            </b-input-group>
            <b-input-group v-if="movesCombosOrAuto === 'comboMode'">
              <b-form-input v-model="comboFilter" ref="filterInput2" style="width: 300;" placeholder="Filter" debounce="100"/>
              <b-input-group-append>
                <b-btn :disabled="!comboFilter" @click="comboFilter = null">X</b-btn>
                <!-- clear the filter -->
              </b-input-group-append>
            </b-input-group>
          </b-form-group>
        </b-row>
        <b-table v-if="movesCombosOrAuto === 'moveMode'" show-empty empty-text="Load me!" ref="moveTable" v-model="lstModalDisplayedMoves" striped small hover
          :items="pickerMoves" :filter-function="customFilter" :fields="moveFields" :filter="moveFilter"
          @row-clicked="onMoveRowClicked" title="try: arrow down and enter key">
        </b-table>
        <b-table v-else-if="movesCombosOrAuto === 'comboMode'" ref="comboTable" v-model="lstModalDisplayedCombos" striped small hover primary-key="name"
          :items="comboList" :filter-function="customFilter" :fields="comboFields" :filter="comboFilter" id="combo-table"
          title="try: arrow down and enter key">
          <!-- only one field needs a template... Actions -->
          <template v-slot:cell(actions)="row">
            <b-btn variant="warning" @click="showFlow({$: row.item})">Select
            </b-btn>
          </template>
        </b-table>
        <p v-else-if="movesCombosOrAuto === 'autoMode' && Object.entries(editedCombos).length === 0" >
          You must create Combos before you can Autofill moves for a song.
        </p>
        <p v-else-if="movesCombosOrAuto === 'autoMode' && Object.entries(editedCombos).length > 0" >
          Push OK to autofill the moves for the song.  <p>Use autofill on songs that have NO SAVED SEQUENCE that you want to keep!
            Autofill will try to match the gears (Accent/Spicy/Climax) ... so dancing works with the song's musicality.</p>
            <p>If you want to save an autofill sequence, just change or add any move and the result is saved.</p>
        </p>
        <!-- combo-table__row_Comb -->
      </b-container>
    </b-modal>

    <b-modal id="modalBeatAction" v-if="currentItem" @ok="cancelEdit" ok-only ok-title="Cancel" ok-variant="secondary" title="Modify Beats" close-title="Cancel">
      <!-- Cancel button is the OK relabelled: so @ok is on Cancel! -->
      <b-container fluid>
        <b-row class="mb-1">
          <b-col cols="8"><p>Edit beat (change value (seconds)</p></b-col>
          <b-col><b-button variant="primary" style="margin:0px;padding:6px 12px;border:1;" @click="onBeatAction('edit')">Edit</b-button></b-col>
        </b-row>
        <b-row class="mb-1">
          <b-col cols="8"><p>Delete beat (no change to other beats)</p></b-col>
          <b-col><b-button variant="warning" style="margin:0px;padding:6px 12px;border:1;" @click="onBeatAction('delete')">Del 1</b-button></b-col>
        </b-row>
        <b-row class="mb-1">
          <b-col cols="8"><p>Delete this, and all remaining beats</p></b-col>
          <b-col><b-button variant="warning" style="margin:0px;padding:6px 12px;border:1;" @click="onBeatAction('deleteRest')">Del-></b-button></b-col>
        </b-row>
        <b-row class="mb-1">
          <b-col cols="8"><p>Insert a beat before this one</p></b-col>
          <b-col><b-button variant="primary" style="margin:0px;padding:6px 12px;border:1;" @click="onBeatAction('insert')">Insert</b-button></b-col>
        </b-row>
      </b-container>
    </b-modal>
    <b-modal id="performCambiosTwoOptions" hide-footer title="Shift beats - Confirm">
      <div class="d-block">
        <h3 ><em>May we suggest:</em></h3>
        <h4 >Read docs, backup XML manually first!</h4>
      </div>
      <hr>
      <p v-if='ptrCambioEnd' class="mx-2" align="center">(From here through next cambio is the most common shift)</p>
      <p v-else class="mx-2" align="center">No closing cambio found, only option is the rest of the song</p>
      <b-button :disabled='!ptrCambioEnd' class="mt-3" variant="danger" block @click="$bvModal.hide('performCambiosTwoOptions');performCambioShift()">CHANGE From here through next cambio</b-button>
      <b-button class="mt-2" variant="danger" block @click="$bvModal.hide('performCambiosTwoOptions');ptrCambioEnd = null; performCambioShift()">CHANGE all remaining</b-button>
      <hr>
      <p class="mx-2" align="center">('Change on the 5' is the most common shift)</p>
      <b-form-select v-model="cambioShiftSelected" :options="cambioShiftOptions" class="mx-2"></b-form-select>
      <hr>
        <b-button class="mt-2" variant="secondary" block @click="$bvModal.hide('performCambiosTwoOptions')">Cancel</b-button>
    </b-modal>
    <b-modal id="seqTags" title="Tags for Sequence (20 char)" @shown="$refs.seqTags.focus()" v-model="showSeqTags" :ok-disabled="seqTagsWorkingTooLong" @ok="onOKSeqTags" >
      <b-form-fieldset ref="time" title="Tag(s) to help choose this in song list" label-cols="2" label="Tags: ">
        <b-form-input ref="seqTags" v-model="seqTagsWorking" @keydown.enter="onOKSeqTags" />
      </b-form-fieldset>
    </b-modal>
  </div>
</template>

<script>
import _mean from 'lodash/mean'
import _range from 'lodash/range'
import _cloneDeep from 'lodash/cloneDeep'
import RMMermaid from '../Moves/RMMermaid'
// eslint-disable-next-line no-unused-vars
import { toRegex, toString } from 'diacritic-regex'
import AutoFiller from './AutoFiller'
import path from 'path'
import DiscDataHelper from '../../store/shared/DiscDataHelper.js'
import electron from 'electron'
import fs from 'fs-extra'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const DLDIR = electron.remote.app.getPath('downloads')
const discDataHelper = new DiscDataHelper()

// there is plain JS code at the top level imported from a prior actionscript program
// basically it's for analyzing the beats and doing a few types of quick fix on them

class BeatTime {
  constructor (time, gear = 'mellow', comment = '') {
    this.time = time
    this.gear = gear
    this.comment = comment // free form comment
    this.bsVariant = 'success' // or 'danger', 'warning'. 'info' not used here
  }
}

class Gap {
  constructor (lenGap, endBeatIndex) {
    this.len = lenGap
    this.endBeatIndex = endBeatIndex // After a diagnostic pass, is the gap-ending BeatTime.
    // ...which is later used to show bad gaps on the original BeatTime, via bsVariant field.
    // After a fix pass, it is just -1: just a marker, no further use
  }
}

function analyzeBeatsImpl (bCalcOnly = true, bFileAnalyzedWasPreexisting) {
  // ===================
  //  several helper functions first:
  // on each tap
  // - add new gap to GAPS array [incremental]
  // - redo the mean calc [entire]
  // - exercise the analyzeBeats loop beginning at size + 1 [incremental]
  function improvedMean (aryGaps) {
    //  called only by analyzeBeats
    // get a realistic mean, by making a token attempt to
    // throw out outlier data first.

    // 1- sort the array
    const srtAryGaps = aryGaps.map(x => x.len)
    srtAryGaps.sort() // arg in ActionScript was Array.NUMERIC

    // 2- find the number we can discard.  Min to leave is 50% or 5, whichever is least.
    const iDiscardMax = srtAryGaps.length - Math.max(5, srtAryGaps.length * 0.5)

    // 3 - discard the biggest gaps from either top or bottom end
    let iDiscarded = 0
    let bDone = false
    let iMean
    while (bDone === false && iDiscarded < iDiscardMax) {
      iMean = _mean(srtAryGaps)
      const iGapDeltaStart = iMean - srtAryGaps[0] // start is the smallest gaps
      const iGapDeltaEnd = Math.abs(iMean - srtAryGaps[srtAryGaps.length - 1]) // end is the largest gaps
      if (
        iGapDeltaStart / iMean > iGapDeltaEnd / iMean &&
        iGapDeltaStart / iMean > 0.02
      ) {
        // Fatty is at the START, drop it
        srtAryGaps.shift()
        iDiscarded += 1
      } else if (
        iGapDeltaEnd / iMean >= iGapDeltaStart / iMean &&
        iGapDeltaEnd / iMean > 0.02
      ) {
        // Fatty is at the END, drop it
        srtAryGaps.pop()
        iDiscarded += 1
      } else {
        // No more outlier data to trim!
        bDone = true
      }
    }
    console.log('iDiscarded:' + iDiscarded)

    // 4- take the mean
    return _mean(srtAryGaps)
  }

  // OUTER MAIN starts
  // main arrays we work with are initialized here
  const aryGaps = [] // new Array() of BeatTime objects
  //  === HERE IS THE CORRECTED ARRAY OF GAPS ===
  //  while we look for problems, we also created a fixed version
  //  however it is no longer used in the interface, there are point-fixes now
  //  that are better than magic ;-)
  const aryGapsFixed = [] // create a corrected version, Array() of BeatTime objects
  for (let iLoop = 1; iLoop < this.lstTimesWork.length; iLoop++) { // aryGaps, aryGapsFixed
    aryGaps.push(
      new Gap(this.lstTimesWork[iLoop].time - this.lstTimesWork[iLoop - 1].time, iLoop)
    )
    aryGapsFixed.push(
      new Gap(this.lstTimesWork[iLoop].time - this.lstTimesWork[iLoop - 1].time, iLoop)
    )
  }

  const nMean = improvedMean(aryGaps.concat()) // concat ensures original array is not changed in the sub
  this.meanGapImproved = nMean
  this.$emit('meanCalculated', nMean)
  // console.log('SD/Mean/%:' + nSD + '/' + nMean + '/' + Math.round(nSD / nMean * 100))

  // if a fairly long one is found, followed by a short one, and total is close to ave: interpolate
  //   same: short one found, followed by a long one

  let iBumpCounter = 0 // after each iter, bump the loop counter if non-zero
  let timeFor2 = 0 // computed for test 1, reused in test 3: combined n, n+1 length
  const highEndErr = 0.08
  const lowEndErr = highEndErr * 1 / (1 + highEndErr)

  // aryGapsFixed - see comments at declaration
  for (let iLoop2 = 0; iLoop2 < aryGapsFixed.length; iLoop2++) {
    iBumpCounter = 0 // reinit for each loop
    timeFor2 = 0

    // USE CASE: maybe the user made some errors in setting times.
    //  As long as it isn't TOO screwed up, let's try to make it better
    //
    // 1 - EXTRA BEAT
    //   add i, i+1: if within range for a single beat, eliminate the middle one.
    //     (what if user switched to offbeat by accident)
    //   loop adjust: yes
    // 2 - MISSING BEAT
    //   compare i to mean.  If a multiple up to (say) 8x mean, within 1.08/.926, THEN put fixes in FIX array
    //   loop adjust: no
    // 3 - EARLY/LATE BEAT
    //   compare i and i+1, if "i" is late or early, then put the fix in the FIX array
    //   loop adjust: no
    // ------------------------

    // 1 DOUBLE HIT - add i, i+1.  if together ~ mean, then consider the first a mistake.  Remove and incr gap 2
    const that = this // inside if statements sometimes can't see 'this' ??
    if (iLoop2 < aryGapsFixed.length - 3) { // the gaps length is 1 less than the original times.  Then the loop uses a +1 on the value.  So here, -3
      // DOCS: something that passes OK and might not be obvious:
      //  BEAT / CLAVE SWITCH - i.e. skipping 5-6-7-8: doesn't fit narrow pattern of an early/late beat!
      that.$store.commit('SET_BEAT_WARNING', { ind: iLoop2 + 1, variant: 'success' })
      // need n+1 comparison
      timeFor2 = aryGapsFixed[iLoop2].len + aryGapsFixed[iLoop2 + 1].len
      if (timeFor2 < nMean * (1 + highEndErr) && timeFor2 > nMean * (1 - lowEndErr)) {
        // there are 2 gaps where there should be 1... kill both, replace with single = total of both
        aryGapsFixed.splice(iLoop2, 2, new Gap(timeFor2, aryGapsFixed[iLoop2 + 1].endBeatIndex))
        that.$store.commit('SET_BEAT_WARNING', { ind: iLoop2 + 1, variant: 'warning' }) // visual flag for odd beats
        if (!that.bAlreadyWarnedFlag) {
          that.$bvToast.toast('Warning!', {
            title: 'Beats are not even.  Insert/fix/delete beats - or rerecord them - unless it was intended!',
            autoHideDelay: 2000
          })
          that.$emit('already-warned-flag', true)
        }
        iBumpCounter = 1
      }
    }

    // 2 MISSED BEAT - is gap2 an even multiple of the mean, within the allowed error
    const mult = Math.round(aryGapsFixed[iLoop2].len / nMean)
    if (mult > 1) {
      that.$store.commit('SET_BEAT_WARNING', { ind: iLoop2 + 1, variant: 'warning' })

      if (!that.bAlreadyWarnedFlag) {
        that.$bvToast.toast('Warning!', {
          title: 'Beats are not even.  Insert/fix/delete beats - or rerecord them - unless it was intended!',
          autoHideDelay: 8000
        })
        that.$emit('already-warned-flag', true)
      }
      const iNewGap = aryGapsFixed[iLoop2].len / mult
      // insert mult gaps
      // add multiple
      const inserted = Array.from(
        _range(1, mult + 1),
        () => new Gap(iNewGap, aryGapsFixed[iLoop2].endBeatIndex)
      )
      aryGapsFixed.splice(iLoop2, 1, ...inserted)
      // }
    }

    // 3 LATE/EARLY - is gap and gap+1 == 2 * mean, but one of them is far from mean?  I.e., is late or early
    if (iLoop2 < aryGapsFixed.length - 1) {
      // timeFor2 init'd in 1 IMPL
      if (timeFor2 > nMean * 2 * (1 - lowEndErr) && timeFor2 < nMean * 2 * (1 + highEndErr)) {
        if (aryGapsFixed[iLoop2].len < nMean * (1 - lowEndErr) || aryGapsFixed[iLoop2].len > nMean * (1 + highEndErr)) {
          // beat 1 is early or late, change the length to timeFor2/2
          aryGapsFixed[iLoop2].len = timeFor2 / 2
          aryGapsFixed[iLoop2 + 1].len = timeFor2 / 2
          that.$store.commit('SET_BEAT_WARNING', { ind: iLoop2 + 1, variant: 'warning' })
          if (!that.bAlreadyWarnedFlag) {
            that.$bvToast.toast('Warning!', {
              title: 'Beat appears to be late/early.  If not intended - you can try to fix manually later!',
              autoHideDelay: 2000
            })
            that.$emit('already-warned-flag', true)
          }
        }
      }
    }
    iLoop2 += iBumpCounter
  }
}

export default {
  components: { RMMermaid },
  data () {
    return {
      autoFiller: null, // will be instance of autoFiller class
      autofillAudit: null, // will hold recent autofill audit, in case user wants to dump it with Alt-X
      showSeqTags: false,
      seqTagsWorking: '',
      cambioShiftSelected: -4,
      cambioShiftOptions: [
        { value: -6, text: 'Change is on the 3' },
        { value: -4, text: 'Change is on the 5' },
        { value: -2, text: 'Change is on the 7' }
      ],
      ptrCambioEnd: null, // used for cambio time shift (change the 1 count to the 5 count with partial measure)
      comboFlowShown: false,
      currentComboHdr: null,
      currCbo: null,
      comboFilter: null,
      movesCombosOrAuto: 'moveMode',
      modalEditShown: false,
      lstModalDisplayedMoves: [],
      lstModalDisplayedCombos: [],
      beatAction: null, // 'edit', 'delete', 'deleteRest', 'insert'
      disableNudge: false, // if nudge repeats too fast, won't have time to save the results between
      // countdown alert
      showAlert: false,
      dismissSecs: 3,
      dismissCountDown: 0,
      modePerRadios: 'callsMode',
      moveFilter: null,
      moveFields: [{ key: 'name', label: 'Name', sortable: true },
        { key: 'length', label: 'Length', sortable: true },
        { key: 'lengthextendable', label: 'Ext', sortable: true },
        { key: 'delaycount', label: 'Delay' },
        { key: 'level', label: 'Lvl', sortable: true },
        { key: 'comment', label: 'Comment' }],
      // moveFields: [{ key: 'name', label: 'Name' }, { key: 'length', label: 'Length' }, { key: 'delaycount', label: 'Delay' }, { key: 'comment', label: 'Comment' }],
      comboFields: [{ key: 'name', label: 'Name' },
        { key: 'startup', label: 'Startup', formatter: val => val === 'true' || val === true ? '▶️' : '', headerTitle: 'Use for start and restart of dancing' },
        { key: 'weight', label: 'Weight' },
        { key: 'hasUpshift', label: 'Has Upshift', formatter: val => val === 'true' ? '🔥' : '', headerTitle: 'Contains spicy/climax marked move (upshift)' },
        { key: 'description', label: 'Description' },
        { key: 'minLength', label: 'Min' },
        { key: 'maxLength', label: 'Max' },
        { key: 'actions', label: 'Actions' }],
      currentItem: null, // the beat being edited, if any (click on a beat)
      currentBeatIndex: null, // the beat being edited, if any (click on a beat)
      currentItemCanInsertMove: false, // on click item, leave flag here in details method, if OK to add a move
      waveSurferOrig: null,
      meanGapImproved: 0,
      gearOptions: [
        { value: null, text: 'Please select a gear:' },
        { value: 'accent', text: 'Accent', style: { color: 'green', backgroundColor: 'white' } },
        { value: 'building', text: 'Building', style: { color: 'yellow', backgroundColor: '#adb5bd ' } },
        { value: 'climax', text: 'Climax', style: { color: 'teal', backgroundColor: 'white' } },
        { value: 'mellow', text: 'Mellow', style: { color: '#343a40', backgroundColor: 'white' } }, // dark gray
        { value: 'rumba', text: 'Rumba', style: { color: '#6c757d', backgroundColor: 'white' } }, // medium gray
        { value: 'spicy', text: 'Spicy', style: { color: 'red', backgroundColor: 'white' } }, // this can be despelote - call it sensual?
        { value: 'cambio', text: 'Cambio (only for meter change!)', style: { color: 'blue', backgroundColor: 'white' } }
      ]
    }
  },
  props: ['cardHeight', 'waveSurfer', 'waveIsLoaded', 'stateRecordingBeats', 'awaitingBeatsSave',
    'scrollMe', 'tellMusicChanged', 'bAlreadyWarnedFlag', 'showMusicLoader', 'autofillAuditSongs'],
  watch: {
    autofillAuditSongs (newValue) {
      // the same code is used to dump autofill steps by either compoenent (Songs or Measures)
      //  by reusing this key
      this.autofillAudit = newValue
    },
    seqTagsWorkingTooLong (newValue) {
      if (newValue) {
        this.$bvToast.toast('Too long!', {
          title: 'Max length: 20',
          autoHideDelay: 4000
        })
      }
    },
    showMusicLoader (newValue) {
      if (newValue) {
        // Measures: We don't see deactivated event when Loader is on, because we use v-show to keep wavesurfer visible.
        console.log('Music Loader being shown, remove keyDownHandler')
        document.removeEventListener('keydown', this.keyDownHandler)
      } else {
        document.addEventListener('keydown', this.keyDownHandler)
      }
    },
    bAlreadyWarnedFlag (newValue) {
      console.log('Measures hit: alreadywarned: ' + newValue)
    },
    $route (to, from) {
      // on tab change (route change)
      this.comboFlowShown = false
    },
    RMEFolder (newValue) {
      this.comboFlowShown = false
    },
    tellMusicChanged (newValue) {
      this.comboFlowShown = false
    },
    movesCombosOrAuto (newValue) {
      console.log(newValue)
    },
    modePerRadios (newValue) {
      this.$emit('changeMode', newValue)
    },
    stateRecordingBeats (newValue) {
      // orig value is cached in subc, unless we watch
      return newValue
    },
    waveSurfer (newValue) {
      this.waveSurferOrig = newValue
    },
    lstTimesWork () {
      this.analyzeBeats(true) // calculation only
    }
  },
  created: function () {
    console.log('CREATED Measures:' + this.lstTimesWork.length)
  },
  activated: function () {
    document.addEventListener('keydown', this.keyDownHandler)
    // see https://laracasts.com/discuss/channels/vue/how-to-add-atkeyup-globally-with-vue?page=1 -->
    console.log('ACTIVATED Measures')
  },
  deactivated: function () {
    console.log('DEACTIVATED Measures')
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  updated: function () {
    console.log('UPDATED Measures')
  },
  computed: {
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
        return this.$store.state.movesStore.editedMoves.filter(function (mv) {
          if (mv.$.name === 'Continue') {
            return false
          } else {
            return true
          }
        })
      }
    },
    seqTags () {
      return this.$store.state.beatsAndSequenceStore.seqTags
    },
    seqTagsWorkingTooLong () {
      return this.seqTagsWorking ? this.seqTagsWorking.length > 20 : false
    },
    isValidCambioShift () {
      // FOR Weird beat changes in the song, quite common in all kinds of salsa.
      // We'll handle three casese:
      // 1 - Most common: the 8-count pattern is broken, by an inserted half measure, continues normally for a while, and then goes back to normal... by inserting another 4-count.
      // 2 - The 8-count is broken by inserting an unusual measure length... say 1, 2, 3, 4, 5, 6, 7.  This shift is applied from current spot, to the end of the song.
      // 3 - #2 shift is applied.  But then later in the song, another shift is found... and is re-applied to the rest of the song from there.
      //  OR
      // If it's more complicated that that ... you may need to put the data into Excel and calculate values semi-manually yourself

      // SYSTEM NOTE: as a method, this was always called twice.  No harm in that, just that as odd.
      // However... In the main path returning true
      //  it was called infinite no. of times (inf loop).  No idea why.
      //  But as a computed variable, it is only called once and works correctly.  Whatever... it works this way.

      // if it hasn't been marked gear === 'cambio' we don't even show an option
      const that = this
      if (that.lstTimesWork[that.currentBeatIndex].gear === 'cambio' &&
          that.currentBeatIndex !== that.lstTimesWork.length - 1) {
        return true
      } else {
        return false
      }
    },
    graphForMermaid () {
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
      const combo = _cloneDeep(this.editedCombos[this.currentComboHdr.$.name])
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
          }
          narr.push(Object.assign({ id: k }, n))
        })
      } catch (e) {
        console.log('No combos for this scheme!')
      }
      return narr
    },
    comboList: {
      get () {
        return Object.keys(this.editedCombos).map(n => {
          const o = this.editedCombos[n]
          return { name: n, startup: o.$.startup, weight: o.$.weight, hasUpshift: o.$.hasUpshift, description: o.$.description, minLength: o.$.minLength, maxLength: o.$.maxLength, gears: o.$.gears }
        })
      }
    },
    editedCombos () {
      return this.$store.state.movesStore.editedCombos
    },
    editedMoves: {
      get () {
        return this.$store.state.movesStore.editedMoves
      }
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    mode: {
      get: function () {
        if (this.$store.state.settingsStore.settings.userType === '1') {
          return 'callsMode'
        } else {
          return this.modePerRadios
        }
      }
    },
    lstSeqOrig () {
      return this.$store.state.beatsAndSequenceStore.originalSeq
    },
    lstSeqEdited () {
      return this.$store.state.beatsAndSequenceStore.editedSeq
    },
    pickerMoves: {
      get () {
        if (this.movesCombosOrAuto === 'moveMode' && this.modalEditShown) {
          let ret
          ret = this.$store.state.movesStore.editedMoves.map(item => {
            const rec = {
              name: item.$.name,
              length: item.$.length,
              lengthextendable: item.$.lengthextendable,
              delaycount: item.$.delaycount,
              level: item.$.level,
              comment: item.comment[0]
            }
            return rec
          })
          // this relevant only if clicked on a beat to assign a move
          if (this.lstTimesWork[this.currentBeatIndex].gear === 'cambio') {
            ret = ret.filter(m => {
              return m ? parseInt(m.length) === 0 : false
            })
          }
          return ret
        }
      }
    },
    MP3FileName () {
      return this.$store.state.beatsAndSequenceStore.MP3FileName
    },
    minBaseName () {
      const mypath = this.$store.state.beatsAndSequenceStore.MP3FileName
      return path.basename(mypath, path.extname(mypath))
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
    },
    lstTimesOrig () {
      return this.$store.state.beatsAndSequenceStore.lstTimesOrig
    }
  },
  methods: {
    SEQFileCanWrite () {
      const mypath = this.$store.state.beatsAndSequenceStore.MP3FileName
      const seqFile = path.basename(mypath, path.extname(mypath)) + '.seq'
      const seqPath = path.join(RMDIR, this.RMEFolder, 'secuencias_para_canciones', seqFile)
      if (discDataHelper.fileExists(seqPath)) {
        return discDataHelper.fileCanWrite(seqPath)
      } else {
        return true
      }
    },
    customFilter (row, criteria) {
      if (!!criteria && !row.name.match(toRegex()(criteria))) return false
      return true
    },
    onOKSeqTags () {
      this.showSeqTags = false
      this.$store.commit('SET_MP3NAME_AND_DEPS', { MP3FileName: this.MP3FileName, seqTags: this.seqTagsWorking.trim() })
      this.subSaveSeq()
    },
    getPermTitle (perm) {
      const clines = perm.moves[0].map(m => m.move + (m.upshift ? '🔥' : '') + ', len: ' + m.length)
      return clines.join('\n')
    },
    validateForCambioShift () {
      // so here's the plan
      // check if there is >1 cambio
      //   yes: exists any earlier ones?
      //     yes: are they already processed?  i.e. not approx a full 8-count gap.
      //       yes: OK continue
      //       no: msgbox: Cambios must be processed in order, click on earlier one please!
      //     no: OK continue
      //   no: OK continue
      // :continue
      //   is there a following cambio?
      //     yes: two options: rest of song for variable count shift OR half measure between 2 cambios
      //     no: 1 option: rest of song for variable count shift
      // ------------------------
      // if there's just one other cambio in the song, and it's a full measure, and current one is a full measure:
      //  assume they want to change the range defined by those 2 beats.
      // if there is a matching cambio pair preceding (???FIXME)
      // there is no cambio later in the song to mark the end of change area

      // helper: are two time gaps 'close enough' to be considered the 'same'
      // default to within 6 percent of the smaller, or supply a number to use as percentage
      const that = this
      function prettyClose (a, b, margin) {
        // calculate the gaps at each point
        const gapA = that.lstTimesWork[a + 1].time - that.lstTimesWork[a].time
        const gapB = that.lstTimesWork[a].time - that.lstTimesWork[a - 1].time
        if (!margin) margin = 10 // 10 percent by default
        if (Math.max(gapA, gapB) / Math.min(gapA, gapB) < (100 + margin) / 100) {
          return true
        } else {
          return false
        }
      }

      // is the current cambio already changed?  if so just msg and quit.
      if (this.currentBeatIndex > 0) {
        if (!(prettyClose(this.currentBeatIndex, this.currentBeatIndex - 1) &&
            prettyClose(this.currentBeatIndex, this.currentBeatIndex + 1))) {
          this.$bvModal.msgBoxOk('This cambio has already been changed, no automated processing available!')
          return
        }
      } else {
        this.$bvToast.toast('Can\'t put a Cambio on the first beat!', {
          title: 'Cambio not allowed here',
          autoHideDelay: 4000
        })
        return
      }
      // * 1* ARE THERE MULTIPLE CAMBIOS (store info)
      const ptrCambios = [this.currentBeatIndex] // reset to current beat
      for (let i = 1; i < this.lstTimesWork.length - 1; i++) {
        if (this.lstTimesWork[i].gear === 'cambio') {
          if (!ptrCambios.includes(i)) ptrCambios.push(i)
        }
      }
      // sort the array
      ptrCambios.sort(function (a, b) {
        return a - b
      })

      // *1* ARE ANY PRECEDING CAMBIOS already changed?
      const thisPos = ptrCambios.findIndex(n => n === this.currentBeatIndex)

      const cambiosRequireChanging = [] // if stays empty, none require changing
      for (let i = 0; i < thisPos; i++) {
        if (prettyClose(ptrCambios[i], ptrCambios[i] - 1) &&
          prettyClose(ptrCambios[i], ptrCambios[i] + 1)) {
          cambiosRequireChanging.push(ptrCambios[i])
        }
      }

      if (cambiosRequireChanging.length > 0) {
        this.$bvModal.msgBoxOk('Required: change beat at offset: ' + cambiosRequireChanging + '.  Earlier cambio beats must be changed first.')
        return false
      }
      // *2* VALID CLICK: are there cambios later than this point?
      //    req for valid: none that have been processed already
      //    yes: DLG to choose apply to rest of song, or to next cambio
      //    no: DLG to apply to rest of song

      this.ptrCambioEnd = null
      if (thisPos !== ptrCambios.length - 1) { // if not the last valid cambio gear
        if (prettyClose(ptrCambios[thisPos + 1], ptrCambios[thisPos + 1] - 1) &&
          prettyClose(ptrCambios[thisPos + 1], ptrCambios[thisPos + 1] + 1)) {
          this.ptrCambioEnd = ptrCambios[thisPos + 1]
        } else {
          this.$bvToast.toast('Next cambio already changed!', {
            title: 'Can only change for the entire rest of song.',
            autoHideDelay: 4000
          })
        }
      }
      this.$bvModal.show('performCambiosTwoOptions')
    },
    performCambioShift () {
      // allOrNext: all remaining, or range to next cambio gear 'all' / 'range'
      // 1st cambio beat: cut NEXT time by .5 gap
      // intervening beats: cut NEXT time by .5 gap
      // last beat if any: insert a time 2/3 of the gap to next time.
      function getShiftInterval (lstTimesWork, i) {
        // the interval ENDED by beat [i]
        return lstTimesWork[i].time - lstTimesWork[i - 1].time
      }
      // estimate the mean gap for this whole range
      const gaps = []
      for (let i = this.currentBeatIndex + 1; i < this.lstTimesWork.length - 1; i++) {
        gaps.push(getShiftInterval(this.lstTimesWork, i))
        if (this.ptrCambioEnd && this.ptrCambioEnd === i) {
          break
        }
      }
      let sumGaps; let avgGaps = 0
      // dividing by 0 will return Infinity
      // arr must contain at least 1 element to use reduce
      if (gaps.length) {
        sumGaps = gaps.reduce(function (a, b) { return a + b })
        avgGaps = sumGaps / gaps.length
      }

      for (let i = this.currentBeatIndex + 1; i < this.lstTimesWork.length; i++) {
        let time = this.lstTimesWork[i].time
        time += avgGaps * this.cambioShiftSelected / 8 // NEG: cambioShiftSelected is usually negative
        this.$store.commit('ADJUST_BEAT_FIELD', { ind: i, time: time })
        if (this.ptrCambioEnd && this.ptrCambioEnd === i) {
          const postCambioGear = this.lstTimesWork[i + 1].gear
          this.$store.commit('ADJUST_BEAT_FIELD', { ind: i, gear: postCambioGear })
          const timeCurr = this.lstTimesWork[i].time + avgGaps
          this.$store.commit('INSERT_BEAT_BEFORE', { index: i + 1, mean: this.meanGapImproved, time: timeCurr, gear: 'cambio' })
          break
        }
      }
      this.modalEditShown = false
      this.subSaveBeats()
    },
    checkForWeird (beatIdx) {
      // gaps that are suspiciously inconsistent
      if (
        this.lstTimesWork[beatIdx + 1]
          ? (this.lstTimesWork[beatIdx + 1].time - this.lstTimesWork[beatIdx].time) < this.meanGapImproved * 0.8 ||
          this.meanGapImproved / 0.8 < (this.lstTimesWork[beatIdx + 1].time - this.lstTimesWork[beatIdx].time) : false
      ) {
        return 'warning'
      } else {
        return 'success'
      }
    },
    showFlow (item) {
      this.currentComboHdr = item
      this.modalEditShown = false
      this.autoFiller = new AutoFiller(this.lstSeqEdited, this.editedMoves, this.editedCombos, this.lstTimesWork, this.currentBeatIndex, this.minBaseName)
      this.autoFiller.genOkPerms([], this.currentComboHdr)
      this.comboFlowShown = true // opens dialog to select which generated permutation of the selected combo
    },
    callsModeTooltipInMargins () {
      if (this.mode === 'callsMode') return 'try: click between buttons; rt/left arrow; space bar'
    },
    clickListItem (event) {
      if (event.target.id) {
        console.log('list item clicked, id: ' + event.target.id)
        const tgt = event.target
        let idx = parseInt(tgt.id.substring(4)) // trim 'beat' off id
        if (event.offsetX < (tgt.clientWidth / 2)) idx--
        if (idx < 0) idx = 0
        if (this.lstTimesWork[idx]) {
          const here = this.lstTimesWork[idx].time
          this.$emit('playSong', false, here) // Songs.vue plays the song
        }
      }
    },
    zapTheCalls (currentBeatIndex, shift, allRemaining = false) {
      let payload = {}
      let guiString = ''
      if (typeof currentBeatIndex === 'undefined') {
        payload = { startIndex: 0, allRemaining: true }
        guiString = 'Delete ALL CALLS for this song?'
      } else if ((currentBeatIndex >= 0) && allRemaining) {
        payload = { startIndex: currentBeatIndex, allRemaining: true }
        guiString = 'Delete this call, and ALL FOLLOWING CALLS in this song?'
      } else if ((currentBeatIndex === 0) && !shift) {
        // if at start, delete rest === delete ALL
        payload = { startIndex: 0, allRemaining: true }
        guiString = 'Delete ALL CALLS for this song?'
      } else {
        if (shift < 0) {
          // shift LEFT
          payload = { startIndex: currentBeatIndex, shift: shift }
          guiString = 'Delete this, and shift REMAINING CALLS left?'
        } else if (shift > 0) {
          // shift RIGHT
          payload = { startIndex: currentBeatIndex, shift: shift }
          guiString = 'Shift moves right from here?'
        }
      }
      this.$bvModal.msgBoxConfirm('Are you sure?', { title: guiString })
        .then(resp => {
          if (resp) {
            this.$store.commit('ZAP_THE_CALLS', payload)
            this.subSaveSeq()
            this.$bvToast.toast(guiString + 'Done!', {
              title: 'Done...',
              autoHideDelay: 4000
            })
            try {
              this.$bvModal.hide('modalConfirmDelete')
            } catch (e) {
              console.log('Error hiding confirm delete: ' + e.message)
            }
          }
        })
        .catch(e => {
          console.log('error msgBoxConfirm in Measures::zapTheCalls: ' + e.message)
        })
    },
    setFocus () {
      // intended to be called from GUI @shown event
      try {
        if (this.mode === 'callsMode') {
          this.$refs.filterInput.focus()
        } else if (this.mode === 'gearMode') {
          this.$refs.gearSelect.focus()
        } else if (this.mode === 'timeMode') {
          this.$refs.newTimeInput.focus()
        }
      } catch (e) {} // timing issues
    },
    nudgeCallsUp () {
      try {
        this.$store.commit('NUDGE_ALL_CALLS', { count: 1 })
        this.subSaveSeq()
        this.disableNudge = true
        setTimeout(() => {
          this.disableNudge = false
        }, 300)
      } catch (e) {
        console.log('nudgeCallsUp fails, probably no data')
      }
    },
    nudgeCallsDown () {
      try {
        this.$store.commit('NUDGE_ALL_CALLS', { count: -1 })
        this.subSaveSeq()
        this.disableNudge = true
        setTimeout(() => {
          this.disableNudge = false
        }, 300)
      } catch (e) {
        console.log('nudgeCallsUp fails, probably no data')
      }
    },
    nudgeBeatsUp () {
      try {
        const nudge = this.meanGapImproved / 32
        this.$store.commit('NUDGE_ALL_BEATS', nudge)
        this.subSaveBeats()
        this.disableNudge = true
        setTimeout(() => {
          this.disableNudge = false
        }, 300)
      } catch (e) {
        console.log('nudgeCallsUp fails, probably no data')
      }
    },
    nudgeBeatsDown () {
      try {
        const nudge = this.meanGapImproved / 32
        if (this.lstTimesWork[0].time > nudge) {
          this.$store.commit('NUDGE_ALL_BEATS', -nudge)
          this.subSaveBeats()
          this.disableNudge = true
          setTimeout(() => {
            this.disableNudge = false
          }, 300)
        }
      } catch (e) {
        console.log('nudgeCallsUp fails, probably no data')
      }
    },
    getItemTitle (item, index) {
      let sTitle = ''
      if (this.$store.state.settingsStore.settings.presetOrAutofill === 2) sTitle += 'AUTOFILL in effect\r\n'
      sTitle += 'Beat: ' + (item.comment || '(no comment)') + ' [gear=' + item.gear + ']'
      if (this.lstSeqEdited[index]) {
        const fullMove = this.$store.getters.getMoveByNameObj({ $: { name: this.lstSeqEdited[index].$.name } })
        sTitle += '\r\nDesc: ' + (fullMove.comment || 'no comment') + ' [delay=' + (fullMove.$.delaycount || 0) + ']'
      } else {
      }
      return sTitle + '[' + index + ']'
    },
    isExtension (item, index) {
      return this.lstSeqEdited && (this.lstSeqEdited[index] ? this.lstSeqEdited[index].$.length === -1 : false)
    },
    getModalTitle () {
      if (this.mode === 'timeMode') {
        return 'Time in seconds since song start'
      } else if (this.mode === 'gearMode') {
        return 'Other beat info (gear, comment)'
      } else if (this.mode === 'callsMode') {
        return 'Move'
      }
    },
    subSaveSeq () {
      if (!this.SEQFileCanWrite()) {
        this.$bvModal.msgBoxOk('SEQ File has been set READ-ONLY, protected from changes here!  You must change the file permissions to do this.')
        return
      }
      // FIXME: put in a username so we know if somebody can't find the beat -)
      const authorId = this.$store.state.settingsStore.settings.authorId
      const schemeDate = this.$store.state.movesStore.schemeDate
      const schemeProvider = this.$store.state.movesStore.schemeProvider
      const schemeName = this.$store.state.movesStore.schemeName
      let newMd5 = this.MP3FileNameMd5GivenSEQ
      if (!newMd5 || (Array.isArray(newMd5) && newMd5.length === 0)) {
        // way for a new SEQ to be created, doesn't yet have an MD5 value
        newMd5 = this.MP3FileNameMd5Actual
      }
      // newMd5 = Array.isArray(this.MP3FileNameMd5GivenSEQ) ? this.MP3FileNameMd5GivenSEQ.concat(this.MP3FileNameMd5Actual) : [this.MP3FileNameMd5GivenSEQ, this.MP3FileNameMd5Actual]
      newMd5 = Array.isArray(newMd5) ? newMd5 : [newMd5]
      this.$store.commit('PERSIST_SEQ', {
        // construct asWhat parameter, each "type" is handled appropriately by DiscDataHelper downstream
        type: 'sequence',
        filename: this.MP3FileName,
        md5: newMd5,
        lstSeq: this.lstSeqEdited,
        RMEFolder: this.RMEFolder,
        schemeName: schemeName,
        schemeProvider: schemeProvider,
        schemeDate: schemeDate,
        authorId: authorId,
        authorDate: new Date().toISOString(),
        seqTags: this.seqTags
      })
    },
    deleteThisMove () {
      this.$store.commit('DELETE_THIS_SEQ_MOVE', { index: this.currentBeatIndex, lstTimes: this.lstTimesWork })
      this.subSaveSeq()
      this.$bvModal.hide('modalConfirmDelete')
    },
    displayMove (item, index) {
      if (!this.lstSeqEdited || !this.lstSeqEdited[index]) {
        return '-'
      } else {
        return (this.lstSeqEdited[index].$.name) || '-'
      }
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
    usePerm () {
      const pmSel = this.autoFiller.okPerms[this.autoFiller.selPermIndex]
      let offs = 0
      for (let i = 0; i < pmSel.moves[0].length; i++) {
        const fullMove = this.$store.getters.getMoveByNameObj({ $: { name: pmSel.moves[0][i].move } })
        this.$emit('add-seq-move', pmSel.moves[0][i].move) // Songs needs to add Howler for this to move dictionary
        this.$store.commit('ADD_THIS_SEQ_MOVE', { index: this.currentBeatIndex + offs, item: _cloneDeep(fullMove), maxBeat: this.lstTimesWork.length })
        offs += pmSel.moves[0][i].length
      }
      this.moveFilter = null
      this.comboFilter = null

      this.subSaveSeq()
      this.comboFlowShown = false
    },
    onMoveRowClicked (item, index) {
      // movePicker dialog row was clicked
      // first dry run to check for conflicts...
      for (let k = 1; k < item.length; k++) {
        if (this.currentBeatIndex + k < this.lstSeqEdited.length) {
          if (this.lstSeqEdited[this.currentBeatIndex + k]) {
            // oops no vacancy!
            this.$bvModal.show('modalConflict')
            return
          }
        }
      }
      const fullMove = this.$store.getters.getMoveByNameObj({ $: { name: item.name } })
      this.$emit('add-seq-move', item.name) // Songs needs to add Howler for this to move dictionary
      this.$store.commit('ADD_THIS_SEQ_MOVE', { index: this.currentBeatIndex, item: _cloneDeep(fullMove), maxBeat: this.lstTimesWork.length })
      this.modalEditShown = false
      this.moveFilter = null
      this.comboFilter = null
      this.subSaveSeq()
    },
    calcVariant (item) {
      if (this.$store.state.settingsStore.settings.presetOrAutofill === 2) {
        return 'warning'
      }
      if (item.gear === 'rumba') {
        return 'outline-secondary'
      } else if (item.gear === 'mellow') {
        return 'outline-dark'
      } else if (item.gear === 'spicy') {
        return 'outline-danger'
      } else if (item.gear === 'accent') {
        return 'outline-success'
      } else if (item.gear === 'climax') {
        return 'outline-info'
      } else if (item.gear === 'building') {
        return 'outline-warning'
      } else if (item.gear === 'cambio') {
        return 'outline-primary'
      }
    },
    analyzeBeats (bCalcOnly) {
      analyzeBeatsImpl.call(this, bCalcOnly)
    },
    dumpLastAutofill () {
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
      const comboData = JSON.stringify(this.autofillAudit, null, 2)
      const comboJSON = path.join(DLDIR, '/RM-SONGS-DUMP-AUTOFILL-' + getFormattedTime() + '.json')
      const that = this
      fs.writeFileSync(comboJSON, comboData, err => {
        if (err) {
          throw err
        }
      })
      that.$bvToast.toast('Autofill result saved in Downloads folder', {
        title: 'AUTOFILL',
        autoHideDelay: 3000
      })
    },
    keyDownHandler (event) {
      const kcLeft = 37
      const kcRight = 39
      const kcDown = 40
      const kcEsc = 27
      const kcSpace = 32
      const kcEnter = 13
      const kcF4 = 115
      if (!this.stateRecordingBeats && !this.awaitingBeatsSave && !this.modalEditShown && !this.showMusicLoader && !this.showSeqTags) {
        // just the base layout
        // Alt-B, Alt-G, Alt-C
        if (event.altKey) {
          if (event.code === 'KeyB') {
            this.modePerRadios = 'timeMode' // B = beats (timeMode)
          } else if (event.code === 'KeyG') {
            this.modePerRadios = 'gearMode' // G = gears (gearMode)
          } else if (event.code === 'KeyC') {
            this.modePerRadios = 'callsMode' // C = calls (callsMode)
          } else if (event.code === 'KeyX') {
            this.$bvModal.msgBoxConfirm('Dump last autofill to Downloads folder: Are you sure?')
              .then(value => {
                this.dumpLastAutofill()
              })
          }
        }
        if (event.keyCode === kcSpace) {
          const here = this.waveSurferOrig.getCurrentTime()
          if (this.waveSurferOrig.isPlaying()) {
            this.waveSurferOrig.playPause()
          } else {
            this.$emit('playSong', false, here) // Songs.vue plays the song
          }
          event.preventDefault()
        } else if (event.keyCode === kcRight) {
          const currTime = this.waveSurferOrig.getCurrentTime()
          const duration = this.waveSurferOrig.getDuration()
          const currProgress = currTime / duration

          const step = 2 * this.meanGapImproved / this.waveSurferOrig.getDuration()
          const toProgress = currProgress + step > 1 ? 1 : currProgress + step
          this.waveSurferOrig.seekTo(toProgress)
          console.log('right arrow')
          event.preventDefault()
        } else if (event.keyCode === kcLeft) {
          const currTime = this.waveSurferOrig.getCurrentTime()
          const duration = this.waveSurferOrig.getDuration()
          const currProgress = currTime / duration

          const step = 2 * this.meanGapImproved / this.waveSurferOrig.getDuration()
          const toProgress = currProgress - step < 0 ? 0 : currProgress - step
          this.waveSurferOrig.seekTo(toProgress)
          console.log('left arrow')
          event.preventDefault()
        }
      }
      if (this.mode === 'callsMode') {
        if (this.modalEditShown && !this.showSeqTags) {
          if (event.keyCode === kcDown) { // space key
            try {
              this.$refs.moveTable.$el.rows[1].focus()
            } catch (e) {
              console.log('can\'t focus first row, doesn\'t exist?')
            }
          } else if (event.keyCode === kcEnter) { // space key
            try {
              this.$refs.moveTable.$el.rows[1].focus()
            } catch (e) {
              console.log('can\'t focus first row, doesn\'t exist?')
            }
          }
        } else {
          if (!event.keyCode === kcF4) event.preventDefault() // "space" "enter" can be squelched can accidently click a button or scroll, but we need to allow alt-F4 to close
        }
      } else if (this.stateRecordingBeats) {
        if (event.keyCode === kcSpace) { // space key
          event.preventDefault() // need default if we are entering a comment for example
          if (this.waveSurferOrig && this.waveSurferOrig.isPlaying()) {
            const timeCurr = this.waveSurferOrig.getCurrentTime()
            const time = new BeatTime(timeCurr)
            this.$store.commit('ADD_NEW_BEAT', time)
            // npm pkg scroll-into-view-if-necessary has a problem here, back to basics then:
            if (this.scrollMe) {
              this.$nextTick(() => document.getElementById('beat' + (this.lstTimesWork.length - 1)).scrollIntoView({ behavior: 'smooth', block: 'center' })) // smooth fails?
            }
            // immediate recurring analysis, only for first 16 beats
            // if (this.lstTimesWork.length <= 16) {
            //   this.analyzeBeats(true, this.lstTimesOrig)
            // }
          } else {
            // intended to remove "boing" coloring: special highlight for currently playing beat
            this.$store.commit('SET_BEAT_WARNING', { ind: this.currentBeatIndex, variant: 'secondary' })
          }
        }
      } else if (event.keyCode === kcEsc) { // escape key, close the simplert dialog
        // close is safe operation
        this.$refs.simplert.justCloseSimplert()
      } else if (this.mode === 'gearMode') {
        if (event.keyCode === kcEnter) { // space key
          // dec 16 2019 if we exit dialog here, v-model variable isn't changed even though dlg is closed!
          this.modalEditShown = false
          this.saveEdit()
          event.preventDefault()
        }
      }
      //     // console.log('key DOWN detected!' + Date.now() - this.playStartTime)
    },
    nullSrtHandler () {
      console.log('Null simplert handler called')
    },
    onBeatAction (choice) {
      // when there was a single poss action on a beat click, we just called this.details()
      // now you can do several actions on beats, this is "pre-details" setup
      // choice: 'edit', 'delete', 'deleteRest', 'insert'
      this.beatAction = choice
      this.details(this.currentBeatIndex)
      this.$bvModal.hide('modalBeatAction')
    },
    details (index) {
      if (this.$store.state.settingsStore.settings.presetOrAutofill === 2) {
        this.$bvModal.msgBoxOk('Dashboard set to AutoFill/AutoPlay: cannot change these temporary moves.')
        return
      }
      if (!this.SEQFileCanWrite()) {
        this.$bvModal.msgBoxOk('SEQ File has been set READ-ONLY, protected from changes here!  You must change the file permissions to do this.')
        return
      }
      if (this.$store.state.settingsStore.settings.presetOrAutofill === 2) {
        this.$bvToast.toast('Autofill mode, no actions allowed', {
          title: 'AUTOFILL',
          autoHideDelay: 4000
        })
        return
      }
      this.currentItem = _cloneDeep(this.lstTimesWork[index])
      this.$set(this.currentItem, 'boing', false) // this is a clone, so we don't need to do this in VUEX.
      // but still we save this item later... so ensure it doesn't get saved with the boing TRUE (makes highlight in GUI)
      this.currentBeatIndex = index
      this.currentItemBeforeEdit = this.CurrentItem // overwrite will save it, but just to the working buffer
      this.$nextTick(function () {
        if (this.mode === 'callsMode') {
          this.moveFilter = null
          this.movesCombosOrAuto = 'moveMode'
          // check that we are not on a continuation measure
          // and if we are, we only warn the user, no action
          if (this.lstSeqEdited[index] && this.lstSeqEdited[index].$.length === -1) {
            this.$bvModal.show('modalNoMoveHere')
            return
          } else if (this.lstSeqEdited[index] && this.lstSeqEdited[index].$.length >= 0) {
            this.$bvModal.show('modalConfirmDelete')
            return
          }
        } else if (this.mode === 'timeMode') {
          if (this.beatAction) {
            if (this.beatAction === 'edit') {
              this.beatAction = null // restore the default state
              // pass through - no return stmt - as this is the default
            } else if (this.beatAction === 'delete') {
              const options = { title: 'Delete the current beat?' }
              this.$bvModal.msgBoxConfirm('Are you sure?', options)
                .then(resp => {
                  if (resp) {
                    this.$store.commit('DELETE_ONE_BEAT', this.currentBeatIndex)
                    this.subSaveBeats()
                    this.$bvToast.toast('Beat deleted!  Fix call sequence if needed!', {
                      title: 'Beat has been deleted',
                      autoHideDelay: 4000
                    })
                  }
                })
                .catch(e => {
                  console.log('error msgBoxConfirm in Measures::details: ' + e.message)
                })
              this.beatAction = null // restore the default state
              return // all beatActions
            } else if (this.beatAction === 'deleteRest') {
              const options = { title: 'Delete beats from here?' }
              this.$bvModal.msgBoxConfirm('Are you sure you want to delete this beat, and all following beats?', options)
                .then(resp => {
                  if (resp) {
                    this.$store.commit('DELETE_BEATS_AFTER', this.currentBeatIndex)
                    this.subSaveBeats()
                    this.$bvToast.toast('Beats deleted!', {
                      title: 'Beats have been deleted.  Fix call sequence if needed!',
                      autoHideDelay: 4000
                    })
                  }
                })
                .catch(e => {
                  console.log('error msgBoxConfirm in Measures::details (2): ' + e.message)
                })
              this.beatAction = null // restore the default state
              return // all beatActions
            } else if (this.beatAction === 'insert') {
              const options = { title: 'Insert beat beat before?' }
              this.$bvModal.msgBoxConfirm('Are you sure you want to insert a beat between this beat and any previous one?', options)
                .then(resp => {
                  if (resp) {
                    // should insert a beat half-way back to previous beat
                    this.$store.commit('INSERT_BEAT_BEFORE', { index: this.currentBeatIndex, mean: this.meanGapImproved })
                    this.subSaveBeats()
                    this.$bvToast.toast('Beat inserted!', {
                      title: 'Beat has been inserted.  Fix call sequence if needed!',
                      autoHideDelay: 4000
                    })
                  }
                })
                .catch(e => {
                  console.error('error msgBoxConfirm in Measures::details (3): ' + e.message)
                })
              this.beatAction = null // restore the default state
              return // all beatActions
            }
          } else {
            // first time in beats, no beatAction: so we fall through come here, and set beatAction
            this.$bvModal.show('modalBeatAction')
            return
          }
        }
        this.modalEditShown = true
      })
    },
    cancelEdit () {
      this.currentComboHdr = null
      this.currentItem = null
    },

    saveEdit () {
      this.modalEditShown = false
      console.log('running saveEdit')
      // other modes handled directly by v-model reference
      if (this.mode === 'callsMode') {
        if (this.movesCombosOrAuto === 'autoMode') {
          if (Object.entries(this.editedCombos).length === 0) {
            this.$bvModal.msgBoxOk('You must create Combos before you can Autofill moves for a song.')
            return // *** BAIL HERE
          }
          this.currentBeatIndex = 2 // give the dancers a few seconds, like IRL
          this.autoFiller = new AutoFiller(this.lstSeqEdited, this.editedMoves, this.editedCombos, this.lstTimesWork, this.currentBeatIndex, this.minBaseName)
          const [resSequence, audit] = this.autoFiller.autoFill()
          this.autofillAudit = audit // from here, it can be dumped with Alt-X
          let offs = 0
          let len = 0
          for (let i = 0; i < resSequence.length; i++) {
            if (resSequence[i]) {
              const ind = this.editedMoves.binarySearchIndex(resSequence[i].move, m => m.$.nameSorted) // get the details need to save sequence
              const fullMove = this.editedMoves[ind]
              this.$emit('add-seq-move', resSequence[i].move) // Songs needs to add Howler for this to move dictionary
              this.$store.commit('ADD_THIS_SEQ_MOVE', { index: offs, item: _cloneDeep(fullMove), maxBeat: this.lstTimesWork.length })
              len = Math.max(resSequence[i].length, 1) // any move for cambio gear is len 0, but needs to be counted as 1 here.
              offs += len // cambio move takes a position on the grid, even if it's nominal length is 0 (signifying half a measure)
            } else {
              offs += 1 // Continue is the empty move, exists just to take up a measure of time
            }
          }
        }
        // else no action: the new calls will come from moves dialog, rowClicked event, or the combos dialog similar
      } else if (this.mode === 'timeMode' || this.mode === 'gearMode') {
        this.$store.commit('ADJUST_BEAT_FIELD', { ind: this.currentBeatIndex, time: this.currentItem.time, gear: this.currentItem.gear, comment: this.currentItem.comment })
        // except for callsMode... just save anything we change right away
        this.subSaveBeats(this.lstTimesWork)
      }
      this.currentItem = null
    },
    subSaveBeats (beatsToSave) {
      const authorId = this.$store.state.settingsStore.settings.authorId
      let newMd5 = this.MP3FileNameMd5GivenXML
      newMd5 = Array.isArray(newMd5) ? newMd5 : [newMd5]
      if (newMd5.length === 0) newMd5 = [this.MP3FileNameMd5Actual]
      const payload = {
        type: 'beats',
        filename: this.MP3FileName,
        bpm: Math.round(60 / (this.meanGapImproved / 8)),
        MP3URL: this.MP3URL,
        // md5 Given field can be empty, if we just saved the original XML from memory and haven't reloaded
        //  and in that case, we still have the md5 Actual in memory to use here.
        md5: newMd5,
        lstTimes: beatsToSave || this.lstTimesWork,
        date: new Date().toISOString(),
        RMEfolder: this.RMEFolder,
        authorId: authorId,
        spotifySongId: this.$store.state.beatsAndSequenceStore.spotifySongId
      }
      this.$store.commit('PERSIST_BEATS', payload)
    },
    removeDlgAlerts () {
      // alerts that are displayed in the beat edit dialog
      this.showAlert = false
    },
    alertCountingDown (dismissCountDown) {
      this.dismissCountDown = dismissCountDown
      if (this.dismissCountDown === 0) {
        this.$emit('playSong', true) // Songs.vue plays the song
      }
    },
    startNewBeatsCountdown () {
      this.$refs.btnRecordNew.blur() // seems not always needed to ensure the "document" captures keydown
      this.dismissCountDown = this.dismissSecs
      if (this.waveSurferOrig.isPlaying()) {
        this.waveSurferOrig.stop()
      }
    }
  }
}
</script>

<style scoped>
/* remove at v3.1.15, better to show clearly when the beat starts */
/* button {
  transition: all 1s ease 0s;
} */

/* boing is transition, used to show the current beat, while the music is played */
button.boing {
  background: #cf4647;
  border-bottom-color: #cf4647;
  border-top-color: #cf4647;
  border-left-color: #cf4647;
  border-right-color: #cf4647;
}

/* eight up horizontal order, beat/gear/call instances */
ul.eightUp {
  margin-left: 0;
  padding-left: 0;
}
li.eightUp {
  display: block;
  width: 12.4%;
  float: left;
  margin: -6px 0;
}

.notextensionbeat{
  font-size:16px;
  line-height:14px;
}

.extensionbeat {
  font-style: italic;
  font-size: x-small;
  font-weight: lighter;
}

button:not(li) {
  box-sizing: border-box;
  margin: 10px;
  padding: 0px;
}
</style>
