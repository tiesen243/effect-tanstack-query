import * as React from 'react'

import type { SubscriptionOptions, SubscriptionReturns } from './types'

function useSubscription<TData, TError>({
  enabled = true,
  ...subscriptionOptions
}: SubscriptionOptions<TData, TError> & {
  enabled?: boolean
}): SubscriptionReturns {
  const [status, setStatus] =
    React.useState<SubscriptionReturns['status']>('disconnected')
  const [reconnectCount, setReconnectCount] = React.useState(0)

  const reconnect = React.useCallback(() => {
    setReconnectCount((count) => count + 1)
  }, [])

  const keyHash = React.useMemo(
    () => JSON.stringify(subscriptionOptions.subcriptionKey),
    [subscriptionOptions.subcriptionKey]
  )

  React.useEffect(() => {
    if (!enabled) return setStatus('disconnected')

    setStatus('connecting')

    const controller = new AbortController()

    const unsubscribe = subscriptionOptions.subscriptionFn({
      signal: controller.signal,
    })

    setStatus('connected')

    return () => {
      controller.abort()
      unsubscribe()
      setStatus('disconnected')
    }
  }, [enabled, keyHash, reconnectCount])

  return React.useMemo(() => ({ status, reconnect }), [status, reconnect])
}

export type { SubscriptionOptions, SubscriptionReturns } from './types'
export { useSubscription }
