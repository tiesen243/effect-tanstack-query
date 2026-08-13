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

import { hashKey } from '@tanstack/query-core'
import * as React from 'react'

import type { SubscriptionOptions, UseSubscriptionReturns } from './types'

function useSubscription<TData, TError>(
  opts: SubscriptionOptions<TData, TError>
): UseSubscriptionReturns<TData, TError> {
  type $Result = UseSubscriptionReturns<TData, TError>

  const optsRef = React.useRef(opts)
  optsRef.current = opts

  const trackedProps = React.useRef(new Set<keyof $Result>())

  const addTrackedProp = React.useCallback((key: keyof $Result) => {
    trackedProps.current.add(key)
  }, [])

  const currentSubscriptionRef = React.useRef<() => void>(() => {
    // noop
  })

  const reset = React.useCallback(() => {
    currentSubscriptionRef.current()

    updateState(getInitialState)
    if (!opts.enabled) return

    const subscription = opts.subscriptionFn({
      autoReconnect: optsRef.current.autoReconnect,
      keepAlive: optsRef.current.keepAlive,

      onStarted: () => {
        optsRef.current.onStarted?.()
        updateState((p) => ({ ...p, status: 'pending', error: null }))
      },
      onData: (data) => {
        optsRef.current.onData?.(data)
        updateState((p) => ({ ...p, status: 'pending', data, error: null }))
      },
      onError: (error) => {
        optsRef.current.onError?.(error)
        updateState((p) => ({ ...p, status: 'error', error }))
      },
      onConnectionChange: (result) => {
        optsRef.current.onConnectionChange?.(result)
        updateState((p) => {
          switch (result.status) {
            case 'connecting':
              return { ...p, status: 'connecting', error: result.error ?? null }
            case 'pending':
              return p
            case 'idle':
              return { ...p, status: 'idle', data: null, error: null }
            default:
              return p
          }
        })
      },
    })

    currentSubscriptionRef.current = () => subscription()
  }, [hashKey(opts.subcriptionKey), opts.enabled])

  const getInitialState = React.useCallback(
    (): $Result =>
      opts.enabled
        ? { data: null, error: null, status: 'connecting', reset }
        : { data: null, error: null, status: 'idle', reset },
    [opts.enabled, reset]
  )

  const resultRef = React.useRef<$Result>(getInitialState())
  const [state, setState] = React.useState<$Result>(
    trackResult(resultRef, addTrackedProp)
  )

  state.reset = reset

  const updateState = React.useCallback(
    (callbackFn: (prev: $Result) => $Result) => {
      const prev = resultRef.current
      const next = (resultRef.current = callbackFn(prev))

      let shouldUpdate = false
      for (const key of trackedProps.current)
        if (prev[key] !== next[key]) {
          shouldUpdate = true
          break
        }

      if (shouldUpdate) setState(trackResult(resultRef, addTrackedProp))
    },
    [addTrackedProp]
  )

  React.useEffect(() => {
    if (!opts.enabled) return

    reset()

    return () => currentSubscriptionRef.current()
  }, [hashKey(opts.subcriptionKey), opts.enabled])

  return state
}

export type {
  SubscriptionOptions,
  UseSubscriptionReturns as SubscriptionReturns,
} from './types'
export { useSubscription }

function trackResult<T extends object>(
  result: React.RefObject<T>,
  onTrackResult: (key: keyof T) => void
): T {
  const trackedResult = new Proxy(result.current, {
    get(_target, prop) {
      onTrackResult(prop as keyof T)
      // Bypass target, so that we always get the latest value
      return result.current[prop as keyof T]
    },
  })

  return trackedResult
}
