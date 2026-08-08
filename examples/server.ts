import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as HttpRouter from 'effect/unstable/http/HttpRouter'
import * as HttpServer from 'effect/unstable/http/HttpServer'
import * as HttpServerResponse from 'effect/unstable/http/HttpServerResponse'
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder'

import { Api } from './contract'

const ApiGroupLive = HttpApiBuilder.group(Api, 'group', (handlers) =>
  handlers
    .handle('hello', ({ params, query }) =>
      Effect.succeed(`${query.greeting ?? 'Hello'}, ${params.name}!`)
    )
    .handle('goodbye', ({ payload }) =>
      Effect.succeed(`Goodbye, ${payload.name}!`)
    )
    .handle(
      'stream',
      Effect.fn(function* streamHandler() {
        yield* Effect.logInfo('Client connected')

        const keepAliveStream = Stream.repeat(
          Stream.succeed(`:keep-alive\n\n`),
          Schedule.spaced('10 seconds')
        )

        const dataStream = Stream.repeat(
          Stream.succeed(`data: ${new Date().toISOString()}\n\n`),
          Schedule.spaced('1 second')
        )

        const stream = Stream.merge(keepAliveStream, dataStream).pipe(
          Stream.encodeText
        )

        return HttpServerResponse.stream(stream, {
          contentType: 'text/event-stream',
          headers: {
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      })
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
