# effect-tanstack-query

A lightweight, type-safe bridge between **Effect HTTP API clients** and **TanStack Query** (`queryOptions`, `mutationOptions`, and `getQueryKey`).

## Features

- **Seamless Integration**: Effortlessly map Effect `HttpApiClient` endpoints to TanStack Query config objects.
- **End-to-End Type Safety**: Automatically infers inputs (`params`, `query`, `headers`, `payload`), success types, and error types directly from your Effect schemas.
- **Zero Boilerplate**: Generates `queryKey` and execution functions under the hood using ES6 Proxies.
- **Developer Friendly**: Smart optional parameters when no input arguments are required.

## Installation

Install using your preferred package manager:

```bash
# Using npm
npm install @tiesen/effect-tanstack-query

# Using yarn
yarn add @tiesen/effect-tanstack-query

# Using bun
bun add @tiesen/effect-tanstack-query

# Using pnpm
pnpm add @tiesen/effect-tanstack-query
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

### 3. Use `effect-tanstack-query` to Generate Query and Mutation Options

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
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
