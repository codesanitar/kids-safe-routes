/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORS_API_KEY: string
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

