# effect-tanstack-query

<p align="center">
  <a href="https://npmx.dev/package/@tiesen/effect-tanstack-query"><img src="https://img.shields.io/npm/dw/%40tiesen%2Feffect-tanstack-query" alt="Total Downloads"></a>
  <a href="https://npmx.dev/package/@tiesen/effect-tanstack-query"><img src="https://img.shields.io/npm/v/%40tiesen%2Feffect-tanstack-query" alt="Latest Stable Version"></a>
  <a href="https://npmx.dev/package/@tiesen/effect-tanstack-query"><img src="https://img.shields.io/npm/l/%40tiesen%2Feffect-tanstack-query" alt="License"></a>
</p>

Effortlessly bridge **Effect HTTP API clients** with **TanStack Query**. Enjoy end-to-end type safety, zero-boilerplate options (`queryOptions`, `mutationOptions`, `subscriptionOptions`), and built-in streaming support out of the box.

## Features

- **Seamless Integration**: Effortlessly map Effect `HttpApiClient` endpoints to TanStack Query config objects.
- **End-to-End Type Safety**: Automatically infers inputs (`params`, `query`, `payload`), response types, and error types directly from your Effect schemas.
- **Event Streaming Support**: Native handling for live streams and Server-Sent Events (SSE) via `subscriptionOptions` and `useSubscription`.
- **Zero Boilerplate**: Generates `queryKey`, and execution logic under the hood using ES6 Proxies.
- **Smart Developer Experience**: Auto-manages Fiber lifecycles and abort signals, with smart optional parameters when no inputs are required.

## Installation

Install using your preferred package manager:

```bash
# Using npm
npm install @tiesen/effect-tanstack-query @tanstack/react-query effect@beta

# Using yarn
yarn add @tiesen/effect-tanstack-query @tanstack/react-query effect@beta

# Using bun
bun add @tiesen/effect-tanstack-query @tanstack/react-query effect@beta

# Using pnpm
pnpm add @tiesen/effect-tanstack-query @tanstack/react-query effect@beta
```

## Quick Start

### 1. Define your Effect HTTP API Contract

```ts
import { Schema } from 'effect'
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'

class ApiGroup extends HttpApiGroup.make('group')
  .add(
    HttpApiEndpoint.get('hello', '/hello/:name', {
      success: Schema.String,
      params: Schema.Struct({
        name: Schema.String,
      }),
      query: Schema.Struct({
        greeting: Schema.String.pipe(Schema.optionalKey),
      }),
    })
  )
  .add(
    HttpApiEndpoint.post('goodbye', '/goodbye', {
      success: Schema.String,
      payload: Schema.Struct({
        name: Schema.String,
      }),
    })
  )
  .add(
    HttpApiEndpoint.get('stream', '/stream', {
      success: HttpApiSchema.StreamSse({
        data: Schema.String,
      }),
    })
  ) {}

export class Api extends HttpApi.make('Api').add(ApiGroup) {}
```

### 2. Create an Effect HTTP API Client

```ts
import { Context, Layer } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import { HttpApiClient } from 'effect/unstable/httpapi'

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof Api>
>()('ApiClient') {
  public static layer = Layer.effect(
    this,
    HttpApiClient.make(Api, {
      baseUrl: 'http://localhost:3000',
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}
```

### 3. Create a TanStack Query Options Proxy

```ts
import { ManagedRuntime } from 'effect'
import { createTanstackQueryOptionsProxy } from '@tiesen/effect-tanstack-query'

const runtime = ManagedRuntime.make(ApiClient.layer)
const api = createTanstackQueryOptionsProxy(ApiClient, runtime)
```

### Usage

```ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useSubscription } from '@tiesen/effect-tanstack-query/react'

// Query Example
const query = useQuery(
  api.group.hello.queryOptions({
    params: { name: 'John' },
    query: { greeting: 'Hi' },
  })
)

// Mutation Example
const mutation = useMutation(api.group.goodbye.mutationOptions())
mutation.mutate({ name: 'John' })

// Stream Example
useSubscription(
  api.group.stream.subscriptionOptions(undefined, {
    onData: (data) => console.log('Received data:', data),
  })
)

// Invalidate Query Example
const queryClient = useQueryClient()
void queryClient.invalidateQueries({
  queryKey: api.group.hello.getQueryKey(),
})

// Call Query / Mutate Directly Example
const result = await api.group.hello.query({
  params: { name: 'John' },
  query: { greeting: 'Hi' },
})
const result2 = await api.group.goodbye.mutate({ payload: { name: 'John' } })
```

## Downloads

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://npmx.dev/api/embed/downloads.svg?packages=%40tiesen%2Feffect-tanstack-query&metric=downloads&startDate=2025-08-01&endDate=2026-07-30&mode=dark&granularity=weekly&locale=en-US&accent=oklch%2867.3%25+0+0%29&yLabel=Weekly+Downloads">
  <source media="(prefers-color-scheme: light)" srcset="https://npmx.dev/api/embed/downloads.svg?packages=%40tiesen%2Feffect-tanstack-query&metric=downloads&startDate=2025-08-01&endDate=2026-07-30&mode=light&granularity=weekly&locale=en-US&accent=oklch%2867.3%25+0+0%29&yLabel=Weekly+Downloads">
  <img alt="npmx downloads" src="https://npmx.dev/api/embed/downloads.svg?packages=%40tiesen%2Feffect-tanstack-query&metric=downloads&startDate=2025-08-01&endDate=2026-07-30&mode=light&granularity=weekly&locale=en-US&accent=oklch%2867.3%25+0+0%29&yLabel=Weekly+Downloads">
</picture>

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
