<script lang="ts">
  import {
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    FormGroup,
    Label,
    Portal,
    Input,
    Icon,
    Spinner
  } from '@sveltestrap/sveltestrap';
  import type { Coding } from 'fhir/r4';
  import { onDestroy, onMount } from 'svelte';

  export let value: Coding;

  let defaultOptions: Coding[] = [
    {
      system: "http://terminology.hl7.org/CodeSystem/v2-0006",
      code: "VAR",
      display: "Unknown",
    }
  ];

  let isOpen = false;
  $: icon = 'search';
  let processing = false;

  let codingOptionTitle: string = value?.display ?? "";;
  // $: codingOptionTitle = 
  let codingOptions: Coding[] | undefined = defaultOptions;

  let prevValue = "";
  $: {
    if (value) {
      let newValue = value?.display ?? "";
      if (prevValue !== newValue) {
        codingOptionTitle = newValue;
      }
      prevValue = newValue;
    }
  }

  $: {
    if (codingOptionTitle) {
      fetchCode(codingOptionTitle);
    }
  }

onMount(() => {
  updateMenuPosition();
  window.addEventListener('resize', updateMenuPosition);
  window.addEventListener('scroll', updateMenuPosition, true);
  document.addEventListener('click', handleOutsideClick);
});
onDestroy(() => {
  window.removeEventListener('resize', updateMenuPosition);
  window.removeEventListener('scroll', updateMenuPosition, true);
  document.removeEventListener('click', handleOutsideClick);
})
let toggleRef: HTMLDivElement | undefined = undefined;
let menuStyle = '';
function handleOutsideClick(event: any) {
  if (toggleRef && !toggleRef.contains(event.target)) {
    isOpen = false;
  }
}

function updateMenuPosition() {
  if (!toggleRef) return;
  const rect = toggleRef.getBoundingClientRect();
  if (!rect) return;
  menuStyle = `
    position: absolute;
    top: ${rect.bottom + window.scrollY}px;
    left: ${rect.left + window.scrollX}px;
    width: ${rect.width}px;
    z-index: 2000;
  `;
}

  function setValue(v: Coding) {
    value = v;
  }

  let controller: AbortController | undefined = undefined;
  async function fetchCode(input: string) {
    processing = true;
    if (controller) {
      controller.abort();
    }

    if (input?.trim() === "") {
      codingOptions = defaultOptions;
      processing = false;
      return defaultOptions;
    }

    controller = new AbortController();
    const { signal } = controller;

    let url = `https://tx.fhir.org/r4/ValueSet/$expand?url=http://terminology.hl7.org/ValueSet/v2-0006&_format=json&count=15&filter=${input}`;

    return fetch(url, {
      signal,
      method: "GET"
    }).then((response) => {
      if (response.ok) {
        return response.text();
      } else {
        Promise.reject(response);
      }
    }).then((text) => {
      if (!text || text === "") {
        return defaultOptions;
      }
      return JSON.parse(text);
    }).then((content) => {
      if (content === null) {
        return defaultOptions;
      }
      codingOptions = content.expansion.contains.filter((c: Coding) => c.code !== "VAR");
      codingOptions?.push(defaultOptions[0]);
      updateMenuPosition();
      processing = false;
      return codingOptions;
    }).catch((e) => {
      if (e.name === "AbortError") {
        return Promise.resolve(defaultOptions);
      } else {
        processing = false
        return e;
      }
    })
  }
</script>

<FormGroup style="font-size:small; margin-bottom: 0 !important" class="text-secondary">
  <Dropdown {isOpen} toggle={() => (isOpen = true)}>
    <DropdownToggle
      tag="div"
      class="d-inline-block"
      style="width:250px">
      <div style="position:relative" bind:this={toggleRef}>
        <Input
          title="Search for a Religion"
          type="text"
          placeholder={`Search religions...`}
          style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          bind:value={codingOptionTitle}
          on:input={(event) => {
            isOpen = true;
            if (event.target.value.length > 2 || event.target.value.length === 0) {
              fetchCode(event.target.value);
            }
          }} />
        {#if processing}
          <Spinner type="border" size="sm" color="secondary"
            style="position: absolute;
            cursor: pointer;
            top: 10px;
            right: 10px;
            color: rgb(50, 50, 50);"/>
        {:else}
          <Icon name={icon}
            style="position: absolute;
            height: 25px;
            width: 15px;
            top: 8px;
            right: 10px;
            color: rgb(50, 50, 50);"/>
        {/if}
      </div>
    </DropdownToggle>
    <Portal>
      <DropdownMenu style={`max-height: 250px; overflow:scroll; ${menuStyle}`}>
        {#if codingOptions}
          {#if codingOptions.length === 0}
            Empty
          {:else}
            {#each codingOptions as codingOption}
              {#if codingOptions.length > 1 && (codingOption.code === "VAR")}
                <DropdownItem divider />
              {/if}
              <DropdownItem
                disabled={processing}
                style="overflow:hidden; text-overflow:ellipsis"
                title={codingOption.display}
                on:click={() => {
                  isOpen = false;
                  setValue(codingOption);
                }}>
                {codingOption.display}
              </DropdownItem>
            {/each}
          {/if}
        {/if}
      </DropdownMenu>
    </Portal>
  </Dropdown>
  <Label class="mb-0 mx-1">{value?.display ? `Using "${value.display}"` : ''}</Label>
</FormGroup>