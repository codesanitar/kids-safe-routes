import { useEffect, useState } from 'react'
import MapComponent from './components/MapComponent'
import ControlPanel from './components/ControlPanel'
import './App.css'

function App() {
  const [isDebugMode, setIsDebugMode] = useState(false)

  useEffect(() => {
    // Проверяем режим отладки
    const isTelegram = window.Telegram?.WebApp !== undefined || 
                       window.location.search.includes('tgWebAppPlatform') ||
                       navigator.userAgent.includes('Telegram')
    setIsDebugMode(!isTelegram)
  }, [])

  return (
    <div className="app">
      {isDebugMode && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: '#ff9800',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontSize: '12px',
          zIndex: 10000,
          fontWeight: 'bold'
        }}>
          🐛 РЕЖИМ ОТЛАДКИ (вне Telegram)
        </div>
      )}
      <MapComponent />
      <ControlPanel />
    </div>
  )
}

export default App

