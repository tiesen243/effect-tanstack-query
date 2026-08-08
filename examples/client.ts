import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient'
import * as HttpApiClient from 'effect/unstable/httpapi/HttpApiClient'

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

api.group.hello.queryOptions({
  params: { name: 'World' },
  query: { greeting: 'Hello' },
})
