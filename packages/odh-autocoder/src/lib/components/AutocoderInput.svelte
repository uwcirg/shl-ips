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
  import { onDestroy, onMount } from 'svelte';
  import { NOT_CODED, type AutocoderResponse, type CodingMode, type IOResponse } from '../types.js';
  import { copyOf } from '../fhir/values.js';

  export let mode: CodingMode;
  export let value: IOResponse | undefined;
  export let id: string = "";
  /** The app's autocoder endpoint (see createAutocoderHandler in odh-autocoder/server) */
  export let endpoint: string = '/api/nio-autocoder';
  /** When set, requests carry an Authorization: Bearer header with the token it returns */
  export let getAccessToken: (() => Promise<string | undefined>) | undefined = undefined;

  let fetchError: string = '';
  let manual = false;

  let defaults: AutocoderResponse = copyOf(NOT_CODED);

  let isOpen = false;
  $: icon = 'search';
  let processing = false;

  let inputValue = "";
  let codingOptionTitle: string;
  $: codingOptionTitle = inputValue;

  $: if (value === undefined) {
    fetchError = "";
    inputValue = "";
  }

  $: if (value && codingOptionTitle === "") {
    if (value.Title === defaults[mode][0].Title) {
      codingOptionTitle = "";
    } else {
      codingOptionTitle = value.Title;
    }
  }
  let codingOptions: AutocoderResponse | undefined = defaults;

  onMount(() => {
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('click', handleOutsideClick);
    inputValue = value?.Title ?? "";
    value = value ?? defaults[mode][0];
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

  function setValue(v: IOResponse) {
    value = v;
    codingOptionTitle = v.Title;
    if (!manual) {
      inputValue = v.Title;
    }
  }

  function selectInputText() {
    (document.getElementById(id) as HTMLInputElement | null)?.select();
  }

  function requestHeaders(token: string | undefined): Record<string, string> {
    return getAccessToken ? { "Authorization": `Bearer ${token}` } : {};
  }

  let controller: AbortController | undefined = undefined;
  async function fetchCode(input: string) {
    processing = true;
    if (controller) {
      controller.abort();
    }

    if (input.trim() === "") {
      codingOptions = defaults;
      processing = false;
      return defaults;
    }

    controller = new AbortController();
    const { signal } = controller;

    let url = `${endpoint}?${mode === "Occupation" ? "o" : "i"}=${encodeURIComponent(input)}&c=0`;

    const token = getAccessToken ? getAccessToken() : Promise.resolve(undefined);
    return token.then((token) => fetch(url, {
      signal,
      method: "GET",
      headers: requestHeaders(token)
    })).then(async (response) => {
      if (response.ok) {
        return response.text();
      } else {
        const body = response.text();
        throw new Error(response.status + " " + await body);
      }
    }).then((text) => {
      if (!text || text === "") {
        return defaults;
      }
      return JSON.parse(text);
    }).then((content) => {
      if (!content) {
        return defaults;
      }
      content[mode] = content[mode].filter((v: IOResponse) => v.Code !== "000000" && v.Code !== "00-0000");
      content[mode].push(defaults[mode][0]);
      codingOptions = content;
      updateMenuPosition();
      manual = false;
      processing = false;
      return content;
    }).catch((e) => {
      if (e.name === "AbortError") {
        return Promise.resolve(defaults);
      } else {
        processing = false;
        manual = true;
        codingOptions = defaults;
        fetchError = 'Coding service unavailable. Please enter ' + mode.toLowerCase() + ' manually.';
        // Keep the user's text, under this field's not-coded code
        setValue({
          Code: defaults[mode][0].Code,
          Title: codingOptionTitle ?? defaults[mode][0].Title,
          Score: 1
        });
        isOpen = false;
        return Promise.resolve(codingOptions);
      }
    })
  }
</script>

<FormGroup style="font-size:small; margin-bottom: 0 !important" class="text-secondary">
  <Dropdown {isOpen} toggle={() => (isOpen = !manual && true)}>
    <DropdownToggle
      tag="div"
      class="d-inline-block"
      style="width:100%"
    >
      <div style="position:relative" bind:this={toggleRef}>
        <Input
          id={id}
          title="Search for an {mode.toLowerCase()}"
          type="text"
          placeholder={`Search ${mode.toLowerCase()}...`}
          style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          bind:value={inputValue}
          on:input={() => {
            isOpen = !manual && true;
            fetchCode(inputValue);
            if (!isOpen && inputValue.length === 0) {
              setValue(defaults[mode][0]);
            }
          }}
          on:focus={() => {
            selectInputText();
            if (inputValue) {
              fetchCode(inputValue);
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
      <DropdownMenu style={`${menuStyle}`}>
        {#if codingOptions}
          {#if codingOptions[mode].length === 0}
            Empty
          {:else}
            {#each codingOptions[mode] as codingOption, index}
              {#if codingOptions[mode].length > 1 && (codingOption.Code === "000000" || codingOption.Code === "00-0000")}
                <DropdownItem divider />
              {/if}
              <DropdownItem
                disabled={processing}
                style="overflow:hidden; text-overflow:ellipsis"
                title={codingOption.Title}
                on:click={() => {
                  isOpen = false;
                  setValue(codingOption);
                }}>
                {codingOption.Title}
              </DropdownItem>
            {/each}
          {/if}
        {/if}
      </DropdownMenu>
    </Portal>
  </Dropdown>
  {#if fetchError}
    <span class="mb-0 mx-1 text-danger">{fetchError}</span><br>
  {/if}
  <Label class="mb-0 mx-1">{`Using "${value?.Title ?? defaults[mode][0].Title}"`}</Label>
</FormGroup>
