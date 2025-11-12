import React from 'react'
import ReactDOM from 'react-dom/client'
import { SDKProvider } from '@tma.js/sdk-react'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SDKProvider>
      <App />
    </SDKProvider>
  </React.StrictMode>,
)
