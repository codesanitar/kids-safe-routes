import { useState } from 'react'
import { Point, Route, AvoidZone } from '../types'
import './ControlPanel.css'

interface ControlPanelProps {
  startPoint?: Point
  endPoint?: Point
  route?: Route
  avoidZones: AvoidZone[]
  isBuildingRoute: boolean
  error: string | null
  isAddingZone: boolean
  editingZoneId: string | null
  getUserLocation: () => Promise<Point | null>
  onSetStartPoint: (point: Point | undefined) => void
  onSetEndPoint: (point: Point | undefined) => void
  onBuildRoute: () => void
  onAddZone: () => void
  onRemoveZone: (zoneId: string) => void
  onUpdateZoneRadius: (zoneId: string, newRadius: number) => void
  onSetEditingZoneId: (zoneId: string | null) => void
  onSetIsAddingZone: (isAdding: boolean) => void
}

export default function ControlPanel({
  startPoint,
  endPoint,
  route,
  avoidZones,
  isBuildingRoute,
  error,
  isAddingZone,
  editingZoneId,
  getUserLocation,
  onSetStartPoint,
  onSetEndPoint,
  onBuildRoute,
  onAddZone,
  onRemoveZone,
  onUpdateZoneRadius,
  onSetEditingZoneId,
  onSetIsAddingZone,
}: ControlPanelProps) {
  const [isGettingLocation, setIsGettingLocation] = useState<'start' | 'end' | null>(null)

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

  const handleGetLocation = async (type: 'start' | 'end') => {
    setIsGettingLocation(type)
    try {
      const point = await getUserLocation()
      if (point) {
        if (type === 'start') {
          onSetStartPoint(point)
        } else {
          onSetEndPoint(point)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка получения геолокации'
      alert(errorMessage)
    } finally {
      setIsGettingLocation(null)
    }
  }

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3>Точки маршрута</h3>
        <div className="points-info">
          <div className="point-row">
            <span className="point-label">Точка A:</span>
            <span className="point-status">
              {startPoint ? '✅ Выбрана' : '👆 Нажмите на карте'}
            </span>
            <button
              className="location-btn"
              onClick={() => handleGetLocation('start')}
              disabled={isGettingLocation === 'start'}
              title="Использовать мою геолокацию"
            >
              📍
            </button>
          </div>
          <div className="point-row">
            <span className="point-label">Точка B:</span>
            <span className="point-status">
              {endPoint ? '✅ Выбрана' : '👆 Нажмите на карте'}
            </span>
            <button
              className="location-btn"
              onClick={() => handleGetLocation('end')}
              disabled={isGettingLocation === 'end'}
              title="Использовать мою геолокацию"
            >
              📍
            </button>
          </div>
        </div>
        <button
          className="build-route-btn"
          onClick={onBuildRoute}
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
              onClick={() => onSetIsAddingZone(false)}
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
                          onUpdateZoneRadius(zone.id, Number(e.target.value))
                        }
                        className="radius-slider"
                      />
                      <button
                        className="save-zone-btn"
                        onClick={() => onSetEditingZoneId(null)}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      className="edit-zone-btn"
                      onClick={() => onSetEditingZoneId(zone.id)}
                    >
                      ✎
                    </button>
                  )}
                </div>
                <button
                  className="remove-zone-btn"
                  onClick={() => onRemoveZone(zone.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <button
          className="add-zone-btn"
          onClick={onAddZone}
          disabled={isAddingZone}
        >
          {isAddingZone ? 'Выберите точку на карте' : 'Добавить зону'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  )
}
