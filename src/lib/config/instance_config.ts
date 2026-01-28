import MyHealthSummary from '$lib/config/config_MyHealthSummary';
import WAHealthSummary from '$lib/config/config_WAHealthSummary';
import WAHealthSummaryPOLST from '$lib/config/config_WAHealthSummaryPOLST';
import WAHealthSummaryPOLSTProvider from '$lib/config/config_WAHealthSummaryPOLSTProvider';

const INSTANCE_ID = import.meta.env.VITE_INSTANCE_ID ?? "WAHealthSummary";

const configs: Record<string, any> = {
  "MyHealthSummary": MyHealthSummary,
  "WAHealthSummary": WAHealthSummary,
  "WAHealthSummaryPOLST": WAHealthSummaryPOLST,
  "WAHealthSummaryPOLSTProvider": WAHealthSummaryPOLSTProvider
};

await import(`$lib/scss/_styles_${INSTANCE_ID}.scss`);

export const INSTANCE_CONFIG = configs[INSTANCE_ID];
