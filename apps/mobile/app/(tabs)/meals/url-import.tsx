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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { useMealForm } from '@/features/meals/useMealForm';
import {
  useUrlImport,
  scrapedToFormState,
} from '@/features/import/useUrlImport';
import { MealFormFields, mealFormStyles } from '@/ui/MealFormFields';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function UrlImportScreen() {
  const router = useRouter();
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
  const seededRef = useRef(false);

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

  const handleFetch = useCallback(() => {
    if (!urlInput.trim()) return;
    setFormErrors([]);
    fetchRecipe(urlInput);
  }, [urlInput, fetchRecipe]);

  const handleSave = useCallback(() => {
    // Always read the freshest meal list from the DB so that back-to-back
    // "Import Another" saves within the same modal session detect the
    // meal just created, even before React re-renders with the new state.
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
  }, [resetImport]);

  // ─── Phase: Done ───
  if (phase === 'done' && result) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={colors.success}
              style={styles.successIcon}
            />
            <Text style={styles.successTitle}>Recipe imported!</Text>
            <Text style={styles.successSubtitle}>
              <Text style={styles.bold}>{result.mealName}</Text> has been saved
              from {result.sourceHost}.
            </Text>
          </View>
          <Pressable
            style={styles.primaryBtn}
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
            <Text style={styles.secondaryBtnText}>Import Another</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Phase: Review ───
  if (phase === 'review') {
    const sourceBadge = scraped ? (
      <View style={styles.sourceBadge}>
        <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.sourceBadgeText} numberOfLines={1}>
          {scraped.sourceHost}
        </Text>
      </View>
    ) : undefined;

    return (
      <KeyboardAvoidingView
        style={styles.container}
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
            notesLabel="Notes / Instructions"
            errors={formErrors}
            headerContent={sourceBadge}
          />
        </ScrollView>

        {/* Footer */}
        <View style={mealFormStyles.footer}>
          <Pressable
            style={[mealFormStyles.footerBtn, mealFormStyles.cancelBtn]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={mealFormStyles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              mealFormStyles.footerBtn,
              mealFormStyles.saveBtn,
              saving && mealFormStyles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={mealFormStyles.saveBtnText}>Save Meal</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Phase: Input / Fetching ───
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="link-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Import from URL</Text>
          <Text style={styles.heroSubtitle}>
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

        {/* URL input */}
        <Text style={styles.label}>Recipe URL</Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://example.com/recipe/chicken-stir-fry"
          placeholderTextColor={colors.textMuted}
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
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={styles.primaryBtnText}>Fetching…</Text>
            </View>
          ) : (
            <View style={styles.fetchingRow}>
              <Ionicons name="download-outline" size={20} color={colors.white} />
              <Text style={styles.primaryBtnText}>Fetch Recipe</Text>
            </View>
          )}
        </Pressable>

        {/* Tip */}
        <View style={styles.tipRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.tipText}>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // ── Hero card ──
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  // ── Input phase form styles ──
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.white,
  },

  // ── Banner wrap ──
  bannerWrap: {
    marginTop: spacing.lg,
  },

  // ── Source badge ──
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sourceBadgeText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    maxWidth: 240,
  },

  // ── Buttons ──
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
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
    color: colors.white,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: fontSizes.md,
    color: colors.accent,
    fontWeight: '600',
  },
  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Tip ──
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
    color: colors.textMuted,
    lineHeight: 18,
  },

  // ── Success card ──
  successCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
});
