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

  useEffect(() => {
    if (!mapContainer.current || map.current) {
      console.log('⏭️ Пропуск инициализации:', {
        hasContainer: !!mapContainer.current,
        hasMap: !!map.current
      })
      return
    }

    console.log('🗺️ Инициализация карты...', {
      containerSize: {
        width: mapContainer.current.offsetWidth,
        height: mapContainer.current.offsetHeight
      }
    })
    
    try {
      const mapStyle = {
        version: 8,
        sources: {
          'yandex-tiles': {
            type: 'raster',
            tiles: [
              'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://yandex.ru/maps/">Яндекс.Карты</a>',
          },
        },
        layers: [
          {
            id: 'yandex-tiles-layer',
            type: 'raster',
            source: 'yandex-tiles',
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

      console.log('📦 MapLibre объект создан')

      map.current.on('load', () => {
        console.log('✅ Карта загружена успешно')
        setMapLoaded(true)
        onMapReady?.()
      })

      map.current.on('error', (e) => {
        console.error('❌ Ошибка карты:', e)
      })

      map.current.on('styledata', () => {
        console.log('📊 Стиль карты загружен')
      })

      map.current.on('sourcedata', (e) => {
        console.log('📡 Данные источника:', e.sourceId, e.isSourceLoaded ? 'загружены' : 'загрузка...')
        if (e.isSourceLoaded && !mapLoaded) {
          console.log('✅ Источник загружен, помечаем карту как готовую')
          setMapLoaded(true)
          onMapReady?.()
        }
      })

      map.current.on('data', (e) => {
        if (e.dataType === 'source' && e.isSourceLoaded) {
          console.log('🗺️ Источник данных загружен:', e.sourceId)
          if (!mapLoaded) {
            setMapLoaded(true)
            onMapReady?.()
          }
        }
      })

      if (onMapClick) {
        map.current.on('click', (e) => {
          console.log('🖱️ Клик по карте:', e.lngLat)
          onMapClick({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
          })
        })
      }

      // Fallback: если через 3 секунды load не сработал, считаем карту готовой
      setTimeout(() => {
        if (!mapLoaded && map.current) {
          console.log('⏰ Таймаут: считаем карту готовой')
          setMapLoaded(true)
          onMapReady?.()
        }
      }, 3000)

      return () => {
        console.log('🧹 Очистка карты')
        map.current?.remove()
        map.current = null
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации карты:', error)
    }
  }, [onMapClick, onMapReady])

  // Обновление маркеров точек
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Удаляем старые маркеры
    const markers = document.querySelectorAll('.map-marker')
    markers.forEach((m) => m.remove())

    if (startPoint) {
      const el = document.createElement('div')
      el.className = 'map-marker start-marker'
      el.innerHTML = 'A'
      new maplibregl.Marker(el)
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(map.current)
    }

    if (endPoint) {
      const el = document.createElement('div')
      el.className = 'map-marker end-marker'
      el.innerHTML = 'B'
      new maplibregl.Marker(el)
        .setLngLat([endPoint.lng, endPoint.lat])
        .addTo(map.current)
    }
  }, [mapLoaded, startPoint, endPoint])

  // Обновление маршрута
  useEffect(() => {
    if (!map.current || !mapLoaded || !route) return

    const sourceId = 'route-source'
    const layerId = 'route-layer'

    // Удаляем старый маршрут
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId)
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId)
    }

    // Добавляем новый маршрут
    const coordinates = route.geometry.map((p) => [p.lng, p.lat])

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

    // Подгоняем карту под маршрут
    const bounds = new maplibregl.LngLatBounds()
    coordinates.forEach((coord) => bounds.extend(coord as [number, number]))
    map.current.fitBounds(bounds, { padding: 50 })
  }, [mapLoaded, route])

  // Обновление запретных зон
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Удаляем старые зоны
    avoidZones.forEach((zone) => {
      const sourceId = `zone-source-${zone.id}`
      const layerId = `zone-layer-${zone.id}`

      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId)
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId)
      }
    })

    // Добавляем новые зоны
    avoidZones.forEach((zone) => {
      const sourceId = `zone-source-${zone.id}`
      const layerId = `zone-layer-${zone.id}`

      const coordinates = zone.polygon.map((p) => [p.lng, p.lat])
      coordinates.push(coordinates[0]) // Замыкаем полигон

      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        },
      })

      map.current?.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.3,
        },
      })

      map.current?.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ff0000',
          'line-width': 2,
        },
      })
    })
  }, [mapLoaded, avoidZones])

  console.log('🗺️ MapComponent рендерится, mapLoaded:', mapLoaded)

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

