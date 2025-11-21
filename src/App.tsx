import { useEffect, useState } from 'react'
import MapComponent from './components/MapComponent'
import ControlPanel from './components/ControlPanel'
import { Point, Route, AvoidZone } from './types'
import { generateCirclePolygon } from './utils/geometry'
import { buildRoute } from './services/ors'
import { authenticate, isAuthenticated } from './services/auth'
import './App.css'

function App() {
  const [isDebugMode, setIsDebugMode] = useState(false) // По умолчанию режим отладки выключен
  const [mapReady, setMapReady] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | undefined>()
  const [endPoint, setEndPoint] = useState<Point | undefined>()
  const [route, setRoute] = useState<Route | undefined>()
  const [avoidZones, setAvoidZones] = useState<AvoidZone[]>([])
  const [isBuildingRoute, setIsBuildingRoute] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddingZone, setIsAddingZone] = useState(false)
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Проверяем наличие initData динамически
  useEffect(() => {
    const checkInitData = () => {
      const hasInitData = typeof window !== 'undefined' && 
                          window.Telegram?.WebApp?.initData !== undefined &&
                          window.Telegram.WebApp.initData !== null &&
                          window.Telegram.WebApp.initData !== ''
      
      setIsDebugMode(!hasInitData)
    }

    // Проверяем сразу
    checkInitData()
    
    // Проверяем несколько раз с задержками, так как initData может загружаться асинхронно
    const timeout1 = setTimeout(checkInitData, 100)
    const timeout2 = setTimeout(checkInitData, 500)
    const timeout3 = setTimeout(checkInitData, 1000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [])

  // Авторизация при загрузке приложения (выполняется один раз)
  useEffect(() => {
    let isMounted = true

    const performAuth = async () => {
      // Проверяем наличие initData прямо здесь - это главный признак что мы в миниаппе
      const hasInitData = typeof window !== 'undefined' && 
                          window.Telegram?.WebApp?.initData !== undefined &&
                          window.Telegram.WebApp.initData !== null &&
                          window.Telegram.WebApp.initData !== ''

      if (!isMounted) return

      console.log('🚀 Начало авторизации:', {
        hasInitData,
        windowTelegram: !!window.Telegram,
        webApp: !!window.Telegram?.WebApp,
        initData: !!window.Telegram?.WebApp?.initData,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН',
        authSecretKey: import.meta.env.VITE_AUTH_SECRET_KEY ? 'установлен' : 'НЕ УСТАНОВЛЕН'
      })

      setIsAuthenticating(true)
      setAuthError(null)

      // Если нет initData - пропускаем авторизацию (режим отладки)
      if (!hasInitData) {
        console.log('⏭️ Пропуск авторизации: нет initData (режим отладки)')
        if (isMounted) {
          setIsAuthenticating(false)
        }
        return
      }

      // Получаем initData из window.Telegram.WebApp
      const initDataString = window.Telegram!.WebApp!.initData!

      console.log('📋 InitData найден:', {
        length: initDataString.length,
        preview: initDataString.substring(0, 50) + '...'
      })

      try {
        console.log('✅ Вызываем authenticate()')
        await authenticate(initDataString)
        console.log('✅ Авторизация успешна')
      } catch (err) {
        console.error('❌ Ошибка авторизации:', err)
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка авторизации'
          setAuthError(errorMessage)
        }
      } finally {
        if (isMounted) {
          setIsAuthenticating(false)
        }
      }
    }

    // Небольшая задержка чтобы дать время initData загрузиться
    const timeout = setTimeout(performAuth, 100)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [])

  // Получение геолокации пользователя
  const getUserLocation = async (): Promise<Point | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается вашим браузером'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          let errorMessage = 'Не удалось получить геолокацию'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Геолокация недоступна. Проверьте настройки.'
              break
            case error.TIMEOUT:
              errorMessage = 'Превышено время ожидания геолокации.'
              break
            default:
              errorMessage = `Ошибка получения геолокации: ${error.message}`
          }
          reject(new Error(errorMessage))
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 60000, // Использовать кэшированную позицию до 1 минуты
        }
      )
    })
  }

  const handleMapClick = (point: Point) => {
    if (isAddingZone) {
      // Режим добавления зоны
      const newZone: AvoidZone = {
        id: Date.now().toString(),
        center: point,
        radius: 200, // по умолчанию 200 метров
        polygon: generateCirclePolygon(point, 200),
      }
      setAvoidZones([...avoidZones, newZone])
      setIsAddingZone(false)
      return
    }

    // Режим выбора точек маршрута: сначала старт, потом финиш
    if (!startPoint) {
      setStartPoint(point)
    } else if (!endPoint) {
      setEndPoint(point)
    } else {
      // Сбрасываем и начинаем заново
      setStartPoint(point)
      setEndPoint(undefined)
      setRoute(undefined)
    }
  }

  const handleBuildRoute = async () => {
    if (!startPoint || !endPoint) {
      setError('Выберите точки маршрута')
      return
    }

    setIsBuildingRoute(true)
    setError(null)

    try {
      const newRoute = await buildRoute({
        start: startPoint,
        end: endPoint,
        avoidZones,
      })
      setRoute(newRoute)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка построения маршрута')
      setRoute(undefined)
    } finally {
      setIsBuildingRoute(false)
    }
  }

  const handleAddZone = () => {
    setIsAddingZone(true)
    setError(null)
  }

  const handleRemoveZone = (zoneId: string) => {
    setAvoidZones(avoidZones.filter((z) => z.id !== zoneId))
    if (editingZoneId === zoneId) {
      setEditingZoneId(null)
    }
  }

  const handleUpdateZoneRadius = (zoneId: string, newRadius: number) => {
    const zone = avoidZones.find((z) => z.id === zoneId)
    if (!zone) return

    const updatedZone: AvoidZone = {
      ...zone,
      radius: newRadius,
      polygon: generateCirclePolygon(zone.center, newRadius),
    }

    setAvoidZones(avoidZones.map((z) => (z.id === zoneId ? updatedZone : z)))
  }

  // Если идет авторизация, показываем индикатор загрузки
  if (isAuthenticating) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '24px' }}>⏳</div>
        <div>Авторизация...</div>
      </div>
    )
  }

  // Если авторизация не удалась (и не режим отладки), показываем ошибку
  if (authError && !isDebugMode) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Не удалось авторизоваться в сервисе</div>
        <div style={{ fontSize: '14px', color: '#666' }}>{authError}</div>
      </div>
    )
  }

  // Если не авторизован (и не режим отладки), показываем ошибку
  if (!isAuthenticated() && !isDebugMode) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Не удалось авторизоваться в сервисе</div>
      </div>
    )
  }

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
      {isDebugMode && (
        <div style={{ 
          position: 'absolute', 
          top: '40px', 
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
      )}
      <MapComponent
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        avoidZones={avoidZones}
        onMapClick={handleMapClick}
        onMapReady={() => setMapReady(true)}
      />
      <ControlPanel
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        avoidZones={avoidZones}
        isBuildingRoute={isBuildingRoute}
        error={error}
        isAddingZone={isAddingZone}
        editingZoneId={editingZoneId}
        getUserLocation={getUserLocation}
        onSetStartPoint={setStartPoint}
        onSetEndPoint={setEndPoint}
        onBuildRoute={handleBuildRoute}
        onAddZone={handleAddZone}
        onRemoveZone={handleRemoveZone}
        onUpdateZoneRadius={handleUpdateZoneRadius}
        onSetEditingZoneId={setEditingZoneId}
        onSetIsAddingZone={setIsAddingZone}
      />
    </div>
  )
}

export default App
