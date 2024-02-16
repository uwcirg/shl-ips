<script lang="ts">
    import { createEventDispatcher, onMount, getContext } from 'svelte';
    import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
    import type { SHLRetrieveEvent } from './types';
    import type { SOFClient } from '$lib/sofClient'

    let shlClient: SHLClient = getContext('shlClient');
    let sofClient: SOFClient = getContext('sofClient');

    const shlRetrievalDispatch = createEventDispatcher<{ 'shl-retrieved': SHLRetrieveEvent }>();

    let fetchError = "";

    onMount(async () => {
        let patientID = undefined;
        try {
          // get current patient from sofClient
          let patientID = sofClient.getPatientID();
          // retrieve SHLs for current patient via shlClient
          let shl = await shlClient.getShl(patientID);
          return shlRetrievalDispatch('shl-retrieved', {
            shl: shl
          });
        } catch (error) {
          fetchError = "Unable to retrieve most recent sharing link. Please try again later.";
          console.error(`Error retrieving SHL for patient ${patientID}: ${error}`);
        }
        // Meanwhile, in FetchSOF:
          // retrieve DocRefs for current patient
        
        // Then, in AddFile:
          // Compare sessionIDs in most recent DocRef with sessionID in most recent SHL
          // Create a new SHL if out of date
          // Return the current shl
    });

</script>
