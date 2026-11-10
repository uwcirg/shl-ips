<script lang="ts">
	import type { Observation } from 'fhir/r4';
	import { OdhForm } from '$lib/index.js';

	// Playground for developing the package. Not published.

	let saved: Observation[] | undefined;
	let editing: Observation[] | undefined;

	function onsave(resources: Observation[]) {
		saved = resources;
	}
</script>

<svelte:head>
	<title>odh-autocoder playground</title>
</svelte:head>

<main class="container my-4">
	<h1 class="h3">odh-autocoder playground</h1>
	<p class="text-secondary">
		Codes against a local mock unless <code>AUTOCODER_API_KEY</code> is set. Try "nurse",
		"cook", or "hospital".
	</p>

	<div class="card mb-4">
		<div class="card-body">
			<OdhForm resources={editing} {onsave} />
		</div>
	</div>

	{#if saved}
		<div class="d-flex align-items-center gap-2 mb-2">
			<h2 class="h5 mb-0">Saved resources ({saved.length})</h2>
			<button class="btn btn-sm btn-outline-secondary" on:click={() => (editing = saved)}>
				Edit these
			</button>
		</div>
		<pre class="bg-light p-3 border rounded" data-testid="saved-json">{JSON.stringify(saved, null, 2)}</pre>
	{/if}
</main>
