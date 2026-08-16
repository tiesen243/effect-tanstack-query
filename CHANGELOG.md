## @tiesen/effect-tanstack-query@0.0.19

### Add direct `query` and `mutate` support

- Added the `query` method to allow executing `GET` endpoints directly.
- Added the `mutate` method to support executing `non-GET` mutation endpoints directly.

## @tiesen/effect-tanstack-query@0.0.18

### Fix type error

## @tiesen/effect-tanstack-query@0.0.17

### Enhance SSE data streaming:

- Automatically attempt to parse incoming `data:` payloads as JSON.
- Gracefully fall back to raw string content if JSON parsing fails.

## @tiesen/effect-tanstack-query@0.0.16

### Fix mutation payload error

- add missing required fields to mutation payload

## @tiesen/effect-tanstack-query@0.0.15

### Vue 3 Support

- Added Vue 3 support for `useSubscription`.
- Automatically handles reactivity and subscription lifecycles using Vue Composition API.

## @tiesen/effect-tanstack-query@0.0.14

### Updates & Improvements

- **Refactored `useSubscription`**: Updated the subscription hook to utilize `subscriptionOptions`, providing better type inference, unified option configuration, and seamless integration with TanStack Query primitives.

## @tiesen/effect-tanstack-query@0.0.13

### Fix TS4023: Unnamable internal Effect symbols error

- Omit `NodeInspectSymbol` and internal Effect symbols from `TanstackQueryOptionsProxy` mapped types to prevent downstream build errors (`TS4023`).
- Export `NodeInspectSymbol` as an internal type utility to support declaration (`.d.ts`) generation in consumer projects.

## @tiesen/effect-tanstack-query@0.0.12

### Fix TS4023 error

## @tiesen/effect-tanstack-query@0.0.11

### Fix type inference for routes configured with middleware

- Corrected function parameter signature count and optional request handling when an endpoint includes middleware (e.g., `AuthMiddleware`).
- Resolved TypeScript compilation errors where routes requiring middleware failed to infer parameter options properly.

## @tiesen/effect-tanstack-query@0.0.10

### Make react optional peerDependency

Made `react` an optional peer dependency for `@tiesen/effect-tanstack-query`.

## @tiesen/effect-tanstack-query@0.0.9

### Refactor & Improvements

- **Shared Stream Processing**: Implemented `Stream.share({ capacity: 'unbounded' })` to split the SSE stream into two parallel branches (`keepAliveStream` and `dataStream`) without re-subscribing to or re-consuming the HTTP body.
- **Keep-Alive Timeout Handling**: Added an automatic disconnection and reconnection mechanism using `Stream.timeout(keepAliveTimeout)` if no `:keep-alive` ping is received from the server within the specified window.
- **Robust Reconnection Loop**: Encapsulated the stream execution within an `Effect.gen` runner that explicitly yields `Effect.fail('restart')` upon completion, triggering automatic **retries** with exponential backoff (`Schedule.exponential('3 seconds')`).
- **Graceful Error Catching**: Explicitly handled `HttpClientError`, ignoring harmless `DecodeError` exceptions while properly delegating other HTTP errors to the `onError` callback.
- **Enhanced Abort Signal Lifecycle**: Improved integration with `AbortSignal` to guarantee clean fiber cancellation (`Fiber.interrupt`) whenever a subscription is unsubscribed or aborted.

## @tiesen/effect-tanstack-query@0.0.8

### Documentation Updates

- Updated package description and README features to highlight first-class event streaming support (`subscriptionOptions` and `useSubscription`).
- Added code examples and usage guidelines for stream subscriptions.

## @tiesen/effect-tanstack-query@0.0.7

### Features

- **stream**: Add support for event streaming / subscriptions via `subscriptionOptions`.
- **hooks**: Introduce `useSubscription` hook to easily bind Effect-backed event streams directly to React components.
- Auto-handles `AbortSignal` listeners and fiber interruption on unsubscribe.

## @tiesen/effect-tanstack-query@0.0.6

### Update project metadata

- add `bugs` tracker url
- add `author` url

## @tiesen/effect-tanstack-query@0.0.5

### Fix publish

## @tiesen/effect-tanstack-query@0.0.4

### Fix dependency

- using `@tanstack/react-query` instead of `@tanstack/query-core`

## @tiesen/effect-tanstack-query@0.0.3

### fix publish

## @tiesen/effect-tanstack-query@0.0.2

### Fix exports

Fix the `exports` field in `package.json` to correctly expose package entry points and improve module resolution.

## @tiesen/effect-tanstack-query@0.0.1

### Initial Release

First official release of `effect-tanstack-query` — a type-safe bridge between **Effect HTTP API clients** and **TanStack Query**.

### Features

- **TanStack Query Options Proxy**: Automatically generate `queryOptions`, `mutationOptions`, and `getQueryKey` from Effect `HttpApiClient` endpoints using ES6 Proxies.
- **End-to-End Type Safety**:
  - Full type inference for `params`, `query`, `headers`, and `payload` schema inputs.
  - Automatic resolution of `Success` and `Error` response types.
  - Unwrap Effect `Schema` types seamlessly for TanStack Query options.
- **Smart Arguments**: Supports optional input parameters when an endpoint requires no request parameters/payload.
- **Effect Runtime Execution**: Seamlessly executes Effect pipelines as Promises backed by `ManagedRuntime` and supports request cancellation via `AbortSignal`.
