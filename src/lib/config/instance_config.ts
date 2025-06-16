import WAHealthSummary from '$lib/config/config_WAHealthSummary';
import WAHealthSummaryPOLST from '$lib/config/config_WAHealthSummaryPOLST';
import WAHealthSummaryPOLSTProvider from '$lib/config/config_WAHealthSummaryPOLSTProvider';

const INSTANCE_ID = import.meta.env.VITE_INSTANCE_ID;

const configs: Record<string, any> = {
  WAHealthSummary: WAHealthSummary,
  WAHealthSummaryPOLST: WAHealthSummaryPOLST,
  WAHealthSummaryPOLSTProvider: WAHealthSummaryPOLSTProvider
};

export const INSTANCE_CONFIG = configs[INSTANCE_ID] || WAHealthSummary;