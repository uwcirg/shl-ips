<script lang="ts">
    import {
      Button,
      Icon
    } from 'sveltestrap';

    let copyNotice = '';
  
    export let href: string;
  
    async function copyShl() {
        let copyNoticePrev = copyNotice;
        copyNotice = '...';
        let text = href;
        navigator.clipboard.writeText(text);
        copyNotice = 'Copied!';
        setTimeout(() => {
            copyNotice = copyNoticePrev;
        }, 8000);
    }
</script>
{#if copyNotice}
    <Button size="lg" color="secondary" class="p-3" disabled>
        <Icon name="clipboard" />
        {copyNotice}
    </Button>
{:else}
    <Button size="lg" color="primary" class="p-3" on:click={copyShl}>
        <Icon name="clipboard" />
        Click here to copy a link to your Report
    </Button>
{/if}
