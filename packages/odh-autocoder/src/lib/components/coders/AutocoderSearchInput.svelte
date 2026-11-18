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
  import type { CodingMode, IOResponse } from '../../types.js';
  import {
    getAutocoderClient,
    isNotCoded,
    notCoded,
    withoutNotCoded,
    type AutocoderClient
  } from '../../autocoder/client.js';

  // Field coder: codes one field (occupation or industry) as the user types, and they pick a
  // suggestion from a list. value stays undefined until they pick one (saved as not coded).

  export let mode: CodingMode;
  export let value: IOResponse | undefined;
  export let id: string = "";
  /** Defaults to the client from context (see setAutocoderClient) */
  export let client: AutocoderClient = getAutocoderClient();

  let fetchError: string = '';
  let manual = false;

  $: notCodedValue = notCoded(mode);

  let isOpen = false;
  let processing = false;

  let inputValue = value?.Title ?? "";
  let codingOptionTitle: string;
  $: codingOptionTitle = inputValue;

  $: if (value === undefined) {
    fetchError = "";
    inputValue = "";
  }

  $: if (value && codingOptionTitle === "") {
    codingOptionTitle = isNotCoded(value) ? "" : value.Title;
  }
  let codingOptions: IOResponse[] = [notCoded(mode)];

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

  function setValue(v: IOResponse | undefined) {
    value = v;
    codingOptionTitle = v?.Title ?? "";
    if (v && !manual) {
      inputValue = v.Title;
    }
  }

  function selectInputText() {
    (document.getElementById(id) as HTMLInputElement | null)?.select();
  }

  let controller: AbortController | undefined = undefined;
  async function fetchCode(input: string) {
    processing = true;
    controller?.abort();

    if (input.trim() === "") {
      codingOptions = [notCoded(mode)];
      processing = false;
      return;
    }

    controller = new AbortController();
    const query = mode === "Occupation" ? { occupation: input } : { industry: input };
    try {
      const content = await client.code(query, { signal: controller.signal });
      codingOptions = [...withoutNotCoded(content[mode]), notCoded(mode)];
      updateMenuPosition();
      manual = false;
      processing = false;
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return;
      }
      processing = false;
      manual = true;
      codingOptions = [notCoded(mode)];
      fetchError = 'Coding service unavailable. Please enter ' + mode.toLowerCase() + ' manually.';
      // Keep the user's text, under this field's not-coded code
      setValue({
        Code: notCodedValue.Code,
        Title: codingOptionTitle || notCodedValue.Title,
        Score: 1
      });
      isOpen = false;
    }
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
              setValue(undefined);
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
          <Icon name="search"
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
        {#each codingOptions as codingOption}
          {#if codingOptions.length > 1 && isNotCoded(codingOption)}
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
      </DropdownMenu>
    </Portal>
  </Dropdown>
  {#if fetchError}
    <span class="mb-0 mx-1 text-danger">{fetchError}</span><br>
  {/if}
  <Label class="mb-0 mx-1">{`Using "${value?.Title ?? notCodedValue.Title}"`}</Label>
</FormGroup>
