import { getAccessToken } from './auth'

/**
 * Базовый URL API бэкенда
 * Можно настроить через переменную окружения VITE_API_BASE_URL
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * Выполняет HTTP запрос к API с автоматическим добавлением токена авторизации
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()

  if (!token) {
    throw new Error('Пользователь не авторизован')
  }

  const url = API_BASE_URL 
    ? `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    : endpoint

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API ошибка: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * GET запрос
 */
export async function apiGet<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' })
}

/**
 * POST запрос
 */
export async function apiPost<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUT запрос
 */
export async function apiPut<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETE запрос
 */
export async function apiDelete<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
}

