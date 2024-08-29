import { ResourceHelper } from "./ResourceHelper";
import type { Bundle, Composition, CompositionSection, FhirResource, Resource } from "fhir/r4";

export interface IPSExtensionInterface {
    name: string;
    section: CompositionSection;
    resources: { [key: string]: ResourceHelper };
}

export class IPSExtension implements IPSExtensionInterface {
    name: string;
    section: CompositionSection = {entry: []} as CompositionSection;
    resources: { [key: string]: ResourceHelper } = {};

    constructor(name: string);
    constructor(name: string, resource: Resource);
    constructor(name: string, resource: Resource[]);
    constructor(name: string, resource: Resource | Resource[] | null = null, section: CompositionSection | null = null) {
        this.name = name;
        if (resource) {
            if (Array.isArray(resource)) {
                this.addResources(resource);
            } else {
                this.addResource(resource);
            }
        }
        if (section) {
            this.setSection(section);
        }
    }

    addResource(resource: Resource) {
        let rh = new ResourceHelper(resource);
        if (!(rh.tempId in this.resources)) {
            this.resources[rh.tempId] = rh;
        }
    }

    addResources(resources:Resource[]) {
        resources.forEach(r => this.addResource(r));
    }

    extendIPS(ips: Bundle) {
        if (!ips.entry) {
            ips.entry = [];
        }
        let composition: Composition = ips.entry[0].resource as Composition;
        let sectionToUse = this.section;
        let addingNewSection = true;
        if (composition?.section) {
            composition.section.forEach(section => {
                if (section?.code?.coding?.[0].code === this.section?.code?.coding?.[0]?.code) {
                    sectionToUse = section;
                    addingNewSection = false;
                }
            });
        }
        
        if (sectionToUse.entry === undefined) {
            sectionToUse.entry = [];
        }
        let rkeys = Object.keys(this.resources);
        for (let i=0; i < rkeys.length; i++) {
            if (this.resources[rkeys[i]].include) {
                let entry = {
                    resource: this.resources[rkeys[i]].resource as FhirResource,
                    fullUrl: `urn:uuid:${this.resources[rkeys[i]].resource.id}`
                }
                ips.entry.push(entry);
                sectionToUse.entry.push({
                    reference: `${entry.fullUrl}`
                });
            }
        }
        if (addingNewSection) {
            composition.section?.push(sectionToUse);
        }

        return ips;
    }

    getName() {
        return this.name;
    }

    getResourceCount() {
        return Object.keys(this.resources).length;
    }

    getSection() {
        return this.section;
    }

    setResources(resources: Resource[]) {
        this.resources = {};
        this.addResources(resources);
    }

    setSection(section: CompositionSection) {
        this.section = section;
    }
}