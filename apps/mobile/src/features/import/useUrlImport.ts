import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  extractRecipeFromHtml,
  type ScrapedRecipe,
} from '@whats-for-dinner/domain';

import type { MealFormState } from '../meals/useMealForm';

export type UrlImportPhase = 'input' | 'fetching' | 'review' | 'done';

export interface UrlImportResult {
  mealName: string;
  sourceHost: string;
}

export interface UseUrlImportReturn {
  phase: UrlImportPhase;
  scraped: ScrapedRecipe | null;
  error: string | null;
  result: UrlImportResult | null;

  /** Fetch + extract recipe data from the given URL. */
  fetchRecipe: (url: string) => Promise<void>;

  /** Mark the import as complete (called by the screen after a successful save). */
  markDone: (mealName: string, sourceHost: string) => void;

  /** Record an error from the save attempt (called by the screen on save failure). */
  markSaveError: (message: string) => void;

  /** Reset back to input phase. */
  reset: () => void;
}

function normalizeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Converts a ScrapedRecipe into a MealFormState suitable for useMealForm.seedFromDraft().
 */
export function scrapedToFormState(recipe: ScrapedRecipe): MealFormState {
  return {
    name: recipe.name,
    notes: recipe.notes ?? '',
    prepMinutes: recipe.prepMinutes != null ? String(recipe.prepMinutes) : '',
    isFavorite: false,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantityText: ing.quantityText ?? '',
            isOptional: false,
          }))
        : [{ name: '', quantityText: '', isOptional: false }],
    tags: [...recipe.tags],
  };
}

export function useUrlImport(): UseUrlImportReturn {
  const [phase, setPhase] = useState<UrlImportPhase>('input');
  const [scraped, setScraped] = useState<ScrapedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UrlImportResult | null>(null);

  const fetchRecipe = useCallback(async (rawUrl: string) => {
    // Web browsers cannot fetch arbitrary recipe sites due to CORS.
    if (Platform.OS === 'web') {
      setError(
        'URL import is not available on web due to browser security restrictions (CORS). ' +
          'Use this feature on a mobile device, or import via JSON file instead.',
      );
      return;
    }

    const url = normalizeInputUrl(rawUrl);

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com/recipe).');
      return;
    }

    setPhase('fetching');
    setError(null);
    setScraped(null);
    setResult(null);

    try {
      const response = await fetch(url, {
        headers: {
          // Many recipe sites serve stripped-down or bot-blocked pages when
          // the request lacks a browser-like User-Agent. This UA string
          // mimics a standard Android Chrome browser so the site returns the
          // full HTML with JSON-LD recipe markup intact.
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(
          'That URL didn\'t return an HTML page. Make sure it points to a recipe page.',
        );
      }

      // Use the final URL after any redirects so sourceUrl/sourceHost reflect
      // the canonical location rather than a shortened or tracking link.
      const finalUrl = response.url || url;

      const html = await response.text();
      const recipe = extractRecipeFromHtml(html, finalUrl);

      if (!recipe) {
        throw new Error(
          'No recipe data found on that page. The site may not include structured recipe markup (JSON-LD).',
        );
      }

      setScraped(recipe);
      setPhase('review');
    } catch (err) {
      const message =
        err instanceof TypeError && /network|fetch|abort/i.test(err.message)
          ? 'Could not reach that URL. Check your connection and the address.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong fetching that recipe.';
      setError(message);
      setPhase('input');
    }
  }, []);

  const markDone = useCallback((mealName: string, sourceHost: string) => {
    setResult({ mealName, sourceHost });
    setError(null);
    setPhase('done');
  }, []);

  const markSaveError = useCallback((message: string) => {
    setError(message);
    // Stay on review phase so the user can retry
  }, []);

  const reset = useCallback(() => {
    setPhase('input');
    setScraped(null);
    setError(null);
    setResult(null);
  }, []);

  return { phase, scraped, error, result, fetchRecipe, markDone, markSaveError, reset };
}
