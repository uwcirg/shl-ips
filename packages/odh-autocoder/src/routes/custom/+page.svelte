<script lang="ts">
	import type { Observation } from 'fhir/r4';
	import {
		CurrentWorkSection,
		EmploymentStatusSection,
		JobDescriptionCoder,
		OdhFormProvider,
		RetirementDateSection,
		type RetirementDateEntry
	} from '$lib/index.js';

	// Playground: an app's own layout around OdhFormProvider, with the experimental description
	// coder, and a section used on its own. Not published.

	let saved: Observation[] | undefined;
	let editing: Observation[] | undefined;
	let standalone: RetirementDateEntry[] = [];
	let nextId = 1;
	const createId = () => `entry-${nextId++}`;
</script>

<svelte:head>
	<title>odh-autocoder playground: custom layout</title>
</svelte:head>

<main class="container my-4">
	<p><a href="/">Default form</a></p>
	<h1 class="h3">Custom layout</h1>
	<p class="text-secondary">
		OdhFormProvider with this page's own markup: status and current work only, coded from a
		description. Ids come from this page's <code>createId</code>.
	</p>

	<OdhFormProvider resources={editing} {createId} onsave={(r) => (saved = r)} let:submit let:reset let:isWorking>
		<section class="card mb-3">
			<div class="card-body">
				<h2 class="h5">Your work</h2>
				<EmploymentStatusSection />
				{#if isWorking}
					<CurrentWorkSection jobCoder={JobDescriptionCoder} />
				{/if}
			</div>
		</section>
		<button class="btn btn-primary" on:click={submit}>Save</button>
		<button class="btn btn-link" on:click={reset}>Start over</button>
	</OdhFormProvider>

	{#if saved}
		<div class="d-flex align-items-center gap-2 mt-4 mb-2">
			<h2 class="h5 mb-0">Saved resources ({saved.length})</h2>
			<button class="btn btn-sm btn-outline-secondary" on:click={() => (editing = saved)}>
				Edit these
			</button>
		</div>
		<pre class="bg-light p-3 border rounded">{JSON.stringify(saved, null, 2)}</pre>
	{/if}

	<h2 class="h4 mt-5">A section on its own</h2>
	<p class="text-secondary">RetirementDateSection with <code>bind:entries</code>, outside any provider.</p>
	<RetirementDateSection bind:entries={standalone} {createId} />
	<pre class="bg-light p-3 border rounded mt-3">{JSON.stringify(standalone, null, 2)}</pre>
</main>
