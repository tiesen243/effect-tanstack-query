// oxlint-disable max-classes-per-file

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
        // oxlint-disable-next-line unicorn/max-nested-calls
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
