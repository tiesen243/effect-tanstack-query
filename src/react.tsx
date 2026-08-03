import { hashKey } from '@tanstack/query-core'
import * as React from 'react'

import type { SubscriptionOptions, SubscriptionReturns } from './types'

function useSubscription<TData, TError>(
  opts: SubscriptionOptions<TData, TError>
): SubscriptionReturns<TData, TError> {
  type $Result = SubscriptionReturns<TData, TError>

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

export type { SubscriptionOptions, SubscriptionReturns } from './types'
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
