import type {
  MutationOptions,
  DefaultError,
  QueryKey,
  QueryObserverOptions,
} from '@tanstack/query-core'
import type { Input } from 'effect/Duration'
import type { Schema } from 'effect/Schema'
import type { Client } from 'effect/unstable/httpapi/HttpApiClient'
import type { HttpApiEndpoint } from 'effect/unstable/httpapi/HttpApiEndpoint'
import type {
  SseEventFromData,
  StreamSse,
} from 'effect/unstable/httpapi/HttpApiSchema'

export type TanstackQueryOptionsProxy<T> =
  T extends Client.Method<
    HttpApiEndpoint<
      infer _Identifier,
      infer Method,
      infer _Path,
      infer Params,
      infer Query,
      infer Payload,
      infer Headers,
      infer Success,
      infer Error,
      infer _Middleware,
      infer _MiddlewareService
    >,
    infer _Error,
    infer _Requires
  >
    ? {
        queryOptions: Method extends 'GET'
          ? <TQuery = QueryOptions<UnwrapCodec<Success>, UnwrapCodec<Error>>>(
              input: MakeOptionalInput<
                ([Params] extends [never]
                  ? unknown
                  : { params: UnwrapCodec<Params> }) &
                  ([Query] extends [never]
                    ? unknown
                    : { query: UnwrapCodec<Query> }) &
                  ([Headers] extends [never]
                    ? unknown
                    : { headers: UnwrapCodec<Headers> })
              >,
              options?: Omit<TQuery, 'queryKey' | 'queryFn'>
            ) => TQuery
          : never

        subscriptionOptions: Success extends StreamSse<
          SseEventFromData<infer StreamSuccess>,
          infer StreamError,
          infer _StreamValue
        >
          ? (
              input: MakeOptionalInput<
                ([Params] extends [never]
                  ? unknown
                  : { params: UnwrapCodec<Params> }) &
                  ([Query] extends [never]
                    ? unknown
                    : { query: UnwrapCodec<Query> }) &
                  ([Headers] extends [never]
                    ? unknown
                    : { headers: UnwrapCodec<Headers> })
              >,
              options?: Omit<
                SubscriptionOptions<
                  UnwrapCodec<StreamSuccess>,
                  UnwrapCodec<StreamError>
                >,
                'subcriptionKey' | 'subscriptionFn'
              >
            ) => SubscriptionOptions<
              UnwrapCodec<StreamSuccess>,
              UnwrapCodec<StreamError>
            >
          : never

        mutationOptions: Method extends 'GET'
          ? never
          : <
              TMutation = MutationOptions<
                UnwrapCodec<Success>,
                UnwrapCodec<Error>,
                UnwrapCodec<Payload>
              >,
            >(
              input: MakeOptionalInput<
                ([Params] extends [never]
                  ? unknown
                  : { params: UnwrapCodec<Params> }) &
                  ([Headers] extends [never]
                    ? unknown
                    : { headers: UnwrapCodec<Headers> })
              >,
              options?: Omit<TMutation, 'mutationKey' | 'mutationFn'>
            ) => TMutation

        getQueryKey: Method extends 'GET'
          ? (
              input?: Partial<
                MakeOptionalInput<
                  ([Params] extends [never]
                    ? unknown
                    : { params: UnwrapCodec<Params> }) &
                    ([Query] extends [never]
                      ? unknown
                      : { query: UnwrapCodec<Query> }) &
                    ([Headers] extends [never]
                      ? unknown
                      : { headers: UnwrapCodec<Headers> })
                >
              >
            ) => QueryKey
          : never
      }
    : T extends object
      ? {
          readonly [
            K in keyof T as K extends symbol ? never : K
          ]: TanstackQueryOptionsProxy<T[K]>
        }
      : T

export interface SubscriptionOptions<TData, TError> {
  /**
   * Determines whether the subscription is active. If set to `false`, the subscription will not be initiated.
   * Default is `true`.
   */
  enabled?: boolean

  /**
   * Configuration for the heartbeat keep-alive mechanism to prevent connection timeouts.
   *
   * @property{string} message The string payload sent by the server to maintain the connection. Default is `":keep-alive"`.
   * @property{Input} timeout The maximum duration to wait for a heartbeat or data payload before timing out and reconnecting. Default is `10 seconds`.
   */
  keepAlive?: { message?: string; timeout?: Input }

  /**
   * Defines the retry schedule or delay duration before attempting to reconnect when the stream disconnects or fails.
   * Accepts an `Effect.Duration.Input` (e.g., `"3 seconds"`, `3000`, or `Duration.seconds(3)`).
   */
  autoReconnect?: Input

  /**
   * A unique key that identifies the subscription. This key is used for caching and managing the subscription state.
   */
  subcriptionKey: readonly unknown[]

  /**
   * Initiates the subscription.
   *
   * @param options.signal An `AbortSignal` used to cancel the active subscription.
   * @param options.keepAliveTimeout Maximum duration to wait for data or server `:keep-alive` events before timing out. Default is 10 seconds.
   */
  subscriptionFn: (
    options: Omit<
      SubscriptionOptions<TData, TError>,
      'enabled' | 'subcriptionKey' | 'subscriptionFn'
    >
  ) => () => void

  /**
   * Callback invoked when the subscription is started.
   */
  onStarted?: () => void

  /**
   * Callback invoked when new data is received from the subscription.
   */
  onData?: (data: TData) => void

  /**
   * Callback invoked when an error occurs during the subscription.
   */
  onError?: (error: TError) => void

  /**
   * Callback invoked when the connection's status changes
   */
  onConnectionChange?: (
    result: Partial<UseSubscriptionReturns<TData, TError>>
  ) => void
}

export type QueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = QueryObserverOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryFnData,
  TQueryKey
> & {
  subscribed?: boolean
}

export type UseSubscriptionReturns<TData, TError> = {
  reset: () => void
} & (
  | { status: 'idle'; data: null; error: null }
  | { status: 'connecting'; data: TData | null; error: TError | null }
  | { status: 'pending'; data: TData | null; error: null }
  | { status: 'error'; data: TData | null; error: TError }
)

type UnwrapCodec<T> =
  T extends Schema<unknown>
    ? Schema.Type<T>
    : T extends object
      ? { [K in keyof T]: UnwrapCodec<T[K]> }
      : T

// oxlint-disable-next-line typescript/no-invalid-void-type
type MakeOptionalInput<T> = keyof T extends never ? void | undefined : T
