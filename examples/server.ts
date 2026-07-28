import { Effect, Layer } from 'effect'
import { HttpRouter, HttpServer } from 'effect/unstable/http'
import { HttpApiBuilder } from 'effect/unstable/httpapi'

import { Api } from './contract'

const ApiGroupLive = HttpApiBuilder.group(Api, 'ApiGroup', (handlers) =>
  handlers
    .handle('hello', ({ params, query }) =>
      Effect.succeed(`${query.greeting ?? 'Hello'}, ${params.name}!`)
    )
    .handle('goodbye', ({ payload }) =>
      Effect.succeed(`Goodbye, ${payload.name}!`)
    )
)

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([ApiGroupLive]),
  Layer.provide(HttpRouter.cors()),
  Layer.provide(HttpServer.layerServices)
)

export default {
  fetch: HttpRouter.toWebHandler(ApiLive).handler,
}
