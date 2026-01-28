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

if (INSTANCE_ID === "MyHealthSummary") {
  await import(`$lib/scss/_styles_MyHealthSummary.scss`);
} else {
  await import(`$lib/scss/_styles_WAHealthSummary.scss`);
}

export const INSTANCE_CONFIG = configs[INSTANCE_ID];
