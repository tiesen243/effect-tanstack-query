import { Context, Function, Layer, ManagedRuntime } from 'effect'
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { HttpApiClient } from 'effect/unstable/httpapi'

import { createTanstackQueryOptionsProxy } from '../dist/index.mjs'
import { Api } from './contract'

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof Api>
>()('ApiClient') {
  public static live = Layer.effect(
    this,
    HttpApiClient.make(Api, {
      transformClient: (client) =>
        client.pipe(
          HttpClient.mapRequest(
            // oxlint-disable-next-line unicorn/max-nested-calls
            Function.flow(HttpClientRequest.prependUrl('http://localhost:3000'))
          )
        ),
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}

const runtime = ManagedRuntime.make(ApiClient.live)
export const api = createTanstackQueryOptionsProxy(ApiClient, runtime)
