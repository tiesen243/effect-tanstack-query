// oxlint-disable no-underscore-dangle

import type { MutationOptions } from '@tanstack/query-core'
import type { Service } from 'effect/Context'
import type { ManagedRuntime } from 'effect/ManagedRuntime'
import type { HttpClientResponse } from 'effect/unstable/http/HttpClientResponse'

import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import type {
  QueryOptions,
  SubscriptionOptions,
  TanstackQueryOptionsProxy,
} from './types'

/**
 * Creates a type-safe proxy that bridges Effect `HttpApiClient` endpoints
 * with TanStack Query options (`queryOptions`, `subscriptionOptions`, `mutationOptions`, and `getQueryKey`).
 *
 * @param tag - The Effect `Service` tag used to locate the client implementation within the Context.
 * @param runtime - The Effect `ManagedRuntime` used to execute effects as promises.
 *
 * @returns A proxy object structured like the target API client, providing TanStack Query helpers for each endpoint.
 *
 * @example
 * ```ts
 * class ApiGroup extends HttpApiGroup.make('ApiGroup')
 *   .add(HttpApiEndpoint.get('hello', '/hello', { success: Schema.String, query: Schema.Struct({ name: Schema.String }) }))
 *   .add(HttpApiEndpoint.post('bye', '/bye', { success: Schema.String, payload: Schema.Struct({ name: Schema.String }) }))
 *   .add(HttpApiEndpoint.get('stream', '/stream', { success: HttpApiSchema.StreamSse({ data: Schema.String }) })) {}
 *
 * class Api extends HttpApi.make('Api').add(ApiGroup) {}
 *
 * class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()('ApiClient') {
 *   public static layer = Layer.effect(this, HttpApiClient.make(Api)).pipe(Layer.provide(FetchHttpClient.layer))
 * }
 *
 * const runtime = ManagedRuntime.make(ApiClient.layer)
 * const api = createTanstackQueryOptionsProxy(ApiClient, runtime);
 *
 * // Example usage in a React component with TanStack Query
 * const { data } = useQuery(api.hello.queryOptions({ query: { name: 'World' } }))
 *          ^? const data: string = "Hello, World!"
 *
 * const { mutate, data } = useMutation(api.bye.mutationOptions())
 *                  ^? const data: string = "Goodbye, World!"
 * mutate({ name: 'World' })
 *
 * useSubscription(api.stream.subscriptionOptions({
 *   onData: (data) => console.log(data),
 *             ^? const data: string = "Never gonna give you up, never gonna let you down..."
 * }))
 * ```
 */
export function createTanstackQueryOptionsProxy<TServiceTag, TService>(
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

          const program = Effect.fn(function* program(params: unknown) {
            // oxlint-disable-next-line typescript/no-explicit-any
            const api: any = yield* tag

            let fn = api
            for (const p of apiPath) fn = fn[p]

            return yield* fn(params)
          })

          /**
           * Executes the targeted Effect HTTP API endpoint by navigating the service instance.
           *
           * @param params - Parameters/payload passed into the target endpoint function.
           * @param signal - Optional `AbortSignal` for canceling request execution.
           * @returns A Promise resolving to the Effect result.
           */
          const execute = (params: unknown, signal?: AbortSignal) =>
            runtime.runPromise(
              program(params) as Effect.Effect<unknown, unknown, TServiceTag>,
              { signal }
            )

          /**
           * Constructs a consistent, structured array key for TanStack Query caching.
           *
           * @param queryType - The operation type (`'query'` or `'mutation' or 'subscription'`).
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
            } satisfies QueryOptions

          if (action === 'getQueryKey') return createKey('query', input)

          if (action === 'mutationOptions')
            return {
              ...options,
              mutationKey: createKey('mutation', input),
              mutationFn: (payload) => execute({ ...input, payload }),
            } satisfies MutationOptions

          if (action === 'subscriptionOptions')
            return {
              ...options,
              enabled: options?.enabled ?? true,
              subcriptionKey: createKey('subscription', input),
              subscriptionFn: ({ autoReconnect, keepAlive, ...events }) => {
                const { onStarted, onData, onError, onConnectionChange } =
                  events

                const schedulePolicy = Schedule.max([
                  Schedule.exponential(autoReconnect ?? 0),
                  Schedule.spaced('30 seconds'),
                  Schedule.recurs(3),
                ]).pipe(Schedule.jittered)

                const baseHandler = Effect.gen(function* handlerGen() {
                  onConnectionChange?.({ status: 'connecting' })
                  onStarted?.()

                  const response = yield* program({
                    ...input,
                    responseMode: 'response-only',
                  }) as Effect.Effect<HttpClientResponse>
                  onConnectionChange?.({ status: 'pending' })

                  const source = yield* response.stream.pipe(
                    Stream.decodeText,
                    Stream.splitLines,
                    Stream.filter((str) => str.length > 0),
                    Stream.share({ capacity: 'unbounded' })
                  )

                  const keepAliveStream = source.pipe(
                    Stream.filter((data) =>
                      data.startsWith(keepAlive?.message ?? ':keep-alive')
                    ),
                    Stream.timeout(keepAlive?.timeout ?? '10 seconds')
                  )

                  const dataStream = yield* source.pipe(
                    Stream.filter((line) => line.startsWith('data:')),
                    Stream.map((line) => line.slice(5).trim()),
                    Stream.filter((data) => data.length > 0),
                    Stream.mapEffect((data) =>
                      Effect.orElseSucceed(
                        Effect.try(() => JSON.parse(data)),
                        () => data
                      )
                    ),
                    Stream.tap((data) => Effect.sync(() => onData?.(data))),
                    Stream.share({ capacity: 'unbounded' })
                  )

                  const stream = Stream.merge(keepAliveStream, dataStream)
                  yield* Stream.runDrain(stream)

                  if (autoReconnect) yield* Effect.fail('restart')
                }).pipe(
                  Effect.tapError((cause) => {
                    const isRetryable =
                      cause === 'restart' ||
                      (typeof cause === 'object' &&
                        cause._tag === 'HttpClientError' &&
                        cause.reason?._tag === 'DecodeError')

                    if (isRetryable) return Effect.void
                    return Effect.sync(() => onError?.(cause))
                  })
                )

                const handlerWithReconnect = autoReconnect
                  ? baseHandler.pipe(Effect.retry(schedulePolicy))
                  : baseHandler

                const handlerWithInterrupt = handlerWithReconnect.pipe(
                  Effect.ensuring(
                    Effect.sync(() => onConnectionChange?.({ status: 'idle' }))
                  ),
                  Effect.scoped
                )

                const fiber = runtime.runFork(handlerWithInterrupt)
                return () => runtime.runPromise(Fiber.interrupt(fiber))
              },
            } satisfies SubscriptionOptions<unknown, unknown>
        },
      }
    )

    cache.set(cacheKey, proxy)
    return proxy
  }

  return createProxy([]) as TanstackQueryOptionsProxy<TService>
}
