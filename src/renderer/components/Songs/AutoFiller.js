/* eslint-disable */
// rev 2024-08-06  19:37
// THIS MODULE IS SHARED,
//      so changes should be tested for all these:
//   * RME interactive autofill based on selected combo, generates moves that can be saved in SEQ files
//   * RME automatic autofill of an entire song, in AUTOFILL mode (see the Dashboard) where moves are NOT saved in SEQ files
//   * RME testing, triggered by "Combos?" button on Dashboard, which tests all Combos in the selected scheme
//       to see how they would fit each beats file in the RM environment.  Leaves result audit files in Downloads folder.
//   * RMS in autofill mode, automatically fills each song
// Also note that RME is a Vue2 based codebase, with Standard style (lining required no semicolons at EOL, and single quootes)
//    RMS was based on a Vue3 project, using the newer composition API, and also based on TYPESCRIPT. linting expecting double quotes and colons.
//    We use the Typescript plain js module enabling  in order to include this code in RMS project
//    So even though this module is used in both projects, it follows mainly the rules of RME project
//
// TERMS:
// RME: the PC app RuedaMatic Editor
// RMS: the web app RM-Spot
// (in Beats) a "SHIFT" is one the gears of ["accent"|"climax"|"spicy"];
//            an "UPSHIFT" is one of "climax" or "spicy"
// Combos and perms: NOTE our special use of the words!
// "Combo" here is basically the (mermaid.js) simple tree of possible combinations where all nodes are moves
// "Perm" is any single path through the tree to an end node.  Sometimes we attach range of possible lengths for an extendable move
//     and each length will give rise to a separate perm.  We use cartesian product to generate our perms.
// We generate all the perms possible, then iterate throough them doing our "match" tests
// okPerms array will hold the Perms that pass the test, for the given song and index into the song beats

// TIPS for autofill:
//   EXTENDABLE moves
//    - used as the basic main tool of "dancing to the music"
//    - extendable moves have a setupbars field
//    - algorithm fills the song one PERM at a time
//    - within 1 PERM, a move PRECEDING an extendable with setupbars will try to "borrow" the setupbars
//    - effect: the music "shift" will try to hit the main part of the move,
//    - EFFECTS ON DESIGN:
//       - TREE: before a move with setupbars, provide paths of different lengths to reach the move
//       - BEATS: (any tips?)
//   GUAPEA or other BASIC moves
//       - these moves are the only ones marked LEVEL 1.
//       - autofill will NOT choose a path where level 1 move hits a shift

// for rm-spot project, currently enforcing SEMICOLONS,
//  to disable that for the file: try some version of this using the rule as named:
//  /* eslint-disable no-use-before-define */

// re RANDOM selection:
//   builtin Math.random could be suspected of not-random-enough
//   An alternative is discuessed here: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

import _cloneDeep from 'lodash/cloneDeep'
import _sortBy from 'lodash/sortBy'

let songShifts = null

// make a binary search available on the Array type
//  https://stackoverflow.com/questions/37711682/javascript-lodash-binary-search-by-function
// eslint-disable-next-line no-extend-native
Array.prototype.binarySearchIndex = function (val, cb = x => x) { // default callback for primitive arrays
  const valLower = val.toLocaleLowerCase()
  let deli = this.length - 1 // delta index
  let base = 0 // base to add the delta index
  while (deli > 0 && cb(this[base + deli]) !== valLower) {
    deli = ~~(deli / 2)
    cb(this[base + deli]) < valLower && (base += deli)
  }
  return cb(this[base + deli]) === valLower ? base + deli : -1
}

const cleanbool = (val) => {
  let ret = false
  if (typeof val === 'string') {
    if (val === 'true') ret = true
  }
  if (typeof val === 'boolean') {
    ret = val
  }
  return ret
}

