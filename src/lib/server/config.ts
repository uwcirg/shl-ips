export const AUTOCODER_API_KEY = process.env.AUTOCODER_API_KEY;

export const REDIRECT_URI = process.env.REDIRECT_URI;

export const SERVER_API_BASE = process.env.VITE_API_BASE;

export const CARIN_HOSTS: Record<string, any> = {
  aetna: {
    tokenEndpoint: process.env.AETNA_TOKEN_ENDPOINT,
    clientId: process.env.VITE_AETNA_CLIENT_ID,
    clientSecret: process.env.AETNA_CLIENT_SECRET,
  },
  acentra: {
    tokenEndpoint: process.env.ACENTRA_TOKEN_ENDPOINT,
    clientId: process.env.VITE_ACENTRA_CLIENT_ID,
    clientSecret: process.env.ACENTRA_CLIENT_SECRET,
  },
  carefirst: {
    tokenEndpoint: process.env.CAREFIRST_TOKEN_ENDPOINT,
    clientId: process.env.VITE_CAREFIRST_CLIENT_ID,
    clientSecret: process.env.CAREFIRST_CLIENT_SECRET,
  },
  cpcds: {
    tokenEndpoint: process.env.CPCDS_TOKEN_ENDPOINT,
    clientId: process.env.VITE_CPCDS_CLIENT_ID,
    clientSecret: process.env.CPCDS_CLIENT_SECRET,
  },
  humana: {
    tokenEndpoint: process.env.HUMANA_TOKEN_ENDPOINT,
    clientId: process.env.VITE_HUMANA_CLIENT_ID,
    clientSecret: process.env.HUMANA_CLIENT_SECRET,
  },
  inferno: {
    tokenEndpoint: process.env.INFERNO_TOKEN_ENDPOINT,
    clientId: process.env.VITE_INFERNO_CLIENT_ID,
    clientSecret: process.env.INFERNO_CLIENT_SECRET,
  },
  onyx: {
    tokenEndpoint: process.env.ONYX_TOKEN_ENDPOINT,
    clientId: process.env.VITE_ONYX_CLIENT_ID,
    clientSecret: process.env.ONYX_CLIENT_SECRET,
  },
  smilecarinbb: {
    tokenEndpoint: process.env.SMILECARINBB_TOKEN_ENDPOINT,
    clientId: process.env.VITE_SMILECARINBB_CLIENT_ID,
    clientSecret: process.env.SMILECARINBB_CLIENT_SECRET,
  },
  deloitte: {
    tokenEndpoint: process.env.DELOITTE_TOKEN_ENDPOINT,
    clientId: process.env.VITE_DELOITTE_CLIENT_ID,
    clientSecret: process.env.DELOITTE_CLIENT_SECRET,
  },
  bluebutton: {
    tokenEndpoint: process.env.BLUE_BUTTON_TOKEN_ENDPOINT,
    clientId: process.env.VITE_BLUE_BUTTON_CLIENT_ID,
    clientSecret: process.env.BLUE_BUTTON_CLIENT_SECRET,
  }
}

export const URL_BEARER_HOSTS: Record<string, any> = {
  meditech: {
    token: process.env.MEDITECH_BEARER_TOKEN
  },
  epic: {
    token: process.env.EPIC_BEARER_TOKEN
  }
}
