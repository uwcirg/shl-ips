import type { Bundle, Composition, CompositionSection, FhirResource, Resource } from "fhir/r4";
import type { ResourceHelper } from "./ResourceHelper";
import { IPSResourceCollection } from "./IPSResourceCollection";

export class IPSExtension extends IPSResourceCollection {
    name: string;
    section: CompositionSection;

    constructor(name: string);
    constructor(name: string, resource: Resource | Resource[] | null);
    constructor(name: string, resource: Resource | Resource[] | null, section: CompositionSection | null);
    constructor(name: string, resource: Resource | Resource[] | null = null, section: CompositionSection | null = null) {
        super(resource);
        this.name = name;
        this.section = { entry: []} as CompositionSection;
        if (section) {
            this.setSection(section);
        }
    }

    extendIPS(ips: Bundle) {
        if (ips.entry === undefined || !ips.entry[0] || ips.entry[0].resource?.resourceType !== "Composition") {
            throw Error("IPS does not contain a Composition resource");
        }
        
        let composition = ips.entry[0].resource as Composition;
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
        let selected = this.getSelectedResources();
        selected.forEach((rh:ResourceHelper) => {
            let entry = {
                resource: rh.resource as FhirResource,
                fullUrl: `urn:uuid:${rh.resource.id}`
            }
            ips.entry?.push(entry);
            sectionToUse.entry?.push({
                reference: `${entry.fullUrl}`
            });
        });
        if (addingNewSection) {
            composition.section?.push(sectionToUse);
        }

        return ips;
    }

    setSection(section: CompositionSection) {
        this.section = section;
    }
}