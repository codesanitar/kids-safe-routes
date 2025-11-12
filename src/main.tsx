import React from 'react'
import ReactDOM from 'react-dom/client'
import { SDKProvider } from '@tma.js/sdk-react'
import App from './App'
import './index.css'

// Проверяем, запущено ли приложение в Telegram WebView
const isTelegramWebView = () => {
  return window.Telegram?.WebApp !== undefined || 
         window.location.search.includes('tgWebAppPlatform') ||
         navigator.userAgent.includes('Telegram')
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

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
