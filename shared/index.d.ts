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
//
// Every puzzle is one row of the `Puzzles` table: common columns plus a
// type-specific `data` JSON. The API flattens `data` into the puzzle object,
// so a nonogram arrives as `{ id, type: 'nonogram', name, ..., width, colors,
// rowClues, ... }`. The stored solution never leaves the server.
// ---------------------------------------------------------------------------

export type PuzzleType = 'logical' | 'nonogram' | 'linelog';

/** 1 (easy) to 5 (very hard). Older data stores it as a string. */
export type Difficulty = number | string;

/**
 * Colour grid in the stored encoding: 0 = empty, k = colour k, drawn with
 * `colors[k - 1]`. The last entry of `colors` is the background.
 */
export type ColorGrid = number[][];

/** One clue block: `[colour, length]`, colour in the stored encoding (k >= 1). */
export type ClueBlock = [number, number];

/** Columns every puzzle has, whatever its type. */
export interface PuzzleBase {
  id: number;
  type: PuzzleType;
  name: string;
  difficulty: Difficulty;
  date: string | null;
  author: string | null;
  UserId: number | null;
  /** The puzzle's ID in the old per-type table (before 2026-11), if any. */
  legacyId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LogicalAttribute {
  name: string;
  values: string[];
}

/** Stored `data` of each type (what creators send, including the solution). */
export interface PuzzleData {
  nonogram: {
    width: number;
    height: number;
    numColor?: number | string;
    /** Hex colours: colour k is `colors[k - 1]`; the last one is the background. */
    colors: string[];
    solution: ColorGrid;
  };
  linelog: {
    width: number | string;
    height: number | string;
    numColor?: number | string;
    colors: string[];
    /** The given numbers shown to the player, 0 elsewhere. */
    information: number[][];
    solution: ColorGrid;
  };
  logical: {
    description: string;
    question: string;
    clues: string[];
    attributes: LogicalAttribute[];
    /** One row per value of the first attribute, that value in column 0. */
    solution: string[][];
    image?: string | null;
  };
}

/** What players get for each type instead of the solution. */
export interface PublicPuzzleData {
  nonogram: Omit<PuzzleData['nonogram'], 'solution'> & {
    /** Clues per row, top to bottom. */
    rowClues: ClueBlock[][];
    /** Clues per column, left to right. */
    columnClues: ClueBlock[][];
  };
  linelog: Omit<PuzzleData['linelog'], 'solution'> & {
    /** Colour of every numbered cell (stored encoding), 0 elsewhere. */
    informationColors: ColorGrid;
  };
  logical: Omit<PuzzleData['logical'], 'solution'>;
}

/** What each type accepts as an answer (`{ answer }` in the request body). */
export interface PuzzleAnswer {
  /** A colour grid in the stored encoding. */
  nonogram: ColorGrid;
  linelog: ColorGrid;
  /** The filled table, same shape as the solution. */
  logical: string[][];
}

/** A puzzle as the API sends it. */
export type PublicPuzzle<T extends PuzzleType = PuzzleType> = PuzzleBase & { type: T } & PublicPuzzleData[T] & {
  /** Average rating 1-5, or null if nobody rated it (list endpoint only). */
  avgRating?: number | null;
  ratingCount?: number;
};

export type PublicNonogram = PublicPuzzle<'nonogram'>;
export type PublicLinelog = PublicPuzzle<'linelog'>;
export type PublicLogical = PublicPuzzle<'logical'>;

/**
 * What `POST /puzzles` and `PUT /puzzles/:id` accept: the common columns
 * plus the type's data fields, flat. `id`, `UserId` and timestamps are set
 * by the server.
 */
export type PuzzleInput<T extends PuzzleType = PuzzleType> =
  Partial<Pick<PuzzleBase, 'name' | 'difficulty' | 'date' | 'author'>> & { type: T } & Partial<PuzzleData[T]>;

/** Answer of `POST /puzzles/:id/check` and `POST /puzzles/:id/solve`. */
export interface CheckResult {
  solved: boolean;
}

// ---------------------------------------------------------------------------
// Puzzle-type plugins (shared/puzzles/*.js)
// ---------------------------------------------------------------------------

/**
 * Everything about a puzzle type that both backend and frontend need.
 * The frontend registry adds the Vue component that renders the type.
 */
export interface PuzzleTypePlugin<T extends PuzzleType> {
  type: T;
  /** The keys of `data`. Request fields outside these and the common columns are ignored. */
  dataFields: readonly (keyof PuzzleData[T] & string)[];
  /** Checks creator input. Returns null if usable, otherwise the reason. */
  checkData(data: Partial<PuzzleData[T]>): string | null;
  /**
   * Checks that the puzzle has exactly one solution (runs the solver, so it
   * can take up to a few seconds). Called after `checkData` when puzzle
   * data is saved. Returns null if fine, otherwise an API error.
   */
  checkSolvable?(data: PuzzleData[T]): ApiError | null;
  /** What players see: `data` without the solution, plus derived clues. */
  computeClues(data: PuzzleData[T]): PublicPuzzleData[T];
  /** True when `answer` solves the puzzle. Runs on the server. */
  validate(data: PuzzleData[T], answer: unknown): boolean;
  /**
   * Finds the solutions of a puzzle from its clues alone (audit B6; nonogram
   * so far). `solutions` stops at `limit` (default 2, enough to prove
   * uniqueness); `maxNodes` and `maxMillis` bound the work.
   */
  solve?(clues: PublicPuzzleData[T], options?: { limit?: number, maxNodes?: number, maxMillis?: number }): SolveResult<T>;
  /** Planned (audit B8): the next logical step from a partly solved state. */
  hint?(clues: PublicPuzzleData[T], state: PuzzleAnswer[T]): Hint | null;
}

/**
 * How hard a puzzle is to solve: 'line' = each row and column alone,
 * 'contradiction' = assume one cell and follow the lines until a clash,
 * 'search' = needs guessing (or has no or several solutions).
 */
export type SolveTechnique = 'line' | 'contradiction' | 'search';

export interface SolveResult<T extends PuzzleType> {
  solutions: PuzzleAnswer[T][];
  /** True if it can be solved without guessing (`technique` is not 'search'). */
  logicalOnly: boolean;
  /** The hardest technique needed, the basis for automatic difficulty (audit B7). */
  technique: SolveTechnique;
  /** Line passes of the first line-logic round, also for difficulty (audit B7). */
  steps: number;
  /**
   * False if the node or time budget ran out before finding `limit`
   * solutions or exhausting the search, so `solutions` may be incomplete.
   */
  complete: boolean;
}

export interface Hint {
  /** Cells or table entries the hint is about, in type-specific form. */
  target: unknown;
  /** Short reason, as an i18n key plus parameters. */
  reason: { key: string; params?: Record<string, string | number> };
}

// ---------------------------------------------------------------------------
// Users, ratings, rankings
// ---------------------------------------------------------------------------

/** Counts per puzzle type, e.g. on a user profile. */
export type CountsByType = Record<PuzzleType, number>;

export interface UserStats {
  solved: CountsByType;
  created: CountsByType;
}

export interface RankingEntry {
  id: number;
  username: string;
  solvedCount: number;
}

/** `GET /rankings`: top 10 per type. */
export type Rankings = Record<PuzzleType, RankingEntry[]>;
