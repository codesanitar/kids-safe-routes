import { AuthResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AUTH_SECRET_KEY = import.meta.env.VITE_AUTH_SECRET_KEY || ''

const ACCESS_TOKEN_KEY = 'auth_access_token'
const AUTH_ENDPOINT = '/tma-auth' // Эндпоинт авторизации

/**
 * Получает accessToken из localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Сохраняет accessToken в localStorage
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

/**
 * Удаляет accessToken из localStorage
 */
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

/**
 * Выполняет авторизацию через бэкенд
 * @param initData - init data из Telegram
 * @returns Promise с данными авторизации (accessToken и user)
 */
export async function authenticate(initData: string): Promise<AuthResponse> {
  if (!API_BASE_URL) {
    throw new Error('Базовый URL API не настроен. Проверьте переменную VITE_API_BASE_URL в .env')
  }

  if (!AUTH_SECRET_KEY) {
    throw new Error('Секретный ключ авторизации не настроен. Проверьте переменную VITE_AUTH_SECRET_KEY в .env')
  }

  if (!initData) {
    throw new Error('Init data от Telegram не получен')
  }

  const authUrl = `${API_BASE_URL}${AUTH_ENDPOINT}`

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_SECRET_KEY}`,
        'x-init-data': initData,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ошибка авторизации: ${response.status} ${errorText}`)
    }

    const data: AuthResponse = await response.json()

    if (!data.accessToken) {
      throw new Error('AccessToken не получен в ответе сервера')
    }

    // Сохраняем токен
    setAccessToken(data.accessToken)

    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Неизвестная ошибка при авторизации')
  }
}

/**
 * Проверяет, авторизован ли пользователь (есть ли токен)
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

