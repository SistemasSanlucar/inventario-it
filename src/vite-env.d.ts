/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MSAL_CLIENT_ID: string
  readonly VITE_MSAL_AUTHORITY: string
  readonly VITE_SHAREPOINT_SITE_PATH: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
