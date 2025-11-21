/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORS_API_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_AUTH_SECRET_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Типы для Telegram WebApp (для режима отладки)
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        platform?: string
        initData?: string
        initDataUnsafe?: any
      }
    }
  }
}

export {}

