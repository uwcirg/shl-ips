<script lang="ts">
  import {
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Input,
    Icon
  } from 'sveltestrap';
  import AuthService from '$lib/utils/AuthService';

  export let mode: "Occupation" | "Industry";
  export let value: IOResponse;

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

  interface IOResponse {
    Code: string;
    Title: string;
    Score: number;
  }
  interface NIOAutoCoderResponse {
    Industry: IOResponse[];
    Occupation: IOResponse[];
    Scheme: string;
  }
  let codingOptionTitle: string = "";
  value = defaults[mode][0];
  let codingOptions: NIOAutoCoderResponse | undefined = defaults;

  function setValue(v: IOResponse) {
    value = v;
    codingOptionTitle = v.Title;
  }

  let controller: AbortController |undefined = undefined;
  function fetchCode(input: string) {
    if (controller) {
      controller.abort();
    }

    controller = new AbortController();
    const { signal } = controller;

    let api = `/api/nio-autocoder`;
    let url = `${api}?${mode === "Occupation" ? "o" : "i"}=${input}`;

    return fetch(url, {
      signal,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AuthService.Instance.getAccessToken()}`
      }
    }).then((response) => {
      if (response.ok) {
        return response.text();
      } else {
        Promise.reject(response);
      }
    }).then((text) => {
      if (text === "") {
        return defaults;
      }
      return JSON.parse(text);
    }).then((content) => {
      codingOptions = content;
      return content;
    }).catch((e) => {
      if (e.name === "AbortError") {
        return Promise.resolve(defaults);
      } else {
        return e;
      }
    })
  }
</script>

<Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
    <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
      <div style="position:relative">
        <Input
          type="text"
          style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          bind:value={codingOptionTitle}
          on:input={() => {
            fetchCode(codingOptionTitle);
          }} />
        <Icon name={icon}
          style="position: absolute;
          cursor: pointer;
          height: 25px;
          width: 20px;
          top: 6px;
          right: 10px;
          color: rgb(50, 50, 50);"/>
      </div>
    </DropdownToggle>
    <DropdownMenu style="max-height: 400px; width:100%; overflow:hidden">
      {#if codingOptions}
        {#if codingOptions[mode].length === 0}
          Empty
        {:else}
          {#each codingOptions[mode] as codingOption}
            <DropdownItem style="overflow:elipsis" on:click={() => {
              setValue(codingOption);
            }}>
              {codingOption.Title}
            </DropdownItem>
          {/each}
        {/if}
      {/if}
    </DropdownMenu>
  </Dropdown>