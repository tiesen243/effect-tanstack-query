export type { TanstackQueryOptionsProxy } from './types'
export { createTanstackQueryOptionsProxy } from './create-proxy'

/**
 * Fix TS4023: Exported variable 'NodeInspectSymbol' has or is using name 'NodeInspectSymbol' from external module "effect/Inspectable" but cannot be named.
 * Do not import or use directly.
 * @internal
 */
export type { NodeInspectSymbol } from 'effect/Inspectable'
