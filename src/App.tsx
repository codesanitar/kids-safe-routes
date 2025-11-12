import { useEffect, useState } from 'react'
import MapComponent from './components/MapComponent'
import ControlPanel from './components/ControlPanel'
import './App.css'

function App() {
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    console.log('🚀 App компонент загружен')
    // Проверяем режим отладки
    const isTelegram = window.Telegram?.WebApp !== undefined || 
                       window.location.search.includes('tgWebAppPlatform') ||
                       navigator.userAgent.includes('Telegram')
    setIsDebugMode(!isTelegram)
    console.log('📱 Режим Telegram:', isTelegram)
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
      <div style={{ 
        position: 'absolute', 
        top: isDebugMode ? '40px' : '10px', 
        left: '10px', 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '5px 10px', 
        borderRadius: '4px',
        fontSize: '11px',
        zIndex: 10001
      }}>
        Карта: {mapReady ? '✅' : '⏳'} | Панель: ✅
      </div>
      <MapComponent onMapReady={() => setMapReady(true)} />
      <ControlPanel />
    </div>
  )
}

export default App

