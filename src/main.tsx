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

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found!')
}

console.log('🎬 Инициализация приложения...')
const root = ReactDOM.createRoot(rootElement)

if (isTelegramWebView()) {
  console.log('📱 Запуск в режиме Telegram Mini App')
  // Режим Telegram Mini App
  root.render(
    <React.StrictMode>
      <SDKProvider>
        <App />
      </SDKProvider>
    </React.StrictMode>
  )
} else {
  console.log('🌐 Запуск в режиме отладки (вне Telegram)')
  // Режим отладки вне Telegram
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
