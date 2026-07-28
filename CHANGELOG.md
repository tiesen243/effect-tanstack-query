## effect-tanstack-query@0.0.1

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
