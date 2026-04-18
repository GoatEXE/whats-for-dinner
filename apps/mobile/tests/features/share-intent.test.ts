import { describe, expect, it } from 'vitest';

import {
  buildUrlImportShareParamsFromIntent,
  getSharedRecipeUrl,
  resolveUrlImportShareParams,
} from '@/features/share-intent/share-intent';

describe('getSharedRecipeUrl', () => {
  it('normalizes a direct shared web URL', () => {
    expect(
      getSharedRecipeUrl({
        webUrl: ' https://example.com/recipes/chili) ',
        text: 'ignored',
      }),
    ).toBe('https://example.com/recipes/chili');
  });

  it('falls back to the first http URL found in shared text', () => {
    expect(
      getSharedRecipeUrl({
        webUrl: null,
        text: 'Dinner idea: https://example.com/recipes/tacos! Save this one.',
      }),
    ).toBe('https://example.com/recipes/tacos');
  });
});

describe('resolveUrlImportShareParams', () => {
  it('returns null when no share token is present', () => {
    expect(
      resolveUrlImportShareParams({
        sharedUrl: 'https://example.com/recipes/pasta',
      }),
    ).toBeNull();
  });

  it('uses the shared text as a fallback source for the recipe URL', () => {
    expect(
      resolveUrlImportShareParams({
        shareToken: 'share-123',
        sharedUrl: 'not-a-url',
        sharedText: 'Try this https://example.com/recipes/soup.',
        sharedTitle: 'Soup',
      }),
    ).toEqual({
      shareToken: 'share-123',
      sharedUrl: 'https://example.com/recipes/soup',
      sharedText: 'Try this https://example.com/recipes/soup.',
      sharedTitle: 'Soup',
    });
  });
});

describe('buildUrlImportShareParamsFromIntent', () => {
  it('builds routable params when share content includes recipe text', () => {
    const params = buildUrlImportShareParamsFromIntent({
      webUrl: null,
      text: 'Make this next: https://example.com/recipes/curry',
      meta: { title: 'Curry night' },
    });

    expect(params).toMatchObject({
      sharedUrl: 'https://example.com/recipes/curry',
      sharedText: 'Make this next: https://example.com/recipes/curry',
      sharedTitle: 'Curry night',
    });
    expect(params?.shareToken).toMatch(/^\d+-[a-z0-9]+$/);
  });
});
