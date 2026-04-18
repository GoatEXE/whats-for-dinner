import type { UnknownInputParams, UnknownOutputParams } from 'expo-router';
import type { ShareIntent } from 'expo-share-intent';

export type UrlImportShareParams = UnknownInputParams & {
  shareToken?: string;
  sharedUrl?: string;
  sharedText?: string;
  sharedTitle?: string;
};

export type UrlImportShareParamInput = UnknownOutputParams & {
  shareToken?: string | string[];
  sharedUrl?: string | string[];
  sharedText?: string | string[];
  sharedTitle?: string | string[];
};

export interface ResolvedUrlImportShare {
  shareToken: string;
  sharedUrl: string | null;
  sharedText: string | null;
  sharedTitle: string | null;
}

function normalizeSharedUrl(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const sanitized = raw.trim().replace(/[)\],.!?:;]+$/, '');
  if (!sanitized) {
    return null;
  }

  try {
    const url = new URL(sanitized);
    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function extractHttpUrlFromText(text: string | null | undefined) {
  if (!text) {
    return null;
  }

  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];

  for (const match of matches) {
    const normalized = normalizeSharedUrl(match);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function buildShareToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSharedRecipeUrl(
  shareIntent: Pick<ShareIntent, 'webUrl' | 'text'>,
) {
  return (
    normalizeSharedUrl(shareIntent.webUrl) ??
    extractHttpUrlFromText(shareIntent.text)
  );
}

export function buildUrlImportShareParamsFromIntent(
  shareIntent: Pick<ShareIntent, 'webUrl' | 'text' | 'meta'>,
): UrlImportShareParams | null {
  const sharedUrl = getSharedRecipeUrl(shareIntent);
  const sharedText = shareIntent.text?.trim() || null;
  const sharedTitle = shareIntent.meta?.title?.trim() || null;

  if (!sharedUrl && !sharedText) {
    return null;
  }

  return {
    shareToken: buildShareToken(),
    sharedUrl: sharedUrl ?? undefined,
    sharedText: sharedText ?? undefined,
    sharedTitle: sharedTitle ?? undefined,
  };
}

export function readShareParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim()) ?? null;
  }

  return value?.trim() || null;
}

export function resolveUrlImportShareParams(
  params: UrlImportShareParamInput,
): ResolvedUrlImportShare | null {
  const shareToken = readShareParam(params.shareToken);
  if (!shareToken) {
    return null;
  }

  const sharedText = readShareParam(params.sharedText);
  const sharedTitle = readShareParam(params.sharedTitle);
  const sharedUrl =
    normalizeSharedUrl(readShareParam(params.sharedUrl)) ??
    extractHttpUrlFromText(sharedText);

  return {
    shareToken,
    sharedUrl,
    sharedText,
    sharedTitle,
  };
}
