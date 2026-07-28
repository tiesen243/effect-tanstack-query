import type {
  DefinedInitialDataOptions,
  MutationOptions,
} from '@tanstack/react-query'
import type { Service } from 'effect/Context'
import type { ManagedRuntime } from 'effect/ManagedRuntime'

import * as Effect from 'effect/Effect'

import type { TanstackQueryOptionsProxy } from './types'

/**
 * Creates a type-safe proxy that bridges Effect `HttpApiClient` endpoints
 * with TanStack Query options (`queryOptions`, `mutationOptions`, and `getQueryKey`).
 *
 * @param tag - The Effect `Service` tag used to locate the client implementation within the Context.
 * @param runtime - The Effect `ManagedRuntime` used to execute effects as promises.
 *
 * @returns A proxy object structured like the target API client, providing TanStack Query helpers for each endpoint.
 *
 * @example
 * ```ts
 * class ApiGroup extends HttpApiGroup.make('ApiGroup')
 *  .add(HttpApiEndpoint.get('hello', '/hello', { success: Schema.String, query: Schema.Struct({ name: Schema.String }) }))
 *  .add(HttpApiEndpoint.post('bye', '/bye', { success: Schema.String, payload: Schema.Struct({ name: Schema.String }) })) {}
 *
 * class Api extends HttpApi.make('Api').add(ApiGroup) {}
 *
 * class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()('ApiClient') {
 *  public static live = Layer.effect(this, HttpApiClient.make(Api)).pipe(Layer.provide(FetchHttpClient.layer))
 * }
 *
 * const runtime = ManagedRuntime.make(ApiClient.live)
 * const api = createTanstackQueryOptionsProxy(ApiClient, runtime);
 *
 * // Example usage in a React component with TanStack Query
 * const { data } = useQuery(api.hello.queryOptions({ query: { name: 'World' } }))
 * //       ^? const data: string = "Hello, World!"
 *
 * const { mutate, data } = useMutation(api.bye.mutationOptions())
 * //               ^? const data: string = "Goodbye, World!"
 * mutate({ name: 'World' })
 * ```
 */
function createTanstackQueryOptionsProxy<TServiceTag, TService>(
  tag: Service<TServiceTag, TService>,
  runtime: ManagedRuntime<TServiceTag, never>
): TanstackQueryOptionsProxy<TService> {
  /**
   * Internal cache for memoizing Proxy instances to avoid unnecessary re-allocations.
   */
  const cache = new Map<string, unknown>()

  /**
   * Recursively creates or retrieves a cached Proxy instance for a given property path.
   *
   * @param path - An array of property keys representing the object trajectory (e.g., `['users', 'getById', 'queryOptions']`).
   * @returns A proxy function handling property accesses and method invocations.
   */
  const createProxy = (path: string[]): unknown => {
    const cacheKey = path.join('.')
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    const proxy = new Proxy(
      () => {
        // This function is intentionally left empty. The proxy will handle method calls and property accesses.
      },
      {
        get(_target, prop) {
          if (typeof prop === 'symbol' || prop === 'then') return
          return createProxy([...path, String(prop)])
        },

        apply(_target, _thisArg, args) {
          const action = path.at(-1)
          const apiPath = path.slice(0, -1)
          const [input, options] = args

          /**
           * Executes the targeted Effect HTTP API endpoint by navigating the service instance.
           *
           * @param params - Parameters/payload passed into the target endpoint function.
           * @param signal - Optional `AbortSignal` for canceling request execution.
           * @returns A Promise resolving to the Effect result.
           */
          const execute = (params: unknown, signal?: AbortSignal) =>
            runtime.runPromise(
              Effect.gen(function* executeGen() {
                // oxlint-disable-next-line typescript/no-explicit-any
                const api: any = yield* tag

                let fn = api
                for (const p of apiPath) fn = fn[p]

                return yield* fn(params)
              }) as Effect.Effect<unknown, unknown, TServiceTag>,
              { signal }
            )

          /**
           * Constructs a consistent, structured array key for TanStack Query caching.
           *
           * @param queryType - The operation type (`'query'` or `'mutation'`).
           * @param inp - The input parameters or payload associated with the endpoint request.
           * @returns A read-only query key array.
           */
          const createKey = (queryType: string, inp: unknown) => [
            { type: queryType },
            ...apiPath,
            ...(inp ? [inp] : []),
          ]

          if (action === 'queryOptions')
            return {
              ...options,
              queryKey: createKey('query', input),
              queryFn: ({ signal }) => execute(input, signal),
            } satisfies DefinedInitialDataOptions

          if (action === 'getQueryKey') return createKey('query', input)

          if (action === 'mutationOptions')
            return {
              ...options,
              mutationKey: createKey('mutation', input),
              mutationFn: (payload) => execute({ payload }),
            } satisfies MutationOptions
        },
      }
    )

    cache.set(cacheKey, proxy)
    return proxy
  }

  return createProxy([]) as TanstackQueryOptionsProxy<TService>
}

export type { TanstackQueryOptionsProxy } from './types'
export { createTanstackQueryOptionsProxy }
