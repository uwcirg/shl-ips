/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SHOW_DEMO: boolean
    readonly VITE_EPIC_CLIENT_ID: string
    readonly VITE_CERNER_CLIENT_ID: string
    readonly VITE_API_BASE: string
    readonly VITE_VIEWER_BASE: string
    readonly VITE_INTERMEDIATE_FHIR_SERVER_BASE: string
    readonly VITE_SOF_CLIENT_ID: string
    readonly VITE_SOF_ISS: string
    readonly VITE_BACK_URL: string
    readonly VITE_LOGOUT_URL: string
    readonly DEV_SERVER_PORT: number
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}