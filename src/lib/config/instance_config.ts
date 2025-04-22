import WAHealthSummary from '$lib/config/config_WAHealthSummary';
import WAHealthSummaryPOLST from '$lib/config/config_WAHealthSummaryPOLST';

const INSTANCE_ID = import.meta.env.VITE_INSTANCE_ID;

const configs: Record<string, any> = {
  WAHealthSummary: WAHealthSummary,
  WAHealthSummaryPOLST: WAHealthSummaryPOLST,
};

export const INSTANCE_CONFIG = configs[INSTANCE_ID] || WAHealthSummary;