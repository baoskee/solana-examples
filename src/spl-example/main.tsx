import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

import { Buffer } from 'buffer'
// @ts-expect-error polyfill
globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <React.StrictMode>
      <App />
  </React.StrictMode>
  </QueryClientProvider>
)
