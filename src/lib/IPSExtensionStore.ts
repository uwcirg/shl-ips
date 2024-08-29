import { writable, get } from 'svelte/store';
import { IPSExtension } from './IPSExtension';
import type { Bundle, CompositionSection, Resource } from 'fhir/r4';

export interface IPSExtensionStore {
    addResource(resource: Resource): void;
    addResources(resources: Resource[]): void;
    extendIPS(ips: Bundle): void;
    getName(): string;
    getResourceCount(): number;
    getSection(): CompositionSection;
    self(): object;
    setResources(resources: Resource[]): void;
    setSection(section: CompositionSection): void;
    subscribe(v: any): any;
}

export function newIPSExtensionStore(name: string) {
    let store = writable(new IPSExtension(name));
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
        extendIPS: (ips: Bundle) => {
            return get(store).extendIPS(ips);
        },
        getName: () => {
            return get(store).getName();
        },
        getResourceCount: () => {
            return get(store).getResourceCount();
        },
        getSection: () => {
            return get(store).getSection();
        },
        self: () => get(store),
        setResources: (resources: Resource[]) => {
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
