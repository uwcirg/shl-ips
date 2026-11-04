<script context="module" lang="ts">
  /***
  A badge for a resource's status, shown only when the status is worth noticing. The usual,
  current state ("active") says nothing the reader doesn't assume, so it gets no badge; a status
  that means the resource should be read differently does (stopped, inactive, cancelled,
  entered-in-error, ...).

    <StatusBadge status={resource.status} />
    <StatusBadge status={code} usual={CLINICAL_STATUS_NORMAL} />
  ***/
  export interface StatusBadgeInfo {
    text: string;
    color: 'secondary' | 'danger';
  }

  // Statuses meaning the resource is current and as expected
  export const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'confirmed']);
  // Resources whose status vocabulary has other "all is well" values
  export const GENERIC_STATUSES: ReadonlySet<string> = new Set(['active', 'confirmed', 'current', 'final', 'completed', 'finished']);

  // Statuses that say nothing either way
  const UNINFORMATIVE = new Set(['unknown']);
  // Statuses that mean the resource should not be relied on at all
  const UNRELIABLE = new Set(['entered-in-error', 'refuted', 'rejected']);

  // The badge for a status, or undefined when it is one of the `usual` statuses (or says nothing)
  export function statusBadge(status: string | undefined, usual: ReadonlySet<string> = ACTIVE_STATUSES): StatusBadgeInfo | undefined {
    const normalized = status?.trim().toLowerCase();
    if (!status || !normalized || usual.has(normalized) || UNINFORMATIVE.has(normalized)) return undefined;
    return { text: status, color: UNRELIABLE.has(normalized) ? 'danger' : 'secondary' };
  }

  // One badge for several statuses shown together (e.g. "inactive / refuted"); only the notable
  // ones are included, and it is red if any of them is
  export function combineStatusBadges(badges: Array<StatusBadgeInfo | undefined>): StatusBadgeInfo | undefined {
    const notable = badges.filter((badge): badge is StatusBadgeInfo => !!badge);
    if (notable.length === 0) return undefined;
    return {
      text: notable.map((badge) => badge.text).join(' / '),
      color: notable.some((badge) => badge.color === 'danger') ? 'danger' : 'secondary'
    };
  }
</script>

<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';

  export let status: string | undefined = undefined;
  // The statuses that need no badge; defaults to just "active"
  export let usual: ReadonlySet<string> = ACTIVE_STATUSES;
  // Further statuses shown in the same badge (e.g. a verification status beside a clinical one)
  export let additional: Array<{ status: string | undefined; usual?: ReadonlySet<string> }> = [];
  // Add a line break after the badge, when it is shown
  export let br = false;
  // Whether a badge is showing, for a parent that lays out around it (bind:visible)
  export let visible = false;
  let className = '';
  export { className as class };

  $: badge = combineStatusBadges([
    statusBadge(status, usual),
    ...additional.map((other) => statusBadge(other.status, other.usual))
  ]);
  $: visible = !!badge;
</script>

{#if badge}
  <Badge color={badge.color} class={className}>{badge.text}</Badge>{#if br}<br>{/if}
{/if}
