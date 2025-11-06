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
  } from 'sveltestrap';
  import { getContext } from 'svelte';
  import type { IAuthService, IOResponse, NIOAutoCoderResponse } from '$lib/utils/types';
  import { onDestroy, onMount } from 'svelte';

  export let mode: "Occupation" | "Industry";
  export let value: IOResponse;

  let authService: IAuthService = getContext('authService');

  let defaults: NIOAutoCoderResponse = {
    Industry: [{
      Code: "000000",
      Title: "Not Coded – Industry",
      Score: 1
    }],
    Occupation: [{
      Code: "00-0000",
      Title: "Not Coded – Occupation",
      Score: 1
    }],
    Scheme: "NAICS 2017 and SOC 2018"
  };

  let isOpen = false;
  $: icon = 'search';
  let processing = false;

  let codingOptionTitle: string = "";
  value = defaults[mode][0];
  let codingOptions: NIOAutoCoderResponse | undefined = defaults;

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

  function setValue(v: IOResponse) {
    value = v;
    codingOptionTitle = v.Title;
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

    let api = `/api/nio-autocoder`;
    let url = `${api}?${mode === "Occupation" ? "o" : "i"}=${input}`;

    return authService.getAccessToken().then((token: string) => fetch(url, {
      signal,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })).then((response) => {
      if (response.ok) {
        return response.text();
      } else {
        Promise.reject(response);
      }
    }).then((text) => {
      if (!text || text === "") {
        return defaults;
      }
      return JSON.parse(text);
    }).then((content) => {
      if (content === null) {
        return defaults;
      }
      content[mode] = content[mode].filter((v: NIOAutoCoderResponse) => v.Code !== "000000" && v.Code !== "00-0000");
      content[mode].push(defaults[mode][0]);
      codingOptions = content;
      updateMenuPosition();
      processing = false;
      return content;
    }).catch((e) => {
      if (e.name === "AbortError") {
        return Promise.resolve(defaults);
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
      style="width:100%">
      <div style="position:relative" bind:this={toggleRef}>
        <Input
          title="Search for an {mode.toLowerCase()}"
          type="text"
          placeholder={`Search ${mode.toLowerCase()}...`}
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
      <DropdownMenu style={`max-height: 250px; overflow:scroll ${menuStyle}`}>
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
  <Label class="mb-0 mx-1">{`Using "${value.Title}"`}</Label>
</FormGroup>