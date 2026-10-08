# @tiesen/effect-tanstack-query

<p align="center">
  <a href="https://npmx.dev/package/@tiesen/effect-tanstack-query">
    <img src="https://img.shields.io/npm/v/%40tiesen%2Feffect-tanstack-query" alt="npm version">
  </a>
  <a href="https://npmx.dev/package/@tiesen/effect-tanstack-query">
    <img src="https://img.shields.io/npm/dw/%40tiesen%2Feffect-tanstack-query" alt="npm downloads">
  </a>
  <a href="https://github.com/tiesen243/effect-tanstack-query/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/%40tiesen%2Feffect-tanstack-query" alt="license">
  </a>
</p>

A type-safe bridge between **Effect HTTP API clients** and **TanStack Query**.

`@tiesen/effect-tanstack-query` turns an `Effect` `HttpApiClient` into a typed proxy that exposes TanStack Query options, direct request helpers, query-key generation, and Server-Sent Events (SSE) subscriptions without duplicating endpoint definitions.

The package is intentionally thin: your Effect HTTP API contract remains the source of truth for request inputs, response types, and errors.

## Features

- **End-to-end type safety** — infer `params`, `query`, `headers`, `payload`, success values, and error values directly from Effect schemas.
- **Zero-boilerplate TanStack Query options** — generate `queryOptions`, `mutationOptions`, and stable `getQueryKey` values from your API client.
- **Direct Effect-backed requests** — call `query` or `mutate` directly when you do not need TanStack Query.
- **Effect-native execution** — use `queryEffect` and `mutateEffect` when you want to compose the request back into an Effect program.
- **SSE subscriptions** — create typed `subscriptionOptions` for `StreamSse` endpoints with keep-alive handling, JSON decoding, reconnection, and cleanup.
- **React support** — use the `useSubscription` hook from `@tiesen/effect-tanstack-query/react`.
- **Vue support** — use the `useSubscription` hook from `@tiesen/effect-tanstack-query/vue`.
- **Schema-aware inputs** — Effect `Schema` types are unwrapped into the corresponding TypeScript input/output types.
- **Abort and fiber lifecycle management** — query requests receive TanStack Query's `AbortSignal`, while subscriptions are cleaned up through Effect fiber interruption.
- **Stable query keys** — endpoint paths, operation types, and request inputs are combined into deterministic TanStack Query keys.

## Requirements

The package declares these peer dependencies:

- `effect >= 4.0.0`
- `@tanstack/react-query >= 5.104.0` or `@tanstack/vue-query >= 5.104.0` (for React or Vue integration)

The React and Vue integrations are optional:

- React: `react >= 19.0.0`
- Vue: `vue >= 3.5.43`

When using the React hook with TanStack Query, install `@tanstack/react-query` as well. When using TanStack Query in Vue, install the TanStack Vue integration that matches your application.

## Installation

Install the core package together with Effect and TanStack Query:

```bash
npm install @tiesen/effect-tanstack-query effect
```

```bash
pnpm add @tiesen/effect-tanstack-query effect
```

```bash
yarn add @tiesen/effect-tanstack-query effect
```

```bash
bun add @tiesen/effect-tanstack-query effect
```

For React applications using TanStack Query hooks:

```bash
npm install @tanstack/react-query
```

For Vue applications using the subscription hook:

```bash
npm install @tanstack/vue-query
```

## Quick Start

### 1. Define an Effect HTTP API

Your API contract defines the request and response types once. The proxy uses the same definition to infer all TanStack Query helpers.

