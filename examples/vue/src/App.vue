<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'

import { useSubscription } from '../../../dist/vue.mjs'
import { api } from '../../client'

const { data } = useQuery(
  api.group.hello.queryOptions({
    params: {
      name: 'Vue Query',
    },
    query: {
      greeting: 'Hello',
    },
  }) as never
)

useSubscription(
  api.group.stream.subscriptionOptions(undefined, {
    onData: (_data) => {
      console.log('subscription data', _data)
    },
    onError: (_error) => {
      console.error('subscription error', _error)
    },
  })
)
</script>

<template>
  <pre>{{ data }}</pre>
</template>
