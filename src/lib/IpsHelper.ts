import { ResourceHelper } from "./ResourceHelper";

export class IPSHelper {
    resources: ResourceHelper[];

    constructor();
    constructor(rh: ResourceHelper);
    constructor(rh: ResourceHelper[]);
    constructor(rh: ResourceHelper | ResourceHelper[]=[]) {
        if (Array.isArray(rh)) {
            this.resources = rh;
        } else {
            this.resources = [];
            if (rh) {
                this.resources.push(rh);
            }
        }
    }

    
}