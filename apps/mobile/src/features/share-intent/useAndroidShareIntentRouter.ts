import Constants, { ExecutionEnvironment } from 'expo-constants';
import { usePathname, useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { buildUrlImportShareParamsFromIntent } from './share-intent';

const URL_IMPORT_PATH = '/(tabs)/meals/url-import' as const;

export function useAndroidShareIntentRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const handledPayloadRef = useRef<string | null>(null);

  const shareIntentEnabled =
    Platform.OS === 'android' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: !shareIntentEnabled,
    resetOnBackground: false,
  });

  useEffect(() => {
    if (!hasShareIntent) {
      handledPayloadRef.current = null;
    }
  }, [hasShareIntent]);

  useEffect(() => {
    if (!shareIntentEnabled || !hasShareIntent) {
      return;
    }

    const payloadKey = JSON.stringify([
      shareIntent.webUrl ?? '',
      shareIntent.text ?? '',
      shareIntent.meta?.title ?? '',
    ]);

    if (payloadKey === handledPayloadRef.current) {
      return;
    }
    handledPayloadRef.current = payloadKey;

    const params = buildUrlImportShareParamsFromIntent(shareIntent);
    if (!params) {
      resetShareIntent();
      return;
    }

    const href = {
      pathname: URL_IMPORT_PATH,
      params,
    };

    if (pathname.endsWith('/meals/url-import')) {
      router.replace(href);
    } else {
      router.push(href);
    }

    resetShareIntent();
  }, [
    hasShareIntent,
    pathname,
    resetShareIntent,
    router,
    shareIntent,
    shareIntentEnabled,
  ]);
}
