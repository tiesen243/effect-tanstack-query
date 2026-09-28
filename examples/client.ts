import * as Context from 'effect/Context'
import * as HttpApiClient from 'effect/http-api/HttpApiClient'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import { createTanstackQueryOptionsProxy } from '../dist/index.mjs'
import { Api } from './contract'

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof Api>
>()('ApiClient') {
  public static live = Layer.effect(
    this,
    HttpApiClient.make(Api, {
      baseUrl: 'http://localhost:3000',
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}

const runtime = ManagedRuntime.make(ApiClient.live)
export const api = createTanstackQueryOptionsProxy(ApiClient, runtime)
