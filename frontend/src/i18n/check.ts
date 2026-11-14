// Compile-time check (npm run typecheck): every API error code from
// shared/errorCodes.json needs a message in every locale.
import type { ErrorCode } from '@logivilia/shared'
import de from './de.json'
import en from './en.json'

type Locale = { errors: Record<ErrorCode, string> }

export const locales: Locale[] = [de, en]
