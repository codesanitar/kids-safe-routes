import { Point, Route, AvoidZone } from '../types'
import { zonesToAvoidPolygons } from '../utils/geometry'
import * as polyline from '@mapbox/polyline'

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || ''
// В режиме разработки используем прокси Vite для обхода CORS
const ORS_BASE_URL = import.meta.env.DEV 
  ? '/api/ors' 
  : 'https://api.openrouteservice.org/v2'

export interface RouteRequest {
  start: Point
  end: Point
  avoidZones?: AvoidZone[]
}

/**
 * Строит маршрут через OpenRouteService API
 */
export async function buildRoute(request: RouteRequest): Promise<Route> {
  const { start, end, avoidZones = [] } = request

  const body: any = {
    coordinates: [
      [start.lng, start.lat], // ORS использует формат [lng, lat]
      [end.lng, end.lat],
    ],
    profile: 'foot-walking',
    format: 'json',
    geometry: true,
  }

  // Добавляем запретные зоны, если есть
  // OpenRouteService требует avoid_polygons в формате GeoJSON Polygon или MultiPolygon
  if (avoidZones.length > 0) {
    const polygons = zonesToAvoidPolygons(avoidZones)
    
    if (import.meta.env.DEV) {
      console.log('Avoid polygons format:', JSON.stringify(polygons, null, 2))
    }
    
    // OpenRouteService требует avoid_polygons как объект GeoJSON
    // Если одна зона - используем Polygon, если несколько - MultiPolygon
    if (avoidZones.length === 1) {
      body.options = {
        avoid_polygons: {
          type: 'Polygon',
          coordinates: polygons[0],
        },
      }
    } else {
      body.options = {
        avoid_polygons: {
          type: 'MultiPolygon',
          coordinates: polygons,
        },
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('Full request body:', JSON.stringify(body, null, 2))
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  // OpenRouteService принимает API ключ через query параметр api_key или заголовок Authorization
  // Используем query параметр для надежности (работает и в dev, и в production)
  let url = `${ORS_BASE_URL}/directions/foot-walking`
  if (ORS_API_KEY) {
    url += `?api_key=${ORS_API_KEY}`
  }

  if (import.meta.env.DEV) {
    console.log('ORS Request URL:', url)
    console.log('ORS Request Body:', JSON.stringify(body, null, 2))
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (import.meta.env.DEV) {
      console.error('ORS API Error Response:', errorText)
    }
    throw new Error(`ORS API error: ${errorText}`)
  }

  const data = await response.json()

  // Отладка: логируем структуру ответа
  if (import.meta.env.DEV) {
    console.log('ORS API Response:', JSON.stringify(data, null, 2))
  }

  // OpenRouteService может вернуть ответ в двух форматах:
  // 1. GeoJSON формат с features (если format: 'geojson')
  // 2. Обычный формат с routes (если format не указан или другой)
  
  let geometry: { lng: number; lat: number }[] = []
  let distance = 0
  let duration = 0

  if (data.features && data.features.length > 0) {
    // GeoJSON формат
    const feature = data.features[0]
    geometry = feature.geometry.coordinates.map(([lng, lat]: number[]) => ({
      lng,
      lat,
    }))
    const properties = feature.properties
    distance = properties.segments?.[0]?.distance || 0
    duration = properties.segments?.[0]?.duration || 0
  } else if (data.routes && data.routes.length > 0) {
    // Обычный формат с routes
    const route = data.routes[0]
    const summary = route.summary || {}
    distance = summary.distance || 0
    duration = summary.duration || 0
    
    // Пытаемся найти geometry в разных местах
    if (route.geometry) {
      // Если geometry есть напрямую в route
      if (typeof route.geometry === 'string') {
        // Закодированная polyline строка - декодируем
        // @mapbox/polyline возвращает координаты как [lat, lng]
        try {
          const decoded = polyline.decode(route.geometry)
          geometry = decoded.map((coord: [number, number]) => {
            // Polyline возвращает [lat, lng], нам нужно [lng, lat]
            const [lat, lng] = coord
            return { lng, lat }
          })
          
          if (import.meta.env.DEV) {
            console.log('Декодировано точек маршрута:', geometry.length)
            console.log('Первая точка:', geometry[0])
            console.log('Последняя точка:', geometry[geometry.length - 1])
          }
        } catch (err) {
          console.error('Ошибка декодирования polyline:', err)
        }
      } else if (Array.isArray(route.geometry)) {
        // Массив координат [lng, lat] или [[lng, lat], ...]
        if (route.geometry.length > 0 && Array.isArray(route.geometry[0])) {
          // Массив массивов координат
          geometry = route.geometry.map((coord: number[]) => ({
            lng: coord[0],
            lat: coord[1],
          }))
        } else if (route.geometry.length === 2 && typeof route.geometry[0] === 'number') {
          // Одна координата [lng, lat]
          geometry = [{
            lng: route.geometry[0],
            lat: route.geometry[1],
          }]
        }
      } else if (route.geometry.coordinates) {
        // GeoJSON формат geometry
        geometry = route.geometry.coordinates.map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1],
        }))
      }
    }
    
    // Если geometry не найдена, пробуем собрать из way_points в steps
    // way_points указывают на индексы в полной geometry, но нам нужна сама geometry
    // Попробуем собрать координаты из начальной и конечной точек маршрута
    if (geometry.length === 0) {
      // Используем координаты из запроса как fallback
      geometry = [
        { lng: start.lng, lat: start.lat },
        { lng: end.lng, lat: end.lat }
      ]
      console.warn('Геометрия не найдена в ответе, используем прямую линию между точками')
    }
  } else {
    throw new Error('Маршрут не найден')
  }

  if (geometry.length === 0) {
    throw new Error('Не удалось извлечь геометрию маршрута')
  }

  return {
    geometry,
    distance,
    duration,
  }
}

