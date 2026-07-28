// oxlint-disable typescript/no-empty-object-type typescript/ban-types

import type { MutationOptions, QueryOptions } from '@tanstack/query-core'
import type { Schema } from 'effect/Schema'
import type { Client } from 'effect/unstable/httpapi/HttpApiClient'
import type { HttpApiEndpoint } from 'effect/unstable/httpapi/HttpApiEndpoint'

export type TanstackQueryOptionsProxy<T> =
  T extends Client.Method<
    HttpApiEndpoint<
      infer _Key,
      infer Method,
      infer _Path,
      infer Params,
      infer Query,
      infer Payload,
      infer Headers,
      infer Success,
      infer Error
    >,
    infer _Error,
    infer _Requires
  >
    ? {
        queryOptions: Method extends 'GET'
          ? <TQuery = QueryOptions<UnwrapCodec<Success>, UnwrapCodec<Error>>>(
              input: MakeOptionalInput<
                ([Params] extends [never]
                  ? {}
                  : { params: UnwrapCodec<Params> }) &
                  ([Query] extends [never]
                    ? {}
                    : { query: UnwrapCodec<Query> }) &
                  ([Headers] extends [never]
                    ? {}
                    : { headers: UnwrapCodec<Headers> })
              >,
              options?: Omit<TQuery, 'queryKey' | 'queryFn'>
            ) => TQuery
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
                  ? {}
                  : { params: UnwrapCodec<Params> }) &
                  ([Headers] extends [never]
                    ? {}
                    : { headers: UnwrapCodec<Headers> })
              >,
              options?: Omit<TMutation, 'mutationKey' | 'mutationFn'>
            ) => TMutation

        getQueryKey: Method extends 'GET'
          ? (
              input?: Partial<
                MakeOptionalInput<
                  ([Params] extends [never]
                    ? {}
                    : { params: UnwrapCodec<Params> }) &
                    ([Query] extends [never]
                      ? {}
                      : { query: UnwrapCodec<Query> }) &
                    ([Headers] extends [never]
                      ? {}
                      : { headers: UnwrapCodec<Headers> })
                >
              >
            ) => readonly unknown[]
          : never
      }
    : T extends object
      ? {
          readonly [K in keyof T]: TanstackQueryOptionsProxy<T[K]>
        }
      : T

type UnwrapCodec<T> =
  T extends Schema<unknown>
    ? Schema.Type<T>
    : T extends object
      ? { [K in keyof T]: UnwrapCodec<T[K]> }
      : T

// oxlint-disable-next-line typescript/no-invalid-void-type
type MakeOptionalInput<T> = keyof T extends never ? void | undefined : T
