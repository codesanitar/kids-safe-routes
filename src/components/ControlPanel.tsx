import { useState, useEffect } from 'react'
import { Point, Route, AvoidZone, RouteMode } from '../types'
import { generateCirclePolygon } from '../utils/geometry'
import { buildRoute } from '../services/ors'
import MapComponent from './MapComponent'
import './ControlPanel.css'

export default function ControlPanel() {
  const [mode, setMode] = useState<RouteMode>('from-me')
  const [startPoint, setStartPoint] = useState<Point | undefined>()
  const [endPoint, setEndPoint] = useState<Point | undefined>()
  const [route, setRoute] = useState<Route | undefined>()
  const [avoidZones, setAvoidZones] = useState<AvoidZone[]>([])
  const [isBuildingRoute, setIsBuildingRoute] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddingZone, setIsAddingZone] = useState(false)
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)

  // Получение геолокации пользователя
  const getUserLocation = async (): Promise<Point | null> => {
    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject)
        })
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
      }
    } catch (err) {
      console.error('Ошибка получения геолокации:', err)
    }
    return null
  }

  // Инициализация стартовой точки при режиме "от меня"
  useEffect(() => {
    if (mode === 'from-me' && !startPoint) {
      getUserLocation().then((point) => {
        if (point) {
          setStartPoint(point)
        }
      })
    }
  }, [mode])

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

    // Обычный режим выбора точек маршрута
    if (mode === 'from-me') {
      setEndPoint(point)
    } else {
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

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`
    }
    return `${(meters / 1000).toFixed(1)} км`
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) {
      return `${minutes} мин`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours} ч ${mins} мин`
  }

  return (
    <div className="control-panel-wrapper">
      <MapComponent
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        avoidZones={avoidZones}
        onMapClick={handleMapClick}
      />
      <div className="control-panel">
        <div className="panel-section">
          <h3>Режим маршрута</h3>
          <div className="mode-buttons">
            <button
              className={mode === 'from-me' ? 'active' : ''}
              onClick={() => {
                setMode('from-me')
                setStartPoint(undefined)
                setEndPoint(undefined)
                setRoute(undefined)
                setIsAddingZone(false)
              }}
            >
              От меня
            </button>
            <button
              className={mode === 'a-to-b' ? 'active' : ''}
              onClick={() => {
                setMode('a-to-b')
                setStartPoint(undefined)
                setEndPoint(undefined)
                setRoute(undefined)
                setIsAddingZone(false)
              }}
            >
              От A до B
            </button>
          </div>
        </div>

        <div className="panel-section">
          <h3>Точки маршрута</h3>
          <div className="points-info">
            {mode === 'from-me' ? (
              <div>
                <p>
                  Старт: {startPoint ? '📍 Ваше местоположение' : '⏳ Загрузка...'}
                </p>
                <p>
                  Конец: {endPoint ? '✅ Выбрана' : '👆 Нажмите на карте'}
                </p>
              </div>
            ) : (
              <div>
                <p>
                  Точка A: {startPoint ? '✅ Выбрана' : '👆 Нажмите на карте'}
                </p>
                <p>
                  Точка B: {endPoint ? '✅ Выбрана' : '👆 Нажмите на карте'}
                </p>
              </div>
            )}
          </div>
          <button
            className="build-route-btn"
            onClick={handleBuildRoute}
            disabled={!startPoint || !endPoint || isBuildingRoute}
          >
            {isBuildingRoute ? 'Построение...' : 'Построить маршрут'}
          </button>
        </div>

        {route && (
          <div className="panel-section">
            <h3>Маршрут</h3>
            <div className="route-info">
              <p>Расстояние: {formatDistance(route.distance)}</p>
              <p>Время: {formatDuration(route.duration)}</p>
            </div>
          </div>
        )}

        <div className="panel-section">
          <h3>Запретные зоны</h3>
          {isAddingZone && (
            <div className="adding-zone-hint">
              👆 Нажмите на карте, чтобы добавить зону
              <button
                className="cancel-btn"
                onClick={() => setIsAddingZone(false)}
              >
                Отмена
              </button>
            </div>
          )}
          <div className="zones-list">
            {avoidZones.length === 0 ? (
              <p className="no-zones">Нет зон</p>
            ) : (
              avoidZones.map((zone) => (
                <div key={zone.id} className="zone-item">
                  <div className="zone-info">
                    <span>Радиус: {zone.radius} м</span>
                    {editingZoneId === zone.id ? (
                      <div className="zone-edit">
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          value={zone.radius}
                          onChange={(e) =>
                            handleUpdateZoneRadius(zone.id, Number(e.target.value))
                          }
                          className="radius-slider"
                        />
                        <button
                          className="save-zone-btn"
                          onClick={() => setEditingZoneId(null)}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        className="edit-zone-btn"
                        onClick={() => setEditingZoneId(zone.id)}
                      >
                        ✎
                      </button>
                    )}
                  </div>
                  <button
                    className="remove-zone-btn"
                    onClick={() => handleRemoveZone(zone.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            className="add-zone-btn"
            onClick={handleAddZone}
            disabled={isAddingZone}
          >
            {isAddingZone ? 'Выберите точку на карте' : 'Добавить зону'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}

