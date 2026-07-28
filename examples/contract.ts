// oxlint-disable max-classes-per-file

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
        // oxlint-disable-next-line unicorn/max-nested-calls
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
