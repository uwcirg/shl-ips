<!--
  Stand-in for $lib/components/viewer/IPSContent.svelte in tests that only care whether the
  /ips page successfully retrieved and handed off a bundle — not how IPSContent itself renders
  that bundle's resources. Matches IPSContent's real prop signature (bundle, mode).
-->
<script lang="ts">
  export let bundle: any;
  export let mode: string;

  $: patientGivenName = bundle?.entry?.find((e: any) => e.resource?.resourceType === 'Patient')
    ?.resource?.name?.[0]?.given?.[0];
</script>

<div data-testid="ips-content-stub">
  IPS content loaded for {patientGivenName ?? 'unknown patient'} (mode: {mode})
</div>
