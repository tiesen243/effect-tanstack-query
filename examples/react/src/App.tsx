import './App.css'

import { useQuery } from '@tanstack/react-query'

import { useSubscription } from '../../../dist/react.mjs'
import { api } from '../../client'

function App() {
  const { data } = useQuery(
    api.group.hello.queryOptions({
      params: {
        name: 'React Query',
      },
      query: {
        greeting: 'Hello',
      },
    })
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

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}

export default App
