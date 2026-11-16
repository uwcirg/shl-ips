<script lang="ts">
	import type { Bundle, Observation } from 'fhir/r4';
	import { OdhForm } from 'odh-autocoder';

	let saved: Observation[] | undefined;

	function onsave(resources: Observation[]) {
		saved = resources;
	}

	function asBundle(resources: Observation[]): Bundle {
		return {
			resourceType: 'Bundle',
			type: 'collection',
			entry: resources.map((resource) => ({ resource }))
		};
	}

	function download() {
		if (!saved) return;
		const blob = new Blob([JSON.stringify(asBundle(saved), null, 2)], {
			type: 'application/fhir+json'
		});
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'work-history.json';
		link.click();
		URL.revokeObjectURL(link.href);
	}
</script>

<svelte:head>
	<title>Health-Related Work Info</title>
</svelte:head>

<main class="container my-4">
	<h1 class="h3">Health-Related Work Info</h1>
	<p class="text-secondary">
		Describe your work in your own words. Each job is matched to standard occupation and
		industry codes, which you can review before saving.
	</p>

	<div class="card mb-4">
		<div class="card-body">
			<OdhForm resources={saved} {onsave} />
		</div>
	</div>

	{#if saved}
		<section aria-labelledby="result-heading">
			<div class="d-flex align-items-center gap-2 mb-2">
				<h2 id="result-heading" class="h5 mb-0">Your work info as FHIR ({saved.length} resources)</h2>
				<button class="btn btn-sm btn-primary" on:click={download}>Download JSON</button>
			</div>
			<pre class="bg-light p-3 border rounded" data-testid="saved-json">{JSON.stringify(saved, null, 2)}</pre>
		</section>
	{/if}
</main>