class AutoFiller {
  constructor(seqEdited,
    editedMoves,
    editedCombos,
    lstTimesWork,
    currentBeatIndex = null,
    songName = '[no filename]',
    fixWebData = false // when RMspot calls, send TRUE here
  ) {
    // main program data structures via constructor
    this.songName = songName
    this.lstSeqEdited = seqEdited // when autofill is called, we will empty this array and fill it from scratch
    this.editedMoves = fixWebData ? this.adaptorFromRMSMoves(editedMoves) : editedMoves
    this.editedCombos = fixWebData ? this.adaptorFromRMSCombos(editedCombos) : editedCombos
    this.lstTimesAndGears = lstTimesWork // this is likely modified in genOkPerms - cleanGears: cleaned up for autoplay
    // main work we do for the calling program
    this.allPerms = []
    this.okPerms = [] // all "permutations" of the combo that pass our tests, to fit the musicality of the given song
    this.numPerms = 0 // all "permutations" of the combo that pass our tests, to fit the musicality of the given song
    // control parameters from constructor
    this.currentBeatIndex = currentBeatIndex // beat index into lstTimesAndGears
    // these are working values that change
    this.selPermIndex = 0 // after user selects (in one old use case)
    this.passCount = -1 // reports the loop in shifter.check routine where a perm was selected
    this.aryFillSpots = []
    // transform data so web app can use the AutoFiller created for the PC App


    // we lookup our special Clave Switch moves, which ar not user-chosen
    //  NOTICE we use the raw data, before the fixWebData above!
    const mvCruceIndex = this.editedMoves.binarySearchIndex('Cruce', mv => mv.$.nameSorted)
    const mvFotoIndex = this.editedMoves.binarySearchIndex('Foto', mv => mv.$.nameSorted)
    const mvRumbaIndex = this.editedMoves.binarySearchIndex('Rumba', mv => mv.$.nameSorted)
    if (mvCruceIndex < 0) {
      console.error('Cruce move was not found (needed for a short (1/2) measure)')
    } else {
      this.moveCruce = {
          move: this.editedMoves[mvCruceIndex].$.name,
          length: parseInt(this.editedMoves[mvCruceIndex].$.length),
          lengthextendable: false,
          level: parseInt(this.editedMoves[mvCruceIndex].$.level),
          setupbars: 0
      }
    }
    if (mvFotoIndex < 0) {
      console.error('Foto move was not found (needed for a short (3/4) measure)')
    } else {
      this.moveFoto = {
          move: this.editedMoves[mvFotoIndex].$.name,
          length: parseInt(this.editedMoves[mvFotoIndex].$.length),
          lengthextendable: false,
          level: parseInt(this.editedMoves[mvFotoIndex].$.level),
          setupbars: 0
      }
    }
    if (mvRumbaIndex < 0) {
      console.error('Rumba move was not found (needed for a short (1/2) measure)')
    } else {
      this.moveRumba = {
          move: this.editedMoves[mvRumbaIndex].$.name,
          length: parseInt(this.editedMoves[mvRumbaIndex].$.length),
          lengthextendable: false,
          level: parseInt(this.editedMoves[mvRumbaIndex].$.level),
          setupbars: 0
      }
    }
  }

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
  }

  producePermutations (cboHdr) {
    const that = this
    // only a helper for genOkPerms
    // here, all possible permutations are generated
    // later, they will be filtered to fit the free space and maybe gears in the song

    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    // produces cartesian product of possible permutations
    const cartesianHelper = (a, b) => [].concat(...a.map(a => b.map(b => [].concat(a, b))))
    const cartesian = (a, b, ...c) => b ? cartesian(cartesianHelper(a, b), ...c) : a

    // Out of all the possibilities, paths and durations, select specific moves etc.
    // this.currCbo = _cloneDeep(this.editedCombos[cboHdr.$.name]) // we have to clone things where we want diff versions of state
    this.currCbo = this.editedCombos[cboHdr.$.name] // try without cloning
    // traverse the combo tree, and keep track of the move sequences it contains
    let perm = [] // (repeatedly) accumulates moves and extra beats [{move: moveName, extra: nBeats}]
    const permWrapper = {} // accum one sequence based on this combo {id:, length:, weight:, moves: [{name:, length:}, ...]}
    permWrapper.hdr = {}
    permWrapper.moves = []

    const perms = {} // accum all sequences generated from this combo {format comboName:'', gears:[], combs: [{weight:, move: [{name:, length:}, ...]}]
    perms.hdr = { baseCombo: '', min: 0, max: 0, gears: [] }

    cboHdr.$.endNodes = {}
    perms.products = []
    let weightCurr = 1
    const arrBranchTrail = [] // used to track unvisited branches

    let errMsg = '' // possible string for later
    // first node, Start node... should only have one child
    let currNode = { branch: 'node2', parent: this.currCbo.nodes.node1 } // always the real first move, no siblings
    // loop over the nodes, building data structures
    while (currNode) {
      const myMove = this.currCbo.nodes[currNode.branch]
      let localNodeEditTextWithoutMinMax
      let localNodeEditExtraTimeMin
      let localNodeEditExtraTimeMax
      const origText = this.stripOuterQuotes(myMove.text)
      // get the actual move, separate the extra time if any
      // regex pulls out 'Guapea' '2' and '4' from 'Guapea [2-4]'
      const match = /^["]?(.*) +\[([0-9])-([0-9])\]( *)?["]?$/g.exec(origText) // assume at least a single space between move and min-max
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
      // got name, and extra time: now let's get the move length itself
      const moveIndex = that.editedMoves.binarySearchIndex(localNodeEditTextWithoutMinMax, m => m.$.nameSorted)
      // moveLength, setupbars :
      // these fields are used only in the autofill calculations.
      //   Are entirely derived from the Move fields.
      //   We retrieve them at runtime just for the calculation -- not saved with the combo
      let moveLength, setupbars, lengthextendable, level
      try {
        moveLength = parseInt(this.editedMoves[moveIndex].$.length)
        level = parseInt(this.editedMoves[moveIndex].$.level) || 6
        setupbars = parseInt(this.editedMoves[moveIndex].$.setupbars || 0) // avoid NaN which isn't parsed to 0
        lengthextendable = cleanbool(this.editedMoves[moveIndex].$.lengthextendable) // avoid NaN which isn't parsed to 0
      } catch (e) {
        errMsg = 'Illegal move in combo: ' + cboHdr.name + ', move: ' + localNodeEditTextWithoutMinMax
        console.error(errMsg)
        // this.$bvToast.toast(errMsg, { title: 'Error' })
        throw (e)
      }
      if (localNodeEditExtraTimeMax) { // if there is a length range
        const moveCurr = []
        for (let xBeats = localNodeEditExtraTimeMin; xBeats <= localNodeEditExtraTimeMax; xBeats++) {
          moveCurr.push({ move: localNodeEditTextWithoutMinMax, length: moveLength + xBeats, upshift: myMove.allowUpshift, setupbars: setupbars, lengthextendable: lengthextendable, level: level })
        }
        perm.push(moveCurr)
      } else { // or  // if there is no length range: just the bare move length
        perm.push([{ move: localNodeEditTextWithoutMinMax, length: moveLength, upshift: myMove.allowUpshift, setupbars: setupbars, lengthextendable: lengthextendable, level: level }])
      }

      // DISCOVER BRANCHES: links discovered here, to be visited in future
      if (myMove.next && myMove.next.length > 0) {
        // are there explicit weights associated?
        const weights = []
        if (myMove.link && myMove.link.length > 0) {
          // iterate?
          let total = 0
          for (let i = 0; i < myMove.link.length; i++) {
            // get total, then we can adjust to < 1.00 probability
            // regex pulls the 5 out of '-- 5 -->'
            const raw = parseInt(/^[- ]*([a-zA-Z0-9]*)+[ ->]*$/g.exec(myMove.link[i])[1])
            total += raw
            weights.push(raw)
          }
          for (let i = 0; i < weights.length; i++) {
            // now adjust to < 1.00 probability
            weights[i] /= total
          }
        } else {
          // set implicit (even) weights if more than 1 next option
          for (let i = 0; i < myMove.next.length; i++) {
            weights.push(1.0 / myMove.next.length)
          }
        }
        // add any new branches discovered
        arrBranchTrail.push(...myMove.next.map((n, idx) => {
          // update the parent
          const cloneMove = _cloneDeep(myMove) // freeze the sequence state - it is NOT shared with other parts of the graph
          // const cloneMove = myMove // freeze the sequence state - it is NOT shared with other parts of the graph
          cloneMove.seqAccum = _cloneDeep(perm)
          // cloneMove.seqAccum = perm
          return { branch: n, parent: cloneMove, weight: weightCurr * weights[idx] }
        }))
      } else {
        // END of a sequence (single branch)
        // wrap it and stash it
        permWrapper.hdr = {} // accum one perm based on this combo {id:, length:, weight:, moves: [{name:, length:}, ...]}
        permWrapper.moves = []
        let normPerm = cartesian(...perm)
        if (!Array.isArray(normPerm[0])) { // Single perm in combo, normalize to an array!
          normPerm = normPerm.map(mv => [mv])
        }
        // SET SOME comboheader header data, and also data structures for metrics/diagnostics
        for (let sqix = 0; sqix < normPerm.length; sqix++ ) {
          const s = normPerm[sqix]
          const comboLen = s.reduce((acc, cval) => acc + cval.length, 0)
          // let's pack some info in the id field: shorthand for what it contains
          //  currNode.branch is currently the unique identifier of end node
          const comboId = s.map(m => m.move.substr(0, 3) + (m.upshift ? '🔥' : '') + m.length).join('').replace(' ', '') + '-' + currNode.branch.substr(4) + '-' + comboLen
          permWrapper.hdr = {}
          permWrapper.hdr = { id: comboId, length: comboLen, weight: weightCurr / normPerm.length }
          permWrapper.moves = []
          permWrapper.moves.push(_cloneDeep(s))
          // permWrapper.moves.push(s)
          perms.products.push(_cloneDeep(permWrapper))
          // perms.products.push(permWrapper)
          if (!cboHdr.$.endNodes[currNode.branch]) cboHdr.$.endNodes[currNode.branch] = { permCount: 0, permDict: {} }
          if (!cboHdr.$.endNodes[currNode.branch].permDict[permWrapper.hdr.id]) cboHdr.$.endNodes[currNode.branch].permDict[permWrapper.hdr.id] = 0
          perms.hdr.min = parseInt(this.currCbo.$.minLength)
          perms.hdr.max = parseInt(this.currCbo.$.maxLength)
          perms.hdr.baseCombo = this.currCbo.$.name
          perms.hdr.gears = this.currCbo.$.gears
        }
      }
      // NEXT NODE, prepare for the WHILE loop: set currNode
      // console.log(currNode.branch, JSON.stringify(arrBranchTrail.map(b => b.branch)))
      if (arrBranchTrail.length > 0) {
        currNode = arrBranchTrail.pop() // obj like {choice: 'node9', parent: ....}
        // here we reuse the parents max-min calculated previously,
        // since it is the accum min/max to this branching point,
        // it represents our starting min/max as we follow a different branch from the same node
        perm = currNode.parent.seqAccum
        weightCurr = currNode.weight
      } else {
        currNode = null // breaks // loop is done: set results
      }
    }
    return perms
  }

  getShifts (maxBeats) {
    // genOkPerms helper.
    // Song check: find the gear shifts in the song
    //  maxBeats is the longest perm, no need to look farther in the song
    const that = this
    const findNextMove = function (iStart) {
      let max = 0
      for (let i = iStart; i < that.lstTimesAndGears.length; i++) {
        max = i - iStart
        if (that.lstSeqEdited[i] || ('cambio' === that.lstTimesAndGears[i].gear)) {
          // if there's a move already in range
          //   remember it, so we stop before we hit it
          break
        }
      }
      // if we got to the end, add 1 for the last iter,
      return max + 1
    }
    // return a profile of shifts, as far as the length of the longest perm
    // it has an ordered array of objects {pos: n, gear: 'string'}
    // if there's already a move in the seq ahead... we won't overwrite it... look for one here:
    const maxClear = findNextMove(this.currentBeatIndex)
    const lim = maxClear < maxBeats ? maxClear : maxBeats
    const colShifts = []
    for (let ptr = this.currentBeatIndex; ptr < (lim + this.currentBeatIndex); ptr++) {
      let curGear
      try {
        curGear = this.lstTimesAndGears[ptr].gear
      } catch (error) {
        console.log('getShifts - exceeded end of beats, check value of limit "lim"')
      }
      // if we pre-arrange that cambio gear is already assigned the Medio move in sequence...
      //   THEN we can REMOVE this entire conditional
      if (curGear === 'cambio') {
        if (ptr > this.currentBeatIndex) {
          // cambio will mark the end of 1 fill operation
          colShifts.push({ pos: ptr - this.currentBeatIndex, gear: 'stop' })
          return colShifts
        }
        // break
      }
      if (ptr > 0) {
        if (curGear === 'accent' || curGear === 'climax' || curGear === 'spicy') {
          if (ptr > this.lstTimesAndGears[ptr - 1].gear !== curGear) {
            if (ptr > this.currentBeatIndex) {
              colShifts.push({ pos: ptr - this.currentBeatIndex, gear: curGear })
            }
            }
          }
      }
    }
    // last item in arr will be just the available space for perm
    //  either the last beat before we run into pre-existing calls
    //    or, if no existing calls are in the way, then the end of the song
    colShifts.push({ pos: lim, gear: 'stop' })
    return colShifts
  }

  genOkPerms (audit, cboHdr) {
    // depends on globals: currentBeatIndex, lstTimesAndGears
    // orig purpose: user clicks a beat of a song, in calls mode, and picks Combo mode
    //   then selects a combo.  This will generate all the perms of the combo that fit the song
    //   using rules implemented here
    // 2024: now used by AutoFill, which divides the song into coniguous beat sections, and calls this repeatedly
    //   to fill each section.
    //
    // We create all perms of the parameter Combo, and assess each against the song beats(gears) using our rules
    //  From those that pass, we also pick one at random to be actually applied if the caller wants to do that
    //  The values are stored at:
    //     this.okPerms, this.selPermIndex
    this.okPerms = [] // for all the perms that PASS THESE TESTS
    this.selPermIndex = -1 // invalid sentinel value

    const that = this // for use in some nested scopes
    const timeStart = new Date() // for runtime profiling

    // songShifts is going to be at least 1 length: the (artificial) stop shift, at the end
    songShifts = this.getShifts(parseInt(cboHdr.$.maxLength)) // (gear, position)
    const maxLength = songShifts.pop().pos // REMOVE the stop pos from songShifts, KEEP it in maxLength

    // producePermutations generate all possible combo "permutations"
    // and then filter ones whose move gears conincide with the song's gears
    const perms = this.producePermutations(cboHdr)
    this.allPerms.push(perms)
    this.numPerms = perms.products.length
    // prep: look through perms: are there any (more than zero) that have
    //  marked a move as "upshift"?  If so, save a flag.  When we filter eligible perms
    //  we will select ONLY those that match a climax/spicy bar in the songShifts
    // console.log('perms: ' + JSON.stringify(perms.products.length))
    // maxLength we check is the length allowed to end of song; or (if later moves exist already) just to the next move
    // console.log('songShifts: ' + JSON.stringify(songShifts) + ', maxLength: ' + maxLength)
    // filter every perm for matching the songShifts

    // Step thrgough ALL PERMUTATIONS
    //   ...and passing ones that have SHIFTs matching SHIFTS in the song
    //   WHY? we are trying to maximize musicality of the calls
    //       where? look in the shifter check method
    //  STRATEGY
    //  2 loops are possible based on "passcount" var
    //    1st loop is more strict: it insists that if a song has shift marked as SPICY/CLIMAX that a move marked
    const timeToFilter = new Date() // for runtime profiling
    //  - first pass (passCount == 0) forces matching upshift moveNext to a songshift of climax / spicy
    //  - second pass (passCount == 1) could ease off on requiring NO GUAPEA for a move on a shift

    let perm // the "perm" we are currently evaulating
    for (let j = 0; j < perms.products.length; j++) {
      perm = perms.products[j]
      // NOW accept or reject the perm
      if (perm.hdr.length > maxLength) {
        audit.push('p-~ ' + perm.hdr.id + ' REJECT - before checking, we know there is NO ROOM at position - ' + this.currentBeatIndex)
        continue // *** BAIL *** not enough space
      }
      // work done by "screener" and "shifter"
      // pass 1: upshift in perm REQUIRES upshift in song
      // pass 2: accept a accent shift as a match (second pass allows mismatch)
      // all the moves of the perm are at perm.moves[0] (due to XML-JSON conversion process)

      // top level routine loops throug perms
      //   stateful helper 'screener' checks through perms
      //   and contains helper 'shifter', checks through moves in the perm, vs beats in the song

      const screener = {
        // screener is an object that runs the shifter, see comments in its check function
        accBeats: 0,
        borrowBeats: 0,
        // these values from shifter sub-object
        check: function (locAudit, moveCurr, moveNext, movePrev, songShifts, that) {
          // last arg that is a ref to the AutoFiller object
          let res = 0 // assume reject until we prove it fits
          // screener inits the beats accumulator. with the first move and any "borrowing"
          // AND calls the shifter
          // AND returns the shifter's return value
          //   telling the caller if perm is ACCEPTED or REJECTED

          // arg2 always a new move.  moveNext, movePrev may or may not exist (null)

          // first reading the code, first consider that setupbards and borrowbeats are always zero
          // When that's clear, start looking at how a setup beat "moves" to the previous move when lining up calls

          // Setupbars are "borrowed", moved to the previous beat length
          // This is intended to improve the musicality
          //  so that the setup is compplete before the coming beat
          //   and the emphatic part of the move moves up to the 1 count.

          //  "borrowbeats" can be > 0 on next line... only if there was a PREVIOUS move to "borrow" from
          //    ...not at the 1st move of a perm

          // moveCurr begins somewhere BEFORE the shiftIdx we will be considering -- moveNext is the one that will be placed next
          this.accBeats += (moveCurr.length - this.borrowBeats) // take the previous bo
          this.borrowBeats = 0 // clear for next move

          // here's where borrowbeats picks up its value
          if (moveNext && moveNext.setupbars) this.borrowBeats = moveNext.setupbars || 0
          this.accBeats += this.borrowBeats
          res = this.shifter.check(locAudit, this.accBeats, moveCurr, moveNext, songShifts, that)
          return res // true or false
        },
        shifter: {
          // shifter is an object that loops through all the song shifts
          // AND evals and returns the thumbs up or down
          //    [ok-so-far - as it works through shifts]
          //    [reject if any problem found, then finally accept]
          shiftIdx: 0,
          check: function (locAudit, accBeats, moveCurr, moveNext, songShifts, that) {
            // last arg that is a ref to the AutoFiller object
            // ret 0: PERM REJECTED, misfit, break and go to next
            // ret 1: KEEP GOING ...ok so far, pass in NEXT move
            // ret 2: no more shifts to check, perm is OK
            // while (true) { // stay here while we fill the current songShift TODO: kill this loop?  ONE PASS is all needed??
              // we are looping though the moves of a perm
              //   and manually stepping through the songshifts
              //   to filter incompatible "perms" with the song
              // THERE ARE 3 states as we step through here:
              //  MISSED A SHIFT
              //  DIRECT HIT ON A SHIFT
              //  STILL before next shift
              //
              // Strategy:
              //
              //   Trying to get moves with setup to start the repetitive part on beat 1, to maximize effect
              //   Simple moves, try to ensure there is a move start on beat 1
              //    - unless that move is level 1: guapea, arriba, al centro: keep the blah moves from happening on 1
              //   Trying to match climax / spicy wherever possible (pass 1 only)
              if (this.shiftIdx > songShifts.length - 1) {1
                locAudit.push('pa~ ' + perm.hdr.id + ' ACCEPT - before checking, we know this is END of shifts')
                return 2 // ** EXIT HERE **
              }

              // CASE 1: we left an unmatched shift behind when we added the last perm move
              if (songShifts[this.shiftIdx].pos < accBeats) {
                // passCount zero or one
                locAudit.push('p-~ ' + perm.hdr.id + ' REJECT pass' + (that.passCount + 1)  + '- SHIFTER: MISSED shift: pos ' + songShifts[this.shiftIdx].pos)
                return 0

                // CASE 2: we hit a song shift bang on exactly
              } else if (songShifts[this.shiftIdx].pos === accBeats) {
                if (moveNext && moveNext.level !== 1) {
                  if (that.passCount === 0) {
                    if (['spicy', 'climax'].includes(songShifts[this.shiftIdx].gear)) {
                      if (moveNext.gear === 'upshift') {
                        locAudit.push('p+~ ' + perm.hdr.id + ' CONTINUE pass' + (that.passCount + 1) + '- SHIFTER: UPSHIFT match: ' + moveNext.move)
                        return 1
                      } else {
                        locAudit.push('p-~ ' + perm.hdr.id + ' REJECT pass' + (that.passCount + 1)  + '- SHIFTER: not an UPSHIFT match: ' + moveNext.move)
                        return 0
                      }
                    } else {
                      locAudit.push('p+~ ' + perm.hdr.id + ' CONTINUE pass' + (that.passCount + 1) + '- SHIFTER: acceptable here (any move except level 1): ' + moveNext.move)
                      return 1
                    }
                  } else { // passCount 1
                    locAudit.push('p+~ ' + perm.hdr.id + ' CONTINUE pass' + (that.passCount + 1) + '- SHIFTER: acceptable here (any move except level 1): ' + moveNext.move)
                    return 1
                  }
                } else { // guapea, etc is level 1
                  if (moveNext) {
                    locAudit.push('p-~ ' + perm.hdr.id + ' REJECT pass' + (that.passCount + 1)  + '- SHIFTER: level 1 move is not good enough: ' + moveNext.move)
                    return 0 // guapea etc: not good enough to hit a shift!
                  } else {
                    locAudit.push('pa~ ' + perm.hdr.id + ' ACCEPT pass' + (that.passCount + 1)  + '- SHIFTER: No next move in this perm')
                    return 2 // ** EXIT HERE **
                  }
                this.shiftIdx += 1
                }

                // CASE 3: we haven't caught up to the next songshift yet
              } else if (songShifts[this.shiftIdx].pos > accBeats) {
                // After adding the current move, we still haven't reached the next song shift.
                if (moveNext) {
                  if (that.passCount === 0) {
                    if (['1', '2'].includes(moveNext.setupbars) && moveNext.level > 1) { // extending move with setupbars, s/b on 1 count
                      locAudit.push('p-~ ' + perm.hdr.id + ' REJECT pass' + (that.passCount + 1)  + '- SHIFTER: we want move to fall on 1: ' + moveNext.move)
                      return 0
                    } else {
                      locAudit.push('p+~ ' + perm.hdr.id + ' CONTINUE pass' + (that.passCount + 1)  + '- SHIFTER: move accepted for mid-shift: ' + moveNext.move)
                      this.shiftIdx += 1
                      return 1
                    }
                  } else {
                    locAudit.push('p+~ ' + perm.hdr.id + ' CONTINUE pass' + (that.passCount + 1)  + '- SHIFTER: move accepted for mid-shift: ' + moveNext.move)
                    this.shiftIdx += 1
                    return 1
                  }
                } else {
                  locAudit.push('pa~ ' + perm.hdr.id + ' ACCEPT pass' + (that.passCount + 1)  + '- SHIFTER: No next move in this perm')
                  return 2
                }
              }
            // }
            debugger // shouldn't hit this: all cases should be handled with appropriate return values already
          }
        }
      }
      for (this.passCount = 0; this.passCount < 2; this.passCount++) {
        // re-initialize in the loop
        screener.accBeats = 0
        screener.borrowBeats = 0
        screener.shifter.shiftIdx = 0
        let res = 2 // if still 2 after next loop, the perm is accepted

        for (let i = 0; i < perm.moves[0].length; i++) { // we've added item 0 before we started
            res = screener.check(
            audit,
            perm.moves[0][i],
            perm.moves[0][i + 1] || null,
            perm.moves[0][i - 1] || null,
            songShifts,
            that // the AutoFiller object
          )
          // kill this perm
          if (res === 0 || res === 2) {
            // 1 = move ok, keep going: i.e. checking the rest of perm
            // 2 = perm is ok, break to outer loop where we save
            break
          }
        }
        // we've checked all the moves in the perm
        if (res === 1 || res === 2) {
          // 1 = move ok, keep going: i.e. checking the rest of perm
          // 2 = perm is ok in it's entirety: stop checking remaining moves
          this.okPerms.push(perm) // if all the moves fit, it's certified OK
          break
        }
      }
    }
    // NOW we have all the eligible perms in okPerms
    const timeFinish = new Date()
    // console.log('genOkPerms made ' + this.okPerms.length + ' perms in ' + (timeFinish - timeStart) + ' ms')
    // console.log('  - generate time/filter time ' + (timeToFilter - timeStart) + ' / ' + (timeFinish - timeToFilter) + ' ms')
    //  Do we have any fitting permutations at all?
    // okPerms has all the legal "permutations" per the song,
    //   i.e. the move length vs accent gears, upshift flag vs climax/spicy gears, and 'allow one miss' flag

    // select random perm
    //   hepler for randIndex: get total weight
    const totWeight = this.okPerms.reduce((acc, perm) => acc + perm.hdr.weight, 0)
    // get a random number in the domain of the total
    const randIndex = () => {
      const rnd = Math.random() * totWeight
      let acc = 0
      // iterate to find the 'hit' perm
      for (let i = 0; i < this.okPerms.length - 1; i++) {
        acc += this.okPerms[i].hdr.weight
        if (acc > rnd) return i
      }
      // infinitesimal chance of hitting infinitely small rounding at the last loop?
      return this.okPerms.length - 1
    }
    this.selPermIndex = randIndex() // pick one: used by autofill, may be over-ridden in GUI combo picking
  }

  autoFill (aryAudit = []) {
    // fill the song beats with calls based on combos in the system
    // 1. check if it's the first call in the song: then, use a combo marked with the startup flag
    //     (starts with guapea or al centro)
    // 2. loop until song beats are full:
    //      a) start at currentBeatIndex, i.e. the starting spot for a combo
    //      b) pick a combo at random, but odds set by the "weight" of each combo
    //      c) divide the song into segments IF any cambio (irregular) beats are marked in the song beat "gear"
    //      d) call genOKPerms to check all the parms against the song and our rules for matching
    //        i) genOkPerms containes object "screener", which contains object "shifter"
    //        ii) screener may "borrow a beat" from a move in the perm, if move has a "setup bar"
    //        iii) calls shifter: returns false to reject a perm,
    //                or OKs a single move (matches the song)
    //                if the perm matches all shifts in the song, right to the end, return true
    //      e) if genOkPerms receives "true" the perm as added to okParms collection, and is eligible to be chosen
    //           according to move probabilities.  That's called "Weight" of a branch in the combo tree.
    //
    // TO USE:
    //   this.currentBeatIndex
    //   this.lstTimesWork
    //   this.lstSeqEdited (clear it first, then fill it)

    /* eslint-disable */

    // // TRY STARTING ON BEAT 3 or so?
    const that = this // for use when scope goes away in loops etc
    this.lstSeqEdited = []

    // NEXT TWO VARS accumlate the main output
    // the retFillSeq collection we build here is a sequence of bare moves - not beats.
    // e.g.enchufla doble takes 1 spot in this list, but 3 beats in the expanded seq used while playing the song
    //  and used by genOkPerms.
    // this.currentBeatIndex is a pointer into the expanded sequence, so we need a pointer into the compact sequence
    //  we build in this routne
    let retFillSeq = new Array() // this wwill be a pile of move names, unexpanded
    let currentSeqPointer = 0  // pointer into the unexpanded list built here.  Like this.currentBeatIndex is a pointer into the fully expanded sequence

    let firstPerm = true

    let openingCombos = []
    // parallel arrays to openingCombos
    let openingCombosWts = []
    let openingCombosWtsCum = []

    let mainCombos = []
    // parallel arrays to mainCombos
    let mainCombosWts = []
    let mainCombosWtsCum = [] // parallel arrays to mainCombos

    let wtOpeningTotal = 0
    let wtMainTotal = 0

    let workingCombos = _cloneDeep(that.editedCombos)

    const getFillSpots = function (initOffset, lstSeq, lstBeats, lstMoves) {
      // If the song has clave switches, normal moves won't fit
      // those beats.  We find the switches (marked with the gear "cambio")
      //   and insert a move in the sequence (call is currently "Cruce") that is consumes only 4 counts, not 8
      // RETURNS: the number of such moves inserted
      let start = 0 // modified in loops below
      let aryFillPos = []
      let nRumbaPosition; // will hold the location of 1 rumba call, as found in this iteration
      let bRumbaFlag // will tell us if the song starts with a rumba section (gear=rumba)
      //   which will be excluded from the fill spots ranges by pusing up the currentBeatIndex
      // In other words: a rumba section can be recognized, but only at the start of the song!

      // typeof bRumbaFlag === 'undefined': we haven't elimated the possibility of a rumba start
      // typeof bRumbaFlag === 'object': we ELIMINATED the possibility of a rumba start (we assigned null, which is object)
      // typeof bRumbaFlag === true: there is a rumba section, and we are counting up a new value for 'start', the start of regular salsa beats

      for (let i = 0; i < lstBeats.length; i++) {
        // rumba sect (if any) must be at start of song: before any of ['accent', 'spicy', 'climax']
        if (typeof bRumbaFlag === "undefined") {
          if (lstBeats[i].gear === 'rumba') {
            bRumbaFlag = true
            nRumbaPosition = i
          } else if (['accent', 'spicy', 'climax'].includes(lstBeats[i].gear)) {
            bRumbaFlag = false
          }
        }
        if (bRumbaFlag) { // not null, not undefined
          // if we have a rumba section, now we signal the end of it by undefined value
          start = i // keep counting the measure of rumba at the start
          if (['accent', 'spicy', 'climax'].includes(lstBeats[i].gear)) bRumbaFlag = null
          // cambio (if any) must come later in the song, after some bars of regular salsa dance time
        } else if (lstBeats[i].gear === 'cambio') {
          // the gear creation should prevent two consecutive beats both with a shift
          aryFillPos.push(i)
        }
      }
      let ret = {}
      ret.rumbaPosition = Math.max(nRumbaPosition - initOffset, 0) // index can't be less than zero!
      // typeof rumbaPosition will test as NaN if there is no rumba section at start of song
      ret.autoFillPositions = [start].concat(aryFillPos) || []
      return ret
    }

    const refreshCombos = function () {
      // two sets of combos:
      //  opening combos
      //  main combos
      // to choose a move from.  As one is tested for the current song position, it is removed from the choices
      openingCombos = []; openingCombosWts = []; openingCombosWtsCum = []; wtOpeningTotal = 0
      mainCombos = []; mainCombosWts = []; mainCombosWtsCum = []; wtMainTotal = 0
      for (const [_, value] of Object.entries(workingCombos)) {
        let startup = false
        if (cleanbool(value.$.startup) === true) startup = true // poss string s/b integer
        const wt = parseInt(value.$.weight)
        if (wt > 0) {
          if (startup) {
              openingCombos.push(value)
              openingCombosWts.push(wt)
              wtOpeningTotal += wt
          } else {
            mainCombos.push(value)
            mainCombosWts.push(wt)
            wtMainTotal += wt
          }
        }
      }
      let i
      let cum = 0
      for (i = 0; i < openingCombos.length; i++) {
        openingCombosWts[i] = openingCombosWts[i] / wtOpeningTotal
        cum += openingCombosWts[i]
        openingCombosWtsCum.push(cum)
      }
      cum = 0
      for (i = 0; i < mainCombos.length; i++) {
        mainCombosWts[i] = mainCombosWts[i] / wtMainTotal
        cum += mainCombosWts[i]
        mainCombosWtsCum.push(cum)
      }
    }

    const timeStart = new Date() // for runtime profiling

    refreshCombos() // first time, no combos are rejected
    // THIS SECTION identifies short musical measures, that need special moves. (Cruce usually)
    //  We consider areas between these as the target for when applying our moves (perms)

    //  let's find these limiting markers in our lstTimesAndGears.  We also check for a rumba beginning, fairly common in timba
    const fillInfo = getFillSpots(this.currentBeatIndex, this.lstSeqEdited, this.lstTimesAndGears, this.editedMoves)
    this.aryFillSpots = fillInfo.autoFillPositions
    // Did getFillSpots find a rumba gear in the song, at the beginning?  i.e. before regular upshifts?
    //  If so... this gets a single "Rumba" call
    const nRumbaPosn = fillInfo.rumbaPosition // save this until the autofill moves are in!
    currentSeqPointer = this.currentBeatIndex // indent before 1st call: same in compact sequence and expanded sequence
    // OK we have our autofill areas.  For each available segment of beats,
    //  generate perms (groups of moves) to fill them
    for (let spot = 0; spot < this.aryFillSpots.length; spot += 1){
      if (spot === 0) {
        // first move, we need to bild in the warmup bars before calls start: initial setting of currentBeatIndex
        retFillSeq = new Array(currentSeqPointer) // downstream, undefined elements are assumed to be Continue move(no audible call, 1 beat long)
      } else { // after the starting moves are in place
        let fillContinues = this.aryFillSpots[spot] - this.currentBeatIndex // if there is unfilled space
        // before the fill spot, fill them with Continues.  so the same fill applies to both compacted and expanded sequence.
        // NOTE: an empty array member is considered a silent Continue move by the player
        currentSeqPointer += fillContinues
        this.currentBeatIndex += fillContinues

        // the first spot (index 0) is our starting spot.  If there are any MORE after this,
        //  then there must be a "cambio" (short measure) gear, and we'll put a moveCruce at that spot
        let mv = this.moveCruce
        // compute the right message for audit trail next:
        let bts = that.lstTimesAndGears; let ix = this.currentBeatIndex // for "beats", make next code easier to read!
        let aud = 'ms~ Cambio (half measure clave switch) at beat: ' + ix
        // There's a slight chance of a short measure that is longer than 2 beats of 4: 3 beats of 4.
        // In that case we'll call Foto currently
        try { // take the short cambio interval, x 2.  Div by total of preceding and following interval.
          // if 5/8 or more, then the cambio is a bit longer.  Instead of a half measure, it's 6/8 of a measure.  e.g. Pachito Alonso, La Calle me Llama
          if (((bts[ix + 1].time - bts[ix].time) * 2) / ((bts[ix + 2].time - bts[ix + 1].time) + (bts[ix].time - bts[ix - 1].time)) > 0.625) {
            mv = this.moveFoto
            let aud = 'ms~ Cambio (3/4 measure clave switch) at beat: ' + ix
          }
        } catch (error) {
          // console.log ('Expected conditional ERROR Checking cambio measure to see if 3/4 of a measure: leaving as half a measure!')
        }
        aryAudit.push(aud)
        retFillSeq[currentSeqPointer] = mv
        currentSeqPointer += 1 // don't clobber my mv (cambio)
        this.currentBeatIndex += 1 // don't clobber my mv (cambio)
        workingCombos = _cloneDeep(that.editedCombos)  // start next segment with a full choice of combos, ready for next call to refreshCombos
      }

      // THE TRUE LOOP: roll through the combos in the TRUE loop, randomly trying to find one that fits our song
      //   on finding one: add the moves, bump our currentBeatIndex then BREAK from the loop
      //   if none found: leave a gap, go to next "spot" if any!
      let ary, pmf, cdf, chooseCombo // to track untried combos, and also apply probability to them
      while (true) { // we will call break to exit
        // test random combos in turn, appending each one that fits
        // our copy of combos shrinks as a combo fails at a given index, and we try another
        // routine genOkPerms uses the same autoFiller pointer currentBeatIndex for testing
        refreshCombos()
        if (firstPerm) { ary = openingCombos; pmf = openingCombosWts; cdf = openingCombosWtsCum }
        else { ary = mainCombos; pmf = mainCombosWts; cdf = mainCombosWtsCum }
        if (ary.length === 0) {
          aryAudit.push('xx~ NO FIT! aryspots: ' + that.aryFillSpots.toString() + ', curr:' + that.currentBeatIndex + ", song:" + that.songName)
          break
        }
        chooseCombo = () => {
          // random combo chosen here
          var rand = Math.random()
          var ind = cdf.findIndex(el => rand <= el)
          try {
            return ary[ind]
          } catch (error) {
            console.error('error in chooseCombo fn, ary.length:' & ary.length & ', ind:' & ind)
          }
        }
        let cbo = chooseCombo()
        // NOTE: these tags (3 chars at start of audit line) are critical for test analysis
        aryAudit.push('cn~ ' + cbo.$.name + ' [at pos ' + this.currentBeatIndex + ']')

        // ***>>>***>> the TEST is here
        this.genOkPerms(aryAudit, cbo) // now all legal perms for the current beat are in this.okPerms

        const pmSel = this.okPerms[this.selPermIndex] // random choice picked by genOkPerms
        if (!pmSel) {
          // REMOVE the combo that didn't fit, and we will choose randomly from the rest
          delete workingCombos[cbo.$.name]
          aryAudit.push('cx~ ' + cbo.$.name + ' [no perms fit (tested perms ' + this.numPerms + ')]')
        } else {
          firstPerm = false
          // NOTE: these tags (3 chars at start of audit line) are critical for test analysis
          aryAudit.push('pu~ ' + pmSel.hdr.id + ' RAND SELECTED PERM - (okperms ' + this.okPerms.length + ', all perms '+ this.numPerms +')')

          // ***>>>***>> ADD the new moves here
          // //  1st set the size, there may be unfilled spots before our index
          // let reqdPos = Math.max(this.currentBeatIndex - 1, 0)
          // if ((retFillSeq.length - 1) < reqdPos) {
          //   retFillSeq[reqdPos] = undefined // can create sparse array members before the position
          //   retFillSeq.pop() // trim just 1 off, now the push will start at currentItenIndex
          // }

          // ***>>>***>> ADD the new moves here
          retFillSeq.push(...pmSel.moves[0])

          pmSel.moves[0].forEach(element => {
            this.currentBeatIndex += element.length
            currentSeqPointer += 1 // the compact sequence only counts each move once
          })
          // are we done yet?
          if (this.currentBeatIndex >= this.lstTimesAndGears.length) break
          if (this.aryFillSpots[spot+1]) if (this.currentBeatIndex >= this.aryFillSpots[spot+1]) break

          // we have a perm for this beat, now reset our choices for NEXT available beat
          workingCombos = _cloneDeep(that.editedCombos)
        }
      }
    }

    // now we can add the Rumba call we found: if any!
    if (!isNaN(nRumbaPosn)) retFillSeq[nRumbaPosn] = this.moveRumba

    const elapsed = new Date() - timeStart
    aryAudit.push('tm~ ' + elapsed/1000 + ' sec.')
    return [retFillSeq, aryAudit]
  }

  // -------------------------
  // -- BEGIN RMSpot ONLY CODE
  // -------------------------
  // RMSpot and RuedaMatic Editor share the same processing code for AutoFiller
  //   but the raw data is in slightly different format.  Use adaptors when
  //   feeding AutoFill from RMS, and when getting results
  adaptorFromRMSMoves (rmSpotMoves) {
    let clonedMoves = _cloneDeep(rmSpotMoves)
    let newValue
    let compatMoves = []
    for (const [_, value] of Object.entries(clonedMoves)) {
      newValue = { $: value }
      let newComment = newValue.$.comment
      delete newValue.$.comment
      newValue.comment = newComment
      compatMoves.push(newValue)
    }
    const movesSortable = compatMoves.map(m => { m.$.nameSorted = m.$.name.toLocaleLowerCase(); return m })
    // nameSorted was added recently, guard against old files that might not have it
    return _sortBy(movesSortable, m => m.$.nameSorted)
  }

  adaptorFromRMSCombos (rmSpotCombos) {
    let clonedCombos = _cloneDeep(rmSpotCombos)
    let compatCombos = {}
    for (const [key, value] of Object.entries(clonedCombos)) {
      let newNodes = value.nodes // singular
      delete value.nodes
      compatCombos[key] = { $: value, nodes: newNodes }
    }
    return compatCombos
  }

  // -----------------------
  // -- END RMSpot ONLY CODE
  // -----------------------

}

export default AutoFiller
