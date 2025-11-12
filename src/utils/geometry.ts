import { Point, AvoidZone } from '../types'

/**
 * Генерирует многоугольник для круга заданного радиуса
 * @param center Центр круга
 * @param radius Радиус в метрах
 * @param vertices Количество вершин (по умолчанию 32)
 * @returns Массив точек многоугольника
 */
export function generateCirclePolygon(
  center: Point,
  radius: number,
  vertices: number = 32
): Point[] {
  const points: Point[] = []
  const earthRadius = 6371000 // радиус Земли в метрах

  for (let i = 0; i < vertices; i++) {
    const angle = (i * 2 * Math.PI) / vertices
    const latOffset = (radius / earthRadius) * (180 / Math.PI)
    const lngOffset =
      (radius / earthRadius) *
      (180 / Math.PI) /
      Math.cos((center.lat * Math.PI) / 180)

    points.push({
      lat: center.lat + latOffset * Math.cos(angle),
      lng: center.lng + lngOffset * Math.sin(angle),
    })
  }

  return points
}

/**
 * Преобразует AvoidZone в формат для avoid_polygons ORS API
 * OpenRouteService требует формат GeoJSON Polygon:
 * [[[lng, lat], [lng, lat], ...]] - массив с одним элементом (внешнее кольцо)
 */
export function zoneToAvoidPolygon(zone: AvoidZone): number[][][] {
  const coordinates = zone.polygon.map((p) => [p.lng, p.lat])
  // Замыкаем полигон (первая точка = последняя)
  coordinates.push(coordinates[0])
  // Оборачиваем в дополнительный массив для GeoJSON формата
  return [coordinates]
}

/**
 * Преобразует массив зон в формат для avoid_polygons ORS
 * Формат: массив полигонов, каждый полигон в формате GeoJSON [[[lng, lat], ...]]
 */
export function zonesToAvoidPolygons(zones: AvoidZone[]): number[][][][] {
  return zones.map((zone) => zoneToAvoidPolygon(zone))
}

