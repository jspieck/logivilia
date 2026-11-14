// Types shared by the backend (via JSDoc `import()` types) and the frontend.
// They describe the JSON the API sends and accepts, not the Sequelize models.

import type errorCodes from './errorCodes.json';

// ---------------------------------------------------------------------------
// API errors
// ---------------------------------------------------------------------------

/** Every error code the API can return, e.g. `"AUTH_INVALID_CREDENTIALS"`. */
export type ErrorCode = keyof typeof errorCodes;

/**
 * Body of every non-2xx API response. The frontend translates `code` with
 * vue-i18n (`errors.<code>`); `params` fills placeholders in the message.
 */
export interface ApiError {
  code: ErrorCode;
  params?: Record<string, string | number>;
}

// ---------------------------------------------------------------------------
// Puzzles
// ---------------------------------------------------------------------------

export type PuzzleType = 'logical' | 'nonogram' | 'linelog';

/** 1 (easy) to 5 (very hard). Older seed data stores it as a string. */
export type Difficulty = number | string;

/** Colour index grid: 0 = empty/background, k = colors[k]. */
export type ColorGrid = number[][];

/** Fields every puzzle row has. */
export interface PuzzleBase {
  id: number;
  name: string;
  difficulty: Difficulty;
  date: string | null;
  UserId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** A logic grid puzzle ("Logical"): clues plus attribute categories. */
export interface Logical extends PuzzleBase {
  description: string;
  question: string;
  clues: string[];
  attributes: LogicalAttribute[];
  /** One row per entity, one column per attribute, in `attributes` order. */
  solution: string[][];
  image: string | null;
  author: string | null;
}

export interface LogicalAttribute {
  name: string;
  values: string[];
}

/** A (multi-)colour nonogram. */
export interface Nonogram extends PuzzleBase {
  width: number;
  height: number;
  numColor: number | string;
  /** Hex colours; index 0 is the background. */
  colors: string[];
  solution: ColorGrid;
  author: string | null;
}

/** A linelog: numbered endpoints that the player connects with lines. */
export interface Linelog extends PuzzleBase {
  width: number | string;
  height: number | string;
  numColor: number | string;
  colors: string[];
  /** The given numbers shown to the player. */
  information: number[][];
  solution: ColorGrid;
}

export type Puzzle = Logical | Nonogram | Linelog;

// ---------------------------------------------------------------------------
// What the puzzle GET endpoints send. The stored solution never leaves the
// server; players get only what they need to solve the puzzle.
// ---------------------------------------------------------------------------

/** One clue block: `[colour, length]`, colour in the stored encoding (k >= 1). */
export type ClueBlock = [number, number];

export interface PublicNonogram extends Omit<Nonogram, 'solution'> {
  /** Clues per row, top to bottom. */
  rowClues: ClueBlock[][];
  /** Clues per column, left to right. */
  columnClues: ClueBlock[][];
}

export interface PublicLinelog extends Omit<Linelog, 'solution'> {
  /** Colour of every numbered cell (stored encoding), 0 elsewhere. */
  informationColors: ColorGrid;
}

export type PublicLogical = Omit<Logical, 'solution'>;

/** Answer of `POST /<type>/:id/check`. */
export interface CheckResult {
  solved: boolean;
}

/**
 * What the solve and check endpoints accept: a nonogram/linelog grid
 * (`{ grid }`) or a logical table (`{ solution }`, one row per value of the
 * first attribute, that value in column 0).
 */
export type SubmittedSolution = ColorGrid | string[][];

/** Fields a client may set when creating or editing a puzzle. */
export type PuzzleInput<T extends PuzzleBase> = Partial<Omit<T, 'id' | 'UserId' | 'createdAt' | 'updatedAt'>>;
