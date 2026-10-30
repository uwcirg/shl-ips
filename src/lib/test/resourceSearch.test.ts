import { describe, it, expect } from 'vitest';
import type { CategorizedResource } from '$lib/stores/categorizedResources';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { getResourceDateSpan, getSearchText } from '$lib/utils/resourceSearch';

const item = (resource: any): CategorizedResource =>
  ({ source: 'src', rh: new ResourceHelper(resource), renderInfo: { mode: 'raw' } });

describe('getSearchText', () => {
  it('collects coding displays, codes and values, lowercased, without structural keys', () => {
    const text = getSearchText(item({
      resourceType: 'Condition',
      id: 'abc123',
      text: { status: 'generated', div: '<div>narrative only</div>' },
      code: { text: 'Essential Hypertension', coding: [{ system: 'http://example.com/sys', code: 'I10', display: 'HTN' }] }
    }));
    expect(text).toContain('essential hypertension');
    expect(text).toContain('htn');
    expect(text).toContain('i10');
    expect(text).not.toContain('abc123');
    expect(text).not.toContain('example.com');
    expect(text).not.toContain('narrative only');
  });
});

describe('getResourceDateSpan', () => {
  it('spans a year-precision date over the whole year', () => {
    const span = getResourceDateSpan({ resourceType: 'Condition', onsetDateTime: '2020' } as any)!;
    expect(new Date(span.start).getFullYear()).toBe(2020);
    expect(new Date(span.end).getFullYear()).toBe(2020);
    expect(new Date(span.end).getMonth()).toBe(11);
  });

  it('leaves a missing period end open', () => {
    const span = getResourceDateSpan({ resourceType: 'Encounter', period: { start: '2020-01-01' } } as any)!;
    expect(span.end).toBe(Infinity);
  });

  it('returns undefined for undated types', () => {
    expect(getResourceDateSpan({ resourceType: 'Medication', code: { text: 'x' } } as any)).toBeUndefined();
  });
});
