// import {PUBLIC_BASE_URL} from '$env/static/public';
import { dev } from '$app/environment';

export const API_BASE = 'https://smart-health-links-server.cirg.washington.edu/api'
export const VIEWER_BASE = new URL(
  `/ips${dev ? '/index.html' : ''}#`,
  window.location.href
).toString();
export const EXAMPLE_IPS = {
  'Maria Gravitate': 'https://ips.health/fhir/Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299/$summary',
  'Peter Keith Jones': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11013/$summary',
  'Angela Roster': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10965/$summary',
  'Horace Skelly': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11142/$summary',
  'Anonymous': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10999/$summary'
};
export const EXAMPLE_IPS_DEFAULT = 'Maria Gravitate';
  // 'https://ips.health/fhir/Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299/$summary';
