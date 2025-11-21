import React from 'react'
import ReactDOM from 'react-dom/client'
import { SDKProvider } from '@tma.js/sdk-react'
import App from './App'
import './index.css'

// Проверяем, запущено ли приложение в Telegram WebView
const isTelegramWebView = () => {
  // Проверяем наличие объекта Telegram.WebApp (основной признак)
  const hasTelegramWebApp = typeof window !== 'undefined' && 
                             window.Telegram?.WebApp !== undefined &&
                             window.Telegram.WebApp !== null
  
  // Проверяем URL параметры Telegram
  const hasTelegramParams = typeof window !== 'undefined' &&
                            (window.location.search.includes('tgWebAppPlatform') ||
                             window.location.search.includes('tgWebAppStartParam') ||
                             window.location.search.includes('tgWebAppData'))
  
  // Проверяем User Agent
  const hasTelegramUA = typeof navigator !== 'undefined' && 
                        navigator.userAgent.includes('Telegram')
  
  // Если есть хотя бы один признак Telegram - считаем что мы в Telegram
  return hasTelegramWebApp || hasTelegramParams || hasTelegramUA
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
