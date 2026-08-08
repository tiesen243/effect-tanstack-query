// oxlint-disable max-classes-per-file

import * as Schema from 'effect/Schema'
import * as HttpApi from 'effect/unstable/httpapi/HttpApi'
import * as HttpApiEndpoint from 'effect/unstable/httpapi/HttpApiEndpoint'
import * as HttpApiGroup from 'effect/unstable/httpapi/HttpApiGroup'
import * as HttpApiSchema from 'effect/unstable/httpapi/HttpApiSchema'

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