```ts
import * as HttpApi from 'effect/http-api/HttpApi'
import * as HttpApiEndpoint from 'effect/http-api/HttpApiEndpoint'
import * as HttpApiGroup from 'effect/http-api/HttpApiGroup'
import * as HttpApiSchema from 'effect/http-api/HttpApiSchema'
import * as Schema from 'effect/Schema'

class ApiGroup extends HttpApiGroup.make('group')
  .add(
    HttpApiEndpoint.get('hello', '/hello/:name', {
      params: Schema.Struct({
        name: Schema.String,
      }),
      query: Schema.Struct({
        greeting: Schema.String.pipe(Schema.optionalKey),
      }),
      success: Schema.String,
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

### 2. Create your Effect HTTP API client

Create an Effect service for the generated client and provide it to a `ManagedRuntime`.

```ts
import * as Context from 'effect/Context'
import * as HttpApiClient from 'effect/http-api/HttpApiClient'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import { Api } from './contract'

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof Api>
>()('ApiClient') {
  static live = Layer.effect(
    this,
    HttpApiClient.make(Api, {
      baseUrl: 'http://localhost:3000',
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
}

export const runtime = ManagedRuntime.make(ApiClient.live)
```

### 3. Create the TanStack Query proxy

```ts
import { createTanstackQueryOptionsProxy } from '@tiesen/effect-tanstack-query'

export const api = createTanstackQueryOptionsProxy(ApiClient, runtime)
```

The resulting `api` object mirrors your Effect client structure.

For an API shaped like:

```text
Api
└── group
    ├── hello
    ├── goodbye
    └── stream
```

the proxy exposes:

```text
api.group.hello.queryOptions(...)
api.group.hello.query(...)
api.group.hello.getQueryKey(...)
api.group.goodbye.mutationOptions(...)
api.group.goodbye.mutate(...)
api.group.stream.subscriptionOptions(...)
```

## Query Options

For `GET` endpoints, the proxy generates `queryOptions`.

```ts
import { useQuery } from '@tanstack/react-query'

const query = useQuery(
  api.group.hello.queryOptions({
    params: {
      name: 'John',
    },
    query: {
      greeting: 'Hi',
    },
  })
)
```

The returned options contain:

- a deterministic `queryKey`;
- a `queryFn` that executes the Effect HTTP client;
- all options passed to `queryOptions`, except `queryKey` and `queryFn`.

You can therefore use normal TanStack Query options:

```ts
useQuery(
  api.group.hello.queryOptions(
    {
      params: { name: 'John' },
      query: { greeting: 'Hi' },
    },
    {
      staleTime: 60_000,
      retry: 2,
    }
  )
)
```

Request cancellation is connected to TanStack Query's `AbortSignal`, so a cancelled query interrupts the underlying Effect execution.

### Query keys

Use `getQueryKey` whenever you need to invalidate or update the cache.

```ts
const queryClient = useQueryClient()

void queryClient.invalidateQueries({
  queryKey: api.group.hello.getQueryKey(),
})
```

You can also include the same request input used by the query:

```ts
const queryKey = api.group.hello.getQueryKey({
  params: {
    name: 'John',
  },
  query: {
    greeting: 'Hi',
  },
})
```

The key is built from the operation type, the endpoint path, and the supplied input.

## Direct Queries

Every `GET` endpoint also exposes a `query` method.

```ts
const result = await api.group.hello.query({
  params: {
    name: 'John',
  },
  query: {
    greeting: 'Hi',
  },
})
```

`query` executes the Effect request through the supplied `ManagedRuntime` and returns a promise for the decoded success value.

It is useful for:

- server-side application logic;
- event handlers that do not need a query cache;
- one-off requests;
- integration code outside React or Vue.

## Mutations

Non-`GET` endpoints expose `mutationOptions`.

```ts
import { useMutation } from '@tanstack/react-query'

const mutation = useMutation(api.group.goodbye.mutationOptions())

mutation.mutate({
  name: 'John',
})
```

The request input is split between endpoint parameters/headers and the mutation payload.

For example, an endpoint with `params`, `headers`, and a `payload` can be configured like this:

```ts
const mutation = useMutation(
  api.group.updateUser.mutationOptions({
    params: {
      id: 'user_123',
    },
    headers: {
      authorization: 'Bearer token',
    },
  })
)

mutation.mutate({
  name: 'John',
})
```

The generated `mutationFn` merges the static endpoint input with the payload passed to `mutate`.

You can still pass normal TanStack Mutation options:

```ts
useMutation(
  api.group.goodbye.mutationOptions(undefined, {
    retry: 1,
    onSuccess: () => {
      // invalidate related queries
    },
  })
)
```

## Direct Mutations

Non-`GET` endpoints also expose a `mutate` method for direct execution.

Unlike `mutationOptions`, the direct method receives the complete endpoint input, including the payload.

```ts
const result = await api.group.goodbye.mutate({
  payload: {
    name: 'John',
  },
})
```

If the endpoint also has parameters or headers:

```ts
await api.group.updateUser.mutate({
  params: {
    id: 'user_123',
  },
  headers: {
    authorization: 'Bearer token',
  },
  payload: {
    name: 'John',
  },
})
```

## Effect Execution

The proxy also exposes `queryEffect` and `mutateEffect` so endpoint execution can remain inside the Effect ecosystem.

```ts
const program = api.group.hello.queryEffect({
  params: {
    name: 'John',
  },
})
```

For this mode, the supplied `ManagedRuntime` must provide a `cachedContext`. The generated Effect is then evaluated against that cached context instead of immediately becoming a Promise.

This is useful when a request needs to be composed with other Effect programs:

```ts
const program = Effect.gen(function* () {
  const greeting = yield* api.group.hello.queryEffect({
    params: {
      name: 'John',
    },
  })

  yield* Effect.logInfo(greeting)

  return greeting
})
```

## SSE Subscriptions

Endpoints whose success type is `HttpApiSchema.StreamSse(...)` expose `subscriptionOptions`.

```ts
const options = api.group.stream.subscriptionOptions(undefined, {
  onData: (data) => {
    console.log('Received:', data)
  },
})
```

The generated subscription handles:

- opening the HTTP stream;
- decoding the response body as text;
- splitting the stream into lines;
- filtering `data:` events;
- parsing JSON data when possible;
- keeping raw string data when JSON parsing fails;
- processing server keep-alive events;
- reconnecting when configured;
- interrupting the Effect fiber when unsubscribed.

### React

Import `useSubscription` from the React entry point:

```ts
import { useSubscription } from '@tiesen/effect-tanstack-query/react'

function LiveData() {
  const subscription = useSubscription(
    api.group.stream.subscriptionOptions(undefined, {
      onData: (data) => {
        console.log(data)
      },
    })
  )

  if (subscription.status === 'connecting') {
    return <div>Connecting...</div>
  }

  if (subscription.status === 'error') {
    return <div>Connection failed.</div>
  }

  return <pre>{JSON.stringify(subscription.data, null, 2)}</pre>
}
```

The returned state is:

```ts
type SubscriptionReturns<TData, TError> =
  | {
      status: 'idle'
      data: null
      error: null
      reset: () => void
    }
  | {
      status: 'connecting'
      data: TData | null
      error: TError | null
      reset: () => void
    }
  | {
      status: 'pending'
      data: TData | null
      error: null
      reset: () => void
    }
  | {
      status: 'error'
      data: TData | null
      error: TError
      reset: () => void
    }
```

### Vue

The Vue entry point accepts a plain value, ref, or getter:

```ts
import { useSubscription } from '@tiesen/effect-tanstack-query/vue'

const subscription = useSubscription(() =>
  api.group.stream.subscriptionOptions(undefined, {
    onData: (data) => {
      console.log(data)
    },
  })
)
```

The returned object is reactive and has the same `status`, `data`, `error`, and `reset` shape as the React hook.

## Subscription Configuration

`subscriptionOptions` accepts an options object in addition to the endpoint input.

### `enabled`

Disable the subscription without changing the generated endpoint:

```ts
api.group.stream.subscriptionOptions(undefined, {
  enabled: false,
})
```

When disabled, the subscription remains in the `idle` state.

### Keep-alive

The default keep-alive message is `:keep-alive`, with a timeout of 10 seconds.

```ts
api.group.stream.subscriptionOptions(undefined, {
  keepAlive: {
    message: ':keep-alive',
    timeout: '10 seconds',
  },
})
```

The timeout controls how long the client waits for a keep-alive or data event before the stream is considered inactive.

### Automatic reconnect

Set `autoReconnect` to enable retry scheduling:

```ts
api.group.stream.subscriptionOptions(undefined, {
  autoReconnect: '3 seconds',
})
```

The reconnect strategy uses an exponential schedule, a 30-second spacing limit, three retry attempts, and jitter. The supplied duration controls the exponential backoff base.

### Connection lifecycle

You can observe connection transitions:

```ts
api.group.stream.subscriptionOptions(undefined, {
  onStarted: () => {
    console.log('subscription started')
  },
  onConnectionChange: ({ status }) => {
    console.log('connection status:', status)
  },
  onData: (data) => {
    console.log('data:', data)
  },
  onError: (error) => {
    console.error(error)
  },
})
```

## Input Inference

The proxy derives request types directly from the endpoint's Effect schemas.

If your endpoint defines:

```ts
HttpApiEndpoint.get('hello', '/hello/:name', {
  headers: Schema.Struct({
    authorization: Schema.String,
  }),
  params: Schema.Struct({
    name: Schema.String,
  }),
  query: Schema.Struct({
    greeting: Schema.String.pipe(Schema.optionalKey),
  }),
  success: Schema.String,
})
```

the generated helper expects the corresponding shape:

```ts
api.group.hello.queryOptions({
  headers: {
    authorization: 'Bearer token',
  },
  params: {
    name: 'John',
  },
  query: {
    greeting: 'Hello',
  },
})
```

Effect `Schema` values are unwrapped for TypeScript consumers, so you work with the schema's input/output types rather than Effect schema objects at the call site.

When an endpoint does not require request input, the generated helper accepts no argument:

```ts
api.group.health.queryOptions()
```

## Proxy Architecture

`createTanstackQueryOptionsProxy` mirrors the structure of the Effect service through a JavaScript `Proxy`.

Given:

```ts
Api
└── group
    ├── hello
    └── goodbye
```

the proxy resolves property access lazily:

```ts
api.group.hello.queryOptions(...)
api.group.goodbye.mutationOptions(...)
```

The implementation caches generated proxies by their property path, so repeatedly accessing the same endpoint does not create a new proxy object.

## API References

### `createTanstackQueryOptionsProxy`

```ts
function createTanstackQueryOptionsProxy<TServiceTag, TService>(
  tag: Service<TServiceTag, TService>,
  runtime: ManagedRuntime<TServiceTag, never>
): TanstackQueryOptionsProxy<TService>
```

Creates a typed proxy over an Effect service that implements `HttpApiClient.ForApi<...>`.

The `tag` identifies the client service in the Effect context. The `runtime` executes the generated requests and supplies the service implementation.

### `TanstackQueryOptionsProxy`

The proxy exposes endpoint-specific helpers based on the HTTP method.

For `GET` endpoints:

```ts
query(input?)
queryEffect(input?)
queryOptions(input?, options?)
subscriptionOptions(input?, options?) // StreamSse endpoints
getQueryKey(input?)
```

For non-`GET` endpoints:

```ts
mutate(input)
mutateEffect(input)
mutationOptions(input?, options?)
```

Helpers that do not apply to an endpoint are removed from the generated type, which keeps autocomplete focused on valid operations.

### `SubscriptionOptions`

```ts
interface SubscriptionOptions<TData, TError> {
  enabled?: boolean
  keepAlive?: {
    message?: string
    timeout?: DurationInput
  }
  autoReconnect?: DurationInput
  subcriptionKey: readonly unknown[]
  subscriptionFn: (
    options: Omit<
      SubscriptionOptions<TData, TError>,
      'enabled' | 'subcriptionKey' | 'subscriptionFn'
    >
  ) => () => void
  onStarted?: () => void
  onData?: (data: TData) => void
  onError?: (error: TError) => void
  onConnectionChange?: (
    result: Partial<SubscriptionReturns<TData, TError>>
  ) => void
}
```

> `subcriptionKey` is intentionally generated internally by the proxy. You normally do not provide it yourself; the generated `subscriptionOptions` includes the key required by the subscription hook.

### `QueryOptions`

`QueryOptions` is based on TanStack Query's `QueryObserverOptions` and additionally supports:

```ts
subscribed?: boolean
```

This lets generated query options retain the standard TanStack Query configuration surface.

## Cancellation and Cleanup

For normal queries, TanStack Query's `AbortSignal` is forwarded to the Effect runtime:

```text
TanStack Query
     │
     │ AbortSignal
     ▼
Effect request
     │
     ▼
HTTP client
```

Cancelling a query therefore interrupts the corresponding Effect execution.

Subscriptions use the same lifecycle principle. When a React component unmounts, a Vue subscription is disposed, or the subscription is reset, the active Effect fiber is interrupted and the network stream is cleaned up.

## Server-Side Usage

The core proxy does not require React or Vue. You can use `createTanstackQueryOptionsProxy` from server-side code, route handlers, jobs, or other Effect-driven application code.

```ts
const result = await api.group.hello.query({
  params: {
    name: 'John',
  },
})
```

Keep the React-specific `useSubscription` import isolated to client code:

```ts
import { useSubscription } from '@tiesen/effect-tanstack-query/react'
```

This is why React and Vue are optional peer dependencies of the core package.

## Exports

The package exposes three entry points:

```text
@tiesen/effect-tanstack-query
@tiesen/effect-tanstack-query/react
@tiesen/effect-tanstack-query/vue
```

### Core

The root entry point exports:

```ts
export { createTanstackQueryOptionsProxy }

export type { TanstackQueryOptionsProxy, SubscriptionOptions }
```

### React

The React entry point exports:

```ts
export { useSubscription }

export type { SubscriptionOptions, SubscriptionReturns }
```

### Vue

The Vue entry point exports the same subscription API:

```ts
export { useSubscription }

export type { SubscriptionOptions, SubscriptionReturns }
```

## Recommended Project Structure

For a multi-application project, we recommend a monorepo that keeps the API contract independent from the API implementation and its consumers.

```text
apps/
├── api/
├── web/
└── mobile/

packages/
└── contract/
```

### `packages/contract`

Contains the shared API contract used by both the API server and client applications.

```text
packages/
└── contract/
    ├── src/
    └── package.json
```

The contract package should contain the Effect HTTP API definitions, schemas, request types, response types, and errors. It should not contain server implementation or UI-specific code.

### `apps/api`

Contains the actual API implementation.

```text
apps/
└── api/
    ├── src/
    └── package.json
```

The API imports the shared contract and provides the implementation for each endpoint.

```ts
import { Api } from '@repo/contract'
```

### `apps/web`

Contains the web application. It can use the shared contract with React or Vue and create the TanStack Query client from it.

```text
apps/
└── web/
    ├── src/
    └── package.json
```

```ts
import { Api } from '@repo/contract'
```

The web application owns its UI, routing, and framework-specific code while sharing the API contract with the server.

### `apps/mobile`

Contains the React Native application and consumes the same API contract as the web application.

```text
apps/
└── mobile/
    ├── src/
    └── package.json
```

```ts
import { Api } from '@repo/contract'
```

This allows web and mobile clients to share the same API definitions while keeping their platform-specific UI and application logic independent.

### Dependency Flow

Keep the dependency direction simple:

```text
packages/contract
       │
       ├──────────────► apps/api
       │
       ├──────────────► apps/web
       │
       └──────────────► apps/mobile
```

The `contract` package should not depend on any application under `apps/`. This keeps the API definition reusable across the server, web client, and mobile client without coupling the shared contract to a specific runtime or UI framework.

## License

This project is open source and available under the [MIT](./LICENSE) License.
