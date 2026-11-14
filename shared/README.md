# @logivilia/shared

Code used by both workspaces:

- `errorCodes.json`: every error code the API returns (`{ code, params? }`).
  The backend sends them via `backend/utils/apiError.js`, and the frontend translates them in
  `frontend/src/i18n/<locale>.json` under `errors.<CODE>`.
- `index.d.ts`: TypeScript types for the puzzle JSON (`PublicPuzzle<'nonogram'>`, `PuzzleData`,
  `PuzzleAnswer`), the plugin interface (`PuzzleTypePlugin`) and API errors. JS files use them
  through JSDoc, e.g. `/** @type {import('@logivilia/shared').PublicNonogram} */`.
- `puzzles/`: one plugin per puzzle type (ES modules). The backend loads them with a dynamic
  `import()` (`backend/puzzles.js`), the frontend through the Vite alias `@shared`. A plugin
  defines the type's `dataFields`, `checkData`, `computeClues` (what players see) and `validate`
  (is an answer correct); the planned solver adds `solve` and `hint`.

Run `npm run typecheck` from the repo root to check the types and the plugins against them.

To add an error code, add it to `errorCodes.json` and add a message to **every** locale file.
`npm run typecheck` fails if a locale is missing a code.
