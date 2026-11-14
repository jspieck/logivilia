# @logivilia/shared

Code used by both workspaces:

- `errorCodes.json`: every error code the API returns (`{ code, params? }`).
  The backend sends them via `backend/utils/apiError.js`, and the frontend translates them in
  `frontend/src/i18n/<locale>.json` under `errors.<CODE>`.
- `index.d.ts`: TypeScript types for the puzzle JSON (`Logical`, `Nonogram`, `Linelog`) and
  for API errors. JS files use them through JSDoc, e.g.
  `/** @type {import('@logivilia/shared').Nonogram} */`.

Run `npm run typecheck` from the repo root to check the types.

To add an error code, add it to `errorCodes.json` and add a message to **every** locale file.
`npm run typecheck` fails if a locale is missing a code.
