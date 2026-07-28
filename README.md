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
# Using bun
bun add effect-tanstack-query

# Using pnpm
pnpm add effect-tanstack-query

# Using npm
npm install effect-tanstack-query`
```

## Quick Start

### 1. Define your Effect HTTP API Contract

```ts
import { Schema } from 'effect'
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

class ApiGroup extends HttpApiGroup.make('ApiGroup')
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
  ) {}

export class Api extends HttpApi.make('Api').add(ApiGroup) {}
```

### 2. Create an Effect HTTP API Client

```ts
import { Context, Function, Layer } from 'effect'
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { HttpApiClient } from 'effect/unstable/httpapi'

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
            Function.flow(HttpClientRequest.prependUrl('http://localhost:3000'))
          )
        ),
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}
```

### 3. Use `effect-tanstack-query` to Generate Query and Mutation Options

```ts
import { ManagedRuntime } from 'effect'
import { createTanstackQueryOptionsProxy } from 'effect-tanstack-query'

const runtime = ManagedRuntime.make(ApiClient.live)
const api = createTanstackQueryOptionsProxy(ApiClient, runtime)
```

### Usage

```ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'

// Query Example
const query = useQuery(
  api.ApiGroup.hello.queryOptions({
    params: { name: 'John' },
    query: { greeting: 'Hi' },
  })
)

// Mutation Example
const mutation = useMutation(api.ApiGroup.goodbye.mutationOptions())
mutation.mutate({ name: 'John' })

// Invalidate Query Example
const queryClient = useQueryClient()
void queryClient.invalidateQueries({
  queryKey: api.ApiGroup.hello.getQueryKey(),
})
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
