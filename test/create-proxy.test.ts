import { expect, test } from 'bun:test'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as HttpApi from 'effect/http-api/HttpApi'
import * as HttpApiClient from 'effect/http-api/HttpApiClient'
import * as HttpApiEndpoint from 'effect/http-api/HttpApiEndpoint'
import * as HttpApiGroup from 'effect/http-api/HttpApiGroup'
import * as HttpApiSchema from 'effect/http-api/HttpApiSchema'
import * as HttpClient from 'effect/http/HttpClient'
import * as HttpClientResponse from 'effect/http/HttpClientResponse'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Schema from 'effect/Schema'

import { createTanstackQueryOptionsProxy } from '../src/index'

const Api = HttpApi.make('SseTest').add(
  HttpApiGroup.make('events').add(
    HttpApiEndpoint.get('values', '/values', {
      success: HttpApiSchema.StreamSse({ data: Schema.Unknown }),
    })
  )
)

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof Api>
>()('SseTestClient') {}

test.each([
  {
    name: 'single-line JSON events',
    text: 'data: {"value":42}\n\ndata: {"value":43}\n\n',
    fragmented: false,
    expected: [{ value: 42 }, { value: 43 }],
  },
  {
    name: 'multiline JSON event',
    text: 'data: {\ndata: "value":42\ndata: }\n\n',
    fragmented: false,
    expected: [{ value: 42 }],
  },
  {
    name: 'fragmented UTF-8, fields, CRLF and event boundaries',
    text: 'data: {\r\ndata: "value":"café"\r\ndata: }\r\n\r\ndata: 43\r\n\r\n',
    fragmented: true,
    expected: [{ value: 'café' }, 43],
  },
  {
    name: 'raw strings, retry directives and comments',
    text: ':keep-alive\nretry: 1000\n\ndata: hello\ndata: world\n\n:comment\nretry: 2000\ndata: {"value":42}\n\n',
    fragmented: false,
    expected: ['hello\nworld', { value: 42 }],
  },
])('$name', async ({ text, fragmented, expected }) => {
  let cancelled = false
  const bytes = new TextEncoder().encode(`${text}data: "complete"\n\n`)
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (fragmented)
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      else controller.enqueue(bytes)
    },
    cancel() {
      cancelled = true
    },
  })
  const transport = HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(body, { headers: { 'content-type': 'text/event-stream' } })
      )
    )
  )
  const client = HttpApiClient.makeWith(Api, {
    httpClient: transport,
    baseUrl: 'https://in-memory.invalid',
  })
  const runtime = ManagedRuntime.make(Layer.effect(ApiClient, client))
  try {
    const proxy = createTanstackQueryOptionsProxy(ApiClient, runtime)
    const options = proxy.events.values.subscriptionOptions()
    const data: unknown[] = []
    const errors: unknown[] = []
    const done = Promise.withResolvers<string>()
    const stop = options.subscriptionFn({
      onData: (value) => {
        if (value === 'complete') done.resolve(value)
        else data.push(value)
      },
      onError: (error) => {
        errors.push(error)
        done.reject(error)
      },
    })
    const timer = setTimeout(
      () => done.reject(new Error('Subscription did not deliver all events')),
      2000
    )
    try {
      await done.promise
    } finally {
      clearTimeout(timer)
      await stop()
    }
    expect(errors).toEqual([])
    expect(cancelled).toBe(true)
    expect(data).toEqual([...expected])
  } finally {
    await runtime.dispose()
  }
})
