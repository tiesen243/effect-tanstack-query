import { Effect, Layer, Schedule, Stream } from 'effect'
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from 'effect/unstable/http'
import { HttpApiBuilder } from 'effect/unstable/httpapi'

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
          Schedule.spaced('5 second')
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
