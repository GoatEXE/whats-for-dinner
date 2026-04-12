import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useExport, type ExportResult } from '@/features/import/useExport';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

type ExportPhase = 'options' | 'sharing' | 'done';

export default function ExportScreen() {
  const router = useRouter();
  const { exporting, error: exportError, exportMeals } = useExport();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [phase, setPhase] = useState<ExportPhase>('options');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExportAndShare = useCallback(async () => {
    setLocalError(null);
    setCopied(false);

    const exported = exportMeals({ includeArchived });

    if (!exported) return; // error already set in hook

    setResult(exported);

    // On web, skip file sharing — offer clipboard copy instead
    if (Platform.OS === 'web') {
      setPhase('done');
      return;
    }

    setPhase('sharing');

    try {
      const isShareAvailable = await Sharing.isAvailableAsync();

      if (!isShareAvailable) {
        // Fallback: show the done screen with clipboard copy option
        setPhase('done');
        return;
      }

      // Write to a temp file so Sharing.shareAsync can read it
      const fileUri = `${FileSystem.cacheDirectory}${exported.filename}`;
      await FileSystem.writeAsStringAsync(fileUri, exported.json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share your cookbook',
      });

      setPhase('done');
    } catch (err) {
      // User may have cancelled the share sheet — that's fine
      const message = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(message)) {
        setPhase('done');
        return;
      }
      setLocalError(message);
      setPhase('done');
    }
  }, [exportMeals, includeArchived]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!result) return;

    try {
      await Clipboard.setStringAsync(result.json);
      setCopied(true);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to copy to clipboard',
      );
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setPhase('options');
    setResult(null);
    setLocalError(null);
    setCopied(false);
  }, []);

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
            <Text style={styles.successTitle}>Export ready</Text>
            <Text style={styles.successSubtitle}>
              {result.summary} exported as{' '}
              <Text style={styles.bold}>{result.filename}</Text>
            </Text>
          </View>

          {/* Error from share/clipboard */}
          {localError && (
            <View style={styles.bannerWrap}>
              <ErrorBanner
                title="Something went wrong"
                message={localError}
                onDismiss={() => setLocalError(null)}
              />
            </View>
          )}

          {/* Web notice */}
          {Platform.OS === 'web' && (
            <View style={styles.bannerWrap}>
              <ErrorBanner
                tone="warning"
                title="File sharing not available on web"
                message="Use the clipboard button below to copy the JSON, then paste it into a file or document."
              />
            </View>
          )}

          {/* Copy to clipboard */}
          <Pressable
            style={[styles.actionBtn, copied && styles.actionBtnDone]}
            onPress={handleCopyToClipboard}
            accessibilityRole="button"
            accessibilityLabel="Copy export JSON to clipboard"
          >
            <Ionicons
              name={copied ? 'checkmark' : 'clipboard-outline'}
              size={20}
              color={copied ? colors.success : colors.accent}
            />
            <Text
              style={[
                styles.actionBtnText,
                copied && styles.actionBtnTextDone,
              ]}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Text>
          </Pressable>

          {/* Share again (native only) */}
          {Platform.OS !== 'web' && (
            <Pressable
              style={styles.actionBtn}
              onPress={handleExportAndShare}
              accessibilityRole="button"
              accessibilityLabel="Share again"
            >
              <Ionicons name="share-outline" size={20} color={colors.accent} />
              <Text style={styles.actionBtnText}>Share Again</Text>
            </Pressable>
          )}

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
            <Text style={styles.secondaryBtnText}>Export Again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Phase: Options (default) ───
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="share-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Export Cookbook</Text>
          <Text style={styles.heroSubtitle}>
            Export your meals as a JSON file you can share with family, friends,
            or import on another device.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionRow}>
          <View style={styles.optionLabel}>
            <Text style={styles.optionTitle}>Include archived meals</Text>
            <Text style={styles.optionHint}>
              Also export meals you've previously archived. Imported copies come back as active meals.
            </Text>
          </View>
          <Switch
            value={includeArchived}
            onValueChange={setIncludeArchived}
            trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
            thumbColor={colors.white}
          />
        </View>

        {/* Errors */}
        {(exportError || localError) && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              title="Export failed"
              message={exportError || localError || 'Unknown error'}
              onDismiss={() => setLocalError(null)}
            />
          </View>
        )}

        {/* Export button */}
        <Pressable
          style={[
            styles.primaryBtn,
            (exporting || phase === 'sharing') && styles.primaryBtnDisabled,
          ]}
          onPress={handleExportAndShare}
          disabled={exporting || phase === 'sharing'}
          accessibilityRole="button"
          accessibilityLabel="Export and share cookbook"
        >
          {exporting || phase === 'sharing' ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={styles.primaryBtnText}>
                {phase === 'sharing' ? 'Opening share…' : 'Preparing…'}
              </Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="share-outline" size={20} color={colors.white} />
              <Text style={styles.primaryBtnText}>Export & Share</Text>
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
            The exported file is compatible with the Import Recipes screen.
            Anyone with this app can import your cookbook.
          </Text>
        </View>
      </ScrollView>
    </View>
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

  // ── Options ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  optionLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  optionHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ── Buttons ──
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
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
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Action buttons (done phase) ──
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 52,
  },
  actionBtnDone: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  actionBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.accent,
  },
  actionBtnTextDone: {
    color: colors.success,
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

  // ── Misc ──
  bannerWrap: {
    marginBottom: spacing.md,
  },
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
});
