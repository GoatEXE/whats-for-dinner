import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { useMealForm } from '@/features/meals/useMealForm';
import {
  useUrlImport,
  scrapedToFormState,
} from '@/features/import/useUrlImport';
import {
  resolveUrlImportShareParams,
  type UrlImportShareParamInput,
} from '@/features/share-intent/share-intent';
import { useColors } from '@/hooks/useTheme';
import { MealFormFields, mealFormStyles } from '@/ui/MealFormFields';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { spacing, radii, fontSizes } from '@/ui/theme';

export default function UrlImportScreen() {
  const router = useRouter();
  const c = useColors();
  const shareParams =
    useLocalSearchParams<'/(tabs)/meals/url-import', UrlImportShareParamInput>();
  const incomingShare = resolveUrlImportShareParams(shareParams);
  const { refresh: refreshMeals, createMeal } = useMeals();
  const {
    phase,
    scraped,
    error: importError,
    result,
    fetchRecipe,
    markDone,
    markSaveError,
    reset: resetImport,
  } = useUrlImport();

  const formHook = useMealForm();
  const { seedFromDraft, validate, toPayload } = formHook;

  const [urlInput, setUrlInput] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [shareWarning, setShareWarning] = useState<string | null>(null);
  const seededRef = useRef(false);
  const handledShareTokenRef = useRef<string | null>(null);

  // Seed the form when a recipe is scraped
  useEffect(() => {
    if (scraped && !seededRef.current) {
      seedFromDraft(scrapedToFormState(scraped));
      seededRef.current = true;
    }
  }, [scraped, seedFromDraft]);

  // Reset seed tracking when import resets
  useEffect(() => {
    if (phase === 'input') {
      seededRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (!incomingShare?.shareToken) {
      return;
    }

    if (handledShareTokenRef.current === incomingShare.shareToken) {
      return;
    }
    handledShareTokenRef.current = incomingShare.shareToken;

    resetImport();
    setFormErrors([]);

    if (incomingShare.sharedUrl) {
      setShareWarning(null);
      setUrlInput(incomingShare.sharedUrl);
      void fetchRecipe(incomingShare.sharedUrl);
      return;
    }

    setUrlInput('');
    setShareWarning(
      'The shared text did not include a recipe URL. Paste or edit a link below to continue.',
    );
  }, [incomingShare?.shareToken, incomingShare?.sharedUrl, fetchRecipe, resetImport]);

  const handleFetch = useCallback(() => {
    if (!urlInput.trim()) return;
    setShareWarning(null);
    setFormErrors([]);
    fetchRecipe(urlInput);
  }, [urlInput, fetchRecipe]);

  const handleSave = useCallback(() => {
    const freshMeals = refreshMeals();
    const existingNames = freshMeals.map((m) => m.name);
    const errors = validate(existingNames);

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);

    if (!scraped) return;

    setSaving(true);

    try {
      const payload = toPayload();
      createMeal({
        ...payload,
        sourceUrl: scraped.sourceUrl,
        sourceHost: scraped.sourceHost,
        imageUrl: scraped.imageUrl,
      });

      markDone(payload.name, scraped.sourceHost);
    } catch (err) {
      markSaveError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  }, [refreshMeals, validate, toPayload, scraped, createMeal, markDone, markSaveError]);

  const handleReset = useCallback(() => {
    resetImport();
    setUrlInput('');
    setFormErrors([]);
    setShareWarning(null);
  }, [resetImport]);

  // â”€â”€â”€ Phase: Done â”€â”€â”€
  if (phase === 'done' && result) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.successCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={c.success}
              style={styles.successIcon}
            />
            <Text style={[styles.successTitle, { color: c.text }]}>Recipe imported!</Text>
            <Text style={[styles.successSubtitle, { color: c.textSecondary }]}>
              <Text style={[styles.bold, { color: c.text }]}>{result.mealName}</Text> has been saved
              from {result.sourceHost}.
            </Text>
          </View>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.accent }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryBtnText, { color: c.accent }]}>Import Another</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // â”€â”€â”€ Phase: Review â”€â”€â”€
  if (phase === 'review') {
    const sourceBadge = scraped ? (
      <View style={[styles.sourceBadge, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
        <Ionicons name="link-outline" size={14} color={c.textSecondary} />
        <Text style={[styles.sourceBadgeText, { color: c.textSecondary }]} numberOfLines={1}>
          {scraped.sourceHost}
        </Text>
      </View>
    ) : undefined;

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: c.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Import-level error (e.g. save failure) */}
          {importError && (
            <ErrorBanner title="Save failed" message={importError} />
          )}

          <MealFormFields
            formHook={formHook}
            notesLabel="Instructions"
            errors={formErrors}
            headerContent={sourceBadge}
          />
        </ScrollView>

        {/* Footer */}
        <View style={[mealFormStyles.footer, { borderTopColor: c.surfaceBorder, backgroundColor: c.surface }]}>
          <Pressable
            style={[mealFormStyles.footerBtn, mealFormStyles.cancelBtn, { backgroundColor: c.background, borderColor: c.surfaceBorder }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={[mealFormStyles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              mealFormStyles.footerBtn,
              mealFormStyles.saveBtn,
              { backgroundColor: c.accent },
              saving && mealFormStyles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={mealFormStyles.saveBtnText}>Save Meal</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // â”€â”€â”€ Phase: Input / Fetching â”€â”€â”€
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: c.accentLight }]}>
            <Ionicons name="link-outline" size={36} color={c.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: c.text }]}>Import from URL</Text>
          <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
            Paste a link to a recipe page and we'll pull in the name,
            ingredients, and instructions automatically.
          </Text>
        </View>

        {/* Web limitation warning */}
        {Platform.OS === 'web' && (
          <ErrorBanner
            tone="warning"
            title="Not available on web"
            message="URL import requires a native mobile app due to browser CORS restrictions. Use JSON file import instead."
          />
        )}

        {shareWarning && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              tone="warning"
              title="Shared text needs a link"
              message={shareWarning}
              onDismiss={() => setShareWarning(null)}
            />
          </View>
        )}

        {/* URL input */}
        <Text style={[styles.label, { color: c.text }]}>Recipe URL</Text>
        <TextInput
          style={[styles.input, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://example.com/recipe/chicken-stir-fry"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleFetch}
          editable={phase !== 'fetching'}
          accessibilityLabel="Recipe URL"
        />

        {/* Error banner */}
        {importError && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              title="Import failed"
              message={importError}
              onDismiss={() => resetImport()}
            />
          </View>
        )}

        {/* Fetch button */}
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: c.accent },
            (phase === 'fetching' || !urlInput.trim() || Platform.OS === 'web') &&
              styles.primaryBtnDisabled,
          ]}
          onPress={handleFetch}
          disabled={phase === 'fetching' || !urlInput.trim() || Platform.OS === 'web'}
          accessibilityRole="button"
          accessibilityLabel="Fetch recipe from URL"
        >
          {phase === 'fetching' ? (
            <View style={styles.fetchingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.primaryBtnText}>Fetchingâ€¦</Text>
            </View>
          ) : (
            <View style={styles.fetchingRow}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Fetch Recipe</Text>
            </View>
          )}
        </Pressable>

        {/* Tip */}
        <View style={styles.tipRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={c.textMuted}
          />
          <Text style={[styles.tipText, { color: c.textMuted }]}>
            Works best with popular recipe sites that use structured data
            (JSON-LD). You can review and edit everything before saving.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // â”€â”€ Hero card â”€â”€
  heroCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  // â”€â”€ Input phase form styles â”€â”€
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },

  // â”€â”€ Banner wrap â”€â”€
  bannerWrap: {
    marginTop: spacing.lg,
  },

  // â”€â”€ Source badge â”€â”€
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: fontSizes.sm,
    maxWidth: 240,
  },

  // â”€â”€ Buttons â”€â”€
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    minHeight: 52,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // â”€â”€ Tip â”€â”€
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // â”€â”€ Success card â”€â”€
  successCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
});
