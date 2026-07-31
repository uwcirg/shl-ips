<script lang="ts">
  import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    Carousel,
    CarouselControl,
    CarouselItem,
    CarouselIndicators,
    CardBody,
    Col,
    Icon,
    Row } from '@sveltestrap/sveltestrap';
  import { getContext } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { IAuthService } from '$lib/utils/types';
  import { previewRecords, previewNotes, previewShare } from '$lib/components/landing-previews';
  import type { FHIRDataService } from '$lib/utils/FHIRDataService';

  let authService: IAuthService = getContext('authService');
  let authenticated = authService.authenticated;
  let user = authService.user;
  
  let fhirDataService: FHIRDataService = getContext('fhirDataService');

  function checkAuth() {
    if (!get(authService.authenticated)) {
      authService.login();
    }
  }

  function myData() {
    checkAuth();
    goto('/data');
  }

  function mySummaries() {
    checkAuth();
    goto('/summaries');
  }

  const items = [
    {
      icon: previewRecords(),
      heading: 'All your records, in one place',
      caption: 'Connect your clinics to see your whole medical record, together.'
    },
    {
      icon: previewNotes(),
      heading: 'Tell your health story',
      caption: 'Record and share your care preferences, notes, and any records your clinics are missing.'
    },
    {
      icon: previewShare(),
      heading: 'Share on your terms',
      caption: 'Share a summary of your health data by QR code or secure link, require a passcode, and turn off access any time.'
    }
  ];
  let activeIndex = 0;

  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;

  function nextIndex(direction: 'next' | 'prev') {
    if (direction === 'next') {
      return activeIndex === items.length - 1 ? activeIndex : activeIndex + 1;
    }
    return activeIndex === 0 ? 0 : activeIndex - 1;
  }

  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    dragDeltaX = e.clientX - dragStartX;
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;

    const swipeThreshold = 50;
    if (dragDeltaX < -swipeThreshold) {
      activeIndex = nextIndex('next');
    } else if (dragDeltaX > swipeThreshold) {
      activeIndex = nextIndex('prev');
    }
    dragDeltaX = 0;
  }
</script>

<Row class="my-0 d-flex justify-content-center">
<Col class="col-sm-12 col-md-8">
  <div class="subtitle-text centered-text d-flex flex-column flex-sm-row justify-content-center align-items-center">
    A service from the Washington State Department of Health
  </div>
</Col>
</Row>

{#if $authenticated}
<Row class="d-flex justify-content-center m-3 mt-5 ">
  <h2 class="text-primary">Welcome, {get(fhirDataService.demographics)?.firstName ?? $user.profile.given_name ?? $user.profile.preferred_username}.</h2>
  <p class="text-primary">You're ready to gather, organize, and securely share your health information. Click below to start your Health Summary.</p>
</Row>
<Row class="d-flex justify-content-center m-3">
  <Col class="col-sm-12 col-md-8 col-lg-6">
    <Button
      size="lg" 
      class="bg-white border-0 text-primary w-100 text-nowrap justify-content-center"
      on:click={() => myData()}
      >Get started</Button
    >
  </Col>
</Row>
{/if}

<Row class="m-2 d-flex justify-content-center">
  <div class="carousel-gradient-wrapper">
    <Carousel {items} bind:activeIndex>
      <CarouselIndicators bind:activeIndex {items} />
      <div
        class="carousel-inner"
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
      >
        {#each items as item, index}
          <CarouselItem
            bind:activeIndex
            itemIndex={index}
            interval="100"
            style="transform: translateX(calc({(index - activeIndex) * 100}% + {dragDeltaX}px)); transition: {isDragging ? 'none' : 'transform 0.6s ease-in-out'}"
          >
            <div class="carousel-slide">
              <div class="carousel-slide-icon" style="user-select: none">
                {@html item.icon}
              </div>
              <h3 class="carousel-slide-title">{item.heading}</h3>
              <p class="carousel-slide-caption mb-5">{item.caption}</p>
            </div>
          </CarouselItem>
        {/each}
      </div>
      {#if activeIndex !== 0}
        <CarouselControl direction="prev" bind:activeIndex {items} />
      {/if}
      {#if activeIndex !== items.length - 1}
        <CarouselControl direction="next" bind:activeIndex {items} />
      {/if}
    </Carousel>
  </div>
</Row>

{#if !$authenticated}
<Row class="my-1 d-flex justify-content-center">
  <Col class="col-sm-12 col-md-8 col-lg-6">
    <Button class="w-100 border-0 bg-white text-primary" size="lg" on:click={() => checkAuth()}>
      Sign In
    </Button>
  </Col>
</Row>
{/if}
{#if !$authenticated}
  <Row class="d-flex justify-content-center my-3">
    <span class="text-white centered-text">New here? <a href="/register" class="text-white">Create an account</a></span>
  </Row>
{/if}

<Row class="d-flex justify-content-center align-items-center my-3">
  <div class="centered-text"><Icon name="lock" class="text-light"/> <span class="text-light centered-text">Your data is private — you choose when to share it with those you trust. <a href="/info" class="text-light">More Information</a></span></div>
</Row>

<style>
  .subtitle-text {
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 1rem;
  }
  .centered-text {
    text-align: center;
  }
  .carousel-inner {
    position: relative;
    overflow: hidden;
    min-height: 420px;
    touch-action: pan-y;
    cursor: grab;
  }

  :global(.carousel-item) {
    display: block !important;
    position: absolute !important;
    top: 0;
    left: 0;
    float: none;
    width: 100%;
    max-width: 100%;
    margin-right: 0;
  }

  .carousel-gradient-wrapper {
    width: 100%;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .carousel-slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 320px;
    padding: 2.5rem 1.5rem 3rem;
    background: transparent;
    color: #fff;
  }

  .carousel-slide-icon {
    display: flex;
    color: #fff;
    margin-bottom: 1rem;
  }

  .carousel-slide-title {
    font-weight: 600;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    user-select: none;
  }

  .carousel-slide-caption {
    max-width: 320px;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    user-select: none;
  }

  :root{
    --blue:#1E5AA8; --blue-2:#16467F; --blue-ink:#123A66;
    --ink:#12212E; --muted:#5B6B7C; --line:#DCE3EA;
    --summary:#1E5AA8;
    --t-blue-soft:#E4EEFA; --t-gold:#7A5B00; --t-gold-soft:#FBF0CE;
    --t-lime:#3E5E14; --t-lime-soft:#E9F3D6;
    --t-magenta:#8A2A6B; --t-magenta-soft:#F9E4F1;
  }
  :global(.it) {background:#EEF3F8;color:#12212E;}
  :global(.it.blue) {background:#E4EEFA;color:#1E5AA8;}
  :global(.it.good) {background:#E9F3D6;color:#3E5E14;}
  :global(.it.magenta) {background:#F9E4F1;color:#8A2A6B;
  }
</style>
