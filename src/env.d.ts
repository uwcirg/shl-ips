/// <reference types="vite/client" />

interface ImportMetaEnv {
    // System configuration
    readonly DEV_SERVER_PORT: number
    readonly VITE_API_BASE: string
    readonly VITE_VIEWER_BASE: string
    readonly VITE_SHOW_VIEWER_DEMO: boolean
    readonly VITE_INTERMEDIATE_FHIR_SERVER_BASE: string
    readonly VITE_VERSION_STRING: string

    // Authentication
    readonly VITE_AUTH_URL: string
    readonly VITE_AUTH_CLIENT_ID: string
    readonly VITE_AUTH_REDIRECT_URI: string
    readonly VITE_AUTH_SILENT_REDIRECT_URI: string
    readonly VITE_AUTH_POST_LOGOUT_URI: string

    // SMART on FHIR client configurations
    readonly VITE_EPIC_HIMSS_CLIENT_ID: string
    readonly VITE_ECW_HIMSS_CLIENT_ID: string
    readonly VITE_EPIC_CLIENT_ID: string
    readonly VITE_CERNER_CLIENT_ID: string
    
    // Bearer tokens/api keys
    readonly AUTOCODER_API_KEY: string
    readonly MEDITECH_BEARER_TOKEN: string
    readonly EPIC_BEARER_TOKEN: string
    
    // CARIN SMART on FHIR client configurations
    readonly REDIRECT_URI: string
    
    readonly VITE_ACENTRA_CLIENT_ID: string
    readonly ACENTRA_CLIENT_SECRET: string
    readonly ACENTRA_TOKEN_ENDPOINT: string
    
    readonly VITE_AETNA_CLIENT_ID: string
    readonly AETNA_CLIENT_SECRET: string
    readonly AETNA_TOKEN_ENDPOINT: string
    
    readonly VITE_CAREFIRST_CLIENT_ID: string
    readonly CAREFIRST_CLIENT_SECRET: string
    readonly CAREFIRST_TOKEN_ENDPOINT: string
    
    readonly VITE_HUMANA_CLIENT_ID: string
    readonly HUMANA_CLIENT_SECRET: string
    readonly HUMANA_TOKEN_ENDPOINT: string
    
    readonly VITE_CPCDS_CLIENT_ID: string
    readonly CPCDS_CLIENT_SECRET: string
    readonly CPCDS_TOKEN_ENDPOINT: string
    
    readonly VITE_INFERNO_CLIENT_ID: string
    readonly INFERNO_CLIENT_SECRET: string
    readonly INFERNO_TOKEN_ENDPOINT: string

    readonly VITE_BLUE_BUTTON_CLIENT_ID: string
    readonly BLUE_BUTTON_CLIENT_SECRET: string
    readonly BLUE_BUTTON_TOKEN_ENDPOINT: string
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}
