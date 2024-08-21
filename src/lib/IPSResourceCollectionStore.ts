import { writable, get } from 'svelte/store';
import { IPSResourceCollection } from './IPSResourceCollection';
import type { Resource } from 'fhir/r4';

export interface IPSResourceCollectionStore {
	addResource(resource: Resource): void;
	addResources(resources:Resource[]): void;
	getSelectedResources(): void;
	self(): object;
	setSelectedPatient(p: string): void;
	subscribe(v: any): any;
}

export function newIPSResourceCollection() {
	// const { subscribe, set, update } = writable(new IPSResourceCollection());
	let store = writable(new IPSResourceCollection());
	return {
		addResource: (resource: Resource) => {
			let s = get(store);
			s.addResource(resource);
			store.set(s);
		},
		addResources: (resources: Resource[]) => {
			let s = get(store);
			s.addResources(resources);
			store.set(s);
		},
		getSelectedResources: () => {
			let s = get(store);
			return s.getSelectedResources();
		},
		self: () => get(store),
		setSelectedPatient: (p: string) => {
			let s = get(store);
			s.setSelectedPatient(p);
			store.set(s);
		},
		subscribe: store.subscribe
	} as IPSResourceCollectionStore;
} 
