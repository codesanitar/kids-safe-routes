import { Point, Route, AvoidZone } from '../types'
import { zonesToAvoidPolygons } from '../utils/geometry'

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || ''
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2'

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
      [start.lng, start.lat],
      [end.lng, end.lat],
    ],
    profile: 'foot-walking',
    format: 'geojson',
  }

  // Добавляем запретные зоны, если есть
  if (avoidZones.length > 0) {
    body.options = {
      avoid_polygons: zonesToAvoidPolygons(avoidZones),
    }
  }

  const response = await fetch(`${ORS_BASE_URL}/directions/foot-walking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ORS_API_KEY ? `Bearer ${ORS_API_KEY}` : '',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ORS API error: ${error}`)
  }

  const data = await response.json()

  if (!data.features || data.features.length === 0) {
    throw new Error('Маршрут не найден')
  }

  const feature = data.features[0]
  const geometry = feature.geometry.coordinates.map(([lng, lat]: number[]) => ({
    lng,
    lat,
  }))

  const properties = feature.properties
  const distance = properties.segments?.[0]?.distance || 0
  const duration = properties.segments?.[0]?.duration || 0

  return {
    geometry,
    distance,
    duration,
  }
}

