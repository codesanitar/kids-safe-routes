export interface Point {
  lat: number
  lng: number
}

export interface AvoidZone {
  id: string
  center: Point
  radius: number // в метрах
  polygon: Point[] // аппроксимированный многоугольник
}

export interface Route {
  geometry: Point[]
  distance: number // в метрах
  duration: number // в секундах
}

export type RouteMode = 'from-me' | 'a-to-b'

