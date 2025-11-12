import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Point, Route, AvoidZone } from '../types'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapComponent.css'

interface MapComponentProps {
  startPoint?: Point
  endPoint?: Point
  route?: Route
  avoidZones?: AvoidZone[]
  onMapClick?: (point: Point) => void
  onMapReady?: () => void
}

export default function MapComponent({
  startPoint,
  endPoint,
  route,
  avoidZones = [],
  onMapClick,
  onMapReady,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const routeFitBoundsDone = useRef(false) // Флаг, чтобы fitBounds выполнялся только один раз
  const onMapClickRef = useRef(onMapClick)
  const onMapReadyRef = useRef(onMapReady)

  // Обновляем refs при изменении колбэков, но не пересоздаем карту
  useEffect(() => {
    onMapClickRef.current = onMapClick
    onMapReadyRef.current = onMapReady
  }, [onMapClick, onMapReady])

  useEffect(() => {
    if (!mapContainer.current || map.current) return
    
    try {
      // Используем OSM тайлы - они работают корректно с MapLibre GL
      // Яндекс тайлы имеют проблемы с системой координат (смещение по Y)
      const mapStyle = {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      }

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [37.6173, 55.7558], // Москва по умолчанию
        zoom: 13,
      })

      map.current.on('load', () => {
        setMapLoaded(true)
        onMapReadyRef.current?.()
      })

      map.current.on('error', (e) => {
        console.error('Ошибка карты:', e)
      })

      map.current.on('sourcedata', (e) => {
        if (e.isSourceLoaded && !mapLoaded) {
          setMapLoaded(true)
          onMapReadyRef.current?.()
        }
      })

      map.current.on('data', (e) => {
        if (e.dataType === 'source' && e.isSourceLoaded && !mapLoaded) {
          setMapLoaded(true)
          onMapReadyRef.current?.()
        }
      })

      // Используем ref для колбэка, чтобы не пересоздавать карту
      map.current.on('click', (e) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
          })
        }
      })

      // Fallback: если через 3 секунды load не сработал, считаем карту готовой
      const timeoutId = setTimeout(() => {
        if (!mapLoaded && map.current) {
          setMapLoaded(true)
          onMapReadyRef.current?.()
        }
      }, 3000)

      return () => {
        clearTimeout(timeoutId)
        map.current?.remove()
        map.current = null
        setMapLoaded(false)
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации карты:', error)
    }
  }, []) // Убрали зависимости, чтобы карта не пересоздавалась

  // Обновление маркеров точек
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Удаляем старые маркеры
    const markers = document.querySelectorAll('.map-marker')
    markers.forEach((m) => m.remove())

    if (startPoint) {
      const el = document.createElement('div')
      el.className = 'map-marker start-marker'
      el.innerHTML = '🏁'
      el.style.cssText = 'font-size: 32px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));'
      new maplibregl.Marker(el)
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(map.current)
    }

    if (endPoint) {
      const el = document.createElement('div')
      el.className = 'map-marker end-marker'
      el.innerHTML = '🎯'
      el.style.cssText = 'font-size: 32px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));'
      new maplibregl.Marker(el)
        .setLngLat([endPoint.lng, endPoint.lat])
        .addTo(map.current)
    }
  }, [mapLoaded, startPoint, endPoint])

  // Обновление маршрута
  useEffect(() => {
    if (!map.current || !mapLoaded || !route) {
      routeFitBoundsDone.current = false // Сбрасываем флаг, если маршрута нет
      return
    }

    const sourceId = 'route-source'
    const layerId = 'route-layer'

    // Функция для добавления маршрута
    const addRoute = () => {
      // Удаляем старый маршрут
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId)
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId)
      }

      if (!map.current) return

      // Добавляем новый маршрут
      const coordinates = route.geometry.map((p) => [p.lng, p.lat])

      try {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        })

        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#4285f4',
            'line-width': 4,
          },
        })
      } catch (err) {
        // Если стиль еще не загружен, ждем события styledata
        console.warn('Стиль карты еще не готов, ждем...', err)
        const handler = () => {
          if (map.current) {
            addRoute()
            map.current.off('styledata', handler)
          }
        }
        map.current.once('styledata', handler)
        return
      }
    }

    // Вызываем функцию добавления маршрута
    addRoute()

    // Подгоняем карту под маршрут только один раз при первом построении
    if (!routeFitBoundsDone.current) {
      const coordinates = route.geometry.map((p) => [p.lng, p.lat])
      const bounds = new maplibregl.LngLatBounds()
      coordinates.forEach((coord) => bounds.extend(coord as [number, number]))
      
      // Добавляем точки старта и финиша в bounds, если они есть
      if (startPoint) {
        bounds.extend([startPoint.lng, startPoint.lat])
      }
      if (endPoint) {
        bounds.extend([endPoint.lng, endPoint.lat])
      }
      
      map.current.fitBounds(bounds, { 
        padding: { top: 100, bottom: 200, left: 50, right: 50 },
        duration: 800, // Плавная анимация
        maxZoom: 16 // Не увеличиваем слишком сильно
      })
      
      routeFitBoundsDone.current = true
    }
  }, [mapLoaded, route])

  // Обновление запретных зон
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Получаем список ID текущих зон
    const currentZoneIds = new Set(avoidZones.map((z) => z.id))

    // Сначала удаляем все слои зон, которых больше нет в списке
    const allLayers = map.current.getStyle().layers || []
    allLayers.forEach((layer) => {
      if (layer.id && layer.id.startsWith('zone-layer-')) {
        const zoneId = layer.id.replace('zone-layer-', '').replace('-outline', '')
        // Удаляем слой, если зоны больше нет в списке
        if (!currentZoneIds.has(zoneId)) {
          try {
            if (map.current?.getLayer(layer.id)) {
              map.current.removeLayer(layer.id)
            }
          } catch (err) {
            // Игнорируем ошибки удаления несуществующих слоев
          }
        }
      }
    })

    // Затем удаляем источники зон, которых больше нет в списке
    const allSources = Object.keys(map.current.getStyle().sources || {})
    allSources.forEach((sourceId) => {
      if (sourceId.startsWith('zone-source-')) {
        const zoneId = sourceId.replace('zone-source-', '')
        // Удаляем источник, если зоны больше нет в списке
        if (!currentZoneIds.has(zoneId)) {
          try {
            if (map.current?.getSource(sourceId)) {
              map.current.removeSource(sourceId)
            }
          } catch (err) {
            // Игнорируем ошибки удаления несуществующих источников
          }
        }
      }
    })

    // Добавляем новые зоны
    avoidZones.forEach((zone) => {
      const sourceId = `zone-source-${zone.id}`
      const layerId = `zone-layer-${zone.id}`

      const coordinates = zone.polygon.map((p) => [p.lng, p.lat])
      coordinates.push(coordinates[0]) // Замыкаем полигон

      try {
        // Проверяем, что источник не существует перед добавлением
        if (!map.current?.getSource(sourceId)) {
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates],
              },
            },
          })
        } else {
          // Обновляем данные существующего источника
          const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource
          if (source && 'setData' in source) {
            source.setData({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates],
              },
            })
          }
        }

        // Добавляем слои только если их нет
        if (!map.current?.getLayer(layerId)) {
          map.current.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#ff0000',
              'fill-opacity': 0.3,
            },
          })
        }

        if (!map.current?.getLayer(`${layerId}-outline`)) {
          map.current.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#ff0000',
              'line-width': 2,
            },
          })
        }
      } catch (err) {
        console.error(`Ошибка добавления зоны ${zone.id}:`, err)
      }
    })
  }, [mapLoaded, avoidZones])

  return (
    <div ref={mapContainer} className="map-container" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#e0e0e0',
      position: 'relative'
    }}>
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '14px',
          zIndex: 1000
        }}>
          Загрузка карты...
        </div>
      )}
    </div>
  )
}

