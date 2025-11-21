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

// Типы для авторизации
export interface User {
  tg_id: number
  username?: string
  first_name?: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}
