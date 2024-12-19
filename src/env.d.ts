/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AUTH_URL: string
    readonly VITE_AUTH_CLIENT_ID: string
    readonly VITE_AUTH_REDIRECT_URI: string
    readonly VITE_AUTH_SILENT_REDIRECT_URI: string
    readonly VITE_AUTH_POST_LOGOUT_URI: string
    readonly VITE_EPIC_HIMSS_CLIENT_ID: string
    readonly VITE_ECW_HIMSS_CLIENT_ID: string
    readonly VITE_EPIC_CLIENT_ID: string
    readonly VITE_CERNER_CLIENT_ID: string
    readonly VITE_MEDITECH_BEARER_TOKEN: string
    readonly VITE_API_BASE: string
    readonly VITE_VIEWER_BASE: string
    readonly VITE_SHOW_VIEWER_DEMO: boolean
    readonly VITE_INTERMEDIATE_FHIR_SERVER_BASE: string
    readonly VITE_VERSION_STRING: string
    readonly DEV_SERVER_PORT: number
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}