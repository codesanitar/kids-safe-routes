import React from 'react'
import ReactDOM from 'react-dom/client'
import { SDKProvider } from '@tma.js/sdk-react'
import App from './App'
import './index.css'

// Проверяем, запущено ли приложение в Telegram WebView
// Правильный способ согласно документации Telegram
const isTelegramWebView = () => {
  return typeof window !== 'undefined' && 
         window.Telegram && 
         window.Telegram.WebApp
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found!')
}

const root = ReactDOM.createRoot(rootElement)

if (isTelegramWebView()) {
  // Режим Telegram Mini App
  root.render(
    <React.StrictMode>
      <SDKProvider>
        <App />
      </SDKProvider>
    </React.StrictMode>
  )
} else {
  // Режим отладки вне Telegram
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
