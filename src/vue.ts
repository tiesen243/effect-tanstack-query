/**
 * Based on code from tRPC (https://github.com/trpc/trpc)
 *
 * MIT License
 *
 * Copyright (c) 2023 Alex Johansson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { MaybeRefOrGetter } from 'vue'

import { hashKey } from '@tanstack/query-core'
import { reactive, watch, onUnmounted, toValue } from 'vue'

import type { SubscriptionOptions, UseSubscriptionReturns } from './types'

function useSubscription<TData, TError>(
  optsInput: MaybeRefOrGetter<SubscriptionOptions<TData, TError>>
): UseSubscriptionReturns<TData, TError> {
  type $Result = UseSubscriptionReturns<TData, TError>

  const state = reactive<$Result>({
    data: null,
    error: null,
    status: 'idle',
    reset: () => {
      // noop
    },
  }) as $Result

  let currentSubscription: (() => void) | null = null

  const cleanup = () => {
    if (currentSubscription) {
      currentSubscription()
      currentSubscription = null
    }
  }

  const reset = () => {
    cleanup()

    const opts = toValue(optsInput)

    if (!opts.enabled) {
      state.status = 'idle'
      state.data = null
      state.error = null
      return
    }

    state.status = 'connecting'
    state.data = null
    state.error = null

    const subscription = opts.subscriptionFn({
      autoReconnect: opts.autoReconnect,
      keepAlive: opts.keepAlive,

      onStarted: () => {
        const currentOpts = toValue(optsInput)
        currentOpts.onStarted?.()
        state.status = 'pending'
        state.error = null
      },
      onData: (data) => {
        const currentOpts = toValue(optsInput)
        currentOpts.onData?.(data)
        state.status = 'pending'
        state.data = data
        state.error = null
      },
      onError: (error) => {
        const currentOpts = toValue(optsInput)
        currentOpts.onError?.(error)
        state.status = 'error'
        state.error = error
      },
      onConnectionChange: (result) => {
        const currentOpts = toValue(optsInput)
        currentOpts.onConnectionChange?.(result)

        switch (result.status) {
          case 'connecting':
            state.status = 'connecting'
            state.error = result.error ?? null
            break
          case 'pending':
            break
          case 'idle':
            state.status = 'idle'
            state.data = null
            state.error = null
            break
          default:
            break
        }
      },
    })

    currentSubscription = () => subscription()
  }

  state.reset = reset

  watch(
    () => {
      const opts = toValue(optsInput)
      return {
        enabled: opts.enabled,
        key: opts.subcriptionKey ? hashKey(opts.subcriptionKey) : undefined,
      }
    },
    ({ enabled }) => {
      if (enabled) reset()
      else {
        cleanup()
        state.status = 'idle'
        state.data = null
        state.error = null
      }
    },
    { immediate: true }
  )

  onUnmounted(() => cleanup())

  return state
}

export type {
  SubscriptionOptions,
  UseSubscriptionReturns as SubscriptionReturns,
} from './types'
export { useSubscription }
