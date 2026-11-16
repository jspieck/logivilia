// Frontend registry of puzzle types: the shared plugin (shared/puzzles, the
// same code the backend runs) plus how the type is shown in the browser.
//
// A board component renders one puzzle and lets the player solve it:
//   props:  puzzle  - the puzzle as the API sends it (no solution)
//           submit  - async (answer) => boolean: records the solve for a
//                     logged-in player, or only checks it for guests
//   emits:  solved  - the player solved the puzzle
// PuzzlePage.vue provides the rest of the page (title, rating, comments).
// An optional adminPanel component (prop puzzleId) is shown below the board
// to Admins and the puzzle's author.
// Boards share pointer input, zoom and undo/redo via ./engine.

import { defineAsyncComponent } from 'vue'
import { plugins } from '@shared/puzzles/index.js'

const ui = {
  nonogram: {
    board: () => import('./nonogram/NonogramBoard.vue'),
    overviewPath: '/nonogram-overview',
    // Old link format, still redirected: /nonogramSolve/<old id>
    legacyPath: '/nonogramSolve/:id',
    showHeader: true
  },
  linelog: {
    board: () => import('./linelog/LinelogBoard.vue'),
    overviewPath: '/linelog-overview',
    legacyPath: '/linelogSolve/:id',
    showHeader: true
  },
  logical: {
    board: () => import('./logical/LogicalBoard.vue'),
    overviewPath: '/logical-overview',
    legacyPath: '/logicalSolve/:id',
    // LogicalDisplay shows the title and intro itself.
    showHeader: false,
    adminPanel: () => import('./logical/LogicalRulesPanel.vue')
  }
}

export const puzzleTypes = Object.fromEntries(
  Object.entries(plugins).map(([type, plugin]) => [type, {
    ...plugin,
    ...ui[type],
    component: defineAsyncComponent(ui[type].board),
    adminPanel: ui[type].adminPanel ? defineAsyncComponent(ui[type].adminPanel) : null
  }])
)

export function getPuzzleType (type) {
  const entry = puzzleTypes[type]
  if (!entry) {
    throw new Error(`Unknown puzzle type "${type}"`)
  }
  return entry
}

export const puzzlePath = (puzzle) => `/puzzle/${puzzle.id ?? puzzle}`
