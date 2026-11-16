<script lang="ts">
	import MonthInput from '$lib/components/MonthInput.svelte';

	// Renders MonthInput with its bound value shown, so tests can read it
	export let value = '';
</script>

<MonthInput bind:value />
<output data-testid="value">{value}</output>
