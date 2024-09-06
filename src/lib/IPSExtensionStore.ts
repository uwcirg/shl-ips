import { writable, get } from 'svelte/store';
import { IPSExtension } from './IPSExtension';
import type { Bundle, CompositionSection, Resource } from 'fhir/r4';

export interface IPSExtensionStore {
	addResource(resource: Resource): void;
	addResources(resources:Resource[]): void;
    extendIPS(ips: Bundle): void;
	self(): object;
	setSection(section: CompositionSection): void;
	subscribe(v: any): any;
}

export function newIPSExtensionStore() {
	let store = writable(new IPSExtension());
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
        extendIPS(ips: Bundle) {
            let s = get(store);
            s.extendIPS(ips);
            store.set(s);
        },
		self: () => get(store),
        setResources(resources: Resource[]) {
            let s = get(store);
            s.setResources(resources);
            store.set(s);
        },
		setSection: (section: CompositionSection) => {
			let s = get(store);
			s.setSection(section);
			store.set(s);
		},
		subscribe: store.subscribe
	} as IPSExtensionStore;
}
