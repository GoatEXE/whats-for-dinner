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
import { useColors } from '@/hooks/useTheme';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { spacing, radii, fontSizes } from '@/ui/theme';

type ExportPhase = 'options' | 'sharing' | 'done';

export default function ExportScreen() {
  const router = useRouter();
  const c = useColors();
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
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.successCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={c.success}
              style={styles.successIcon}
            />
            <Text style={[styles.successTitle, { color: c.text }]}>Export ready</Text>
            <Text style={[styles.successSubtitle, { color: c.textSecondary }]}>
              {result.summary} exported as{' '}
              <Text style={[styles.bold, { color: c.text }]}>{result.filename}</Text>
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
            style={[
              styles.actionBtn,
              { backgroundColor: c.surface, borderColor: c.surfaceBorder },
              copied && { borderColor: c.success, backgroundColor: c.successLight },
            ]}
            onPress={handleCopyToClipboard}
            accessibilityRole="button"
            accessibilityLabel="Copy export JSON to clipboard"
          >
            <Ionicons
              name={copied ? 'checkmark' : 'clipboard-outline'}
              size={20}
              color={copied ? c.success : c.accent}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: c.accent },
                copied && { color: c.success },
              ]}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Text>
          </Pressable>

          {/* Share again (native only) */}
          {Platform.OS !== 'web' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}
              onPress={handleExportAndShare}
              accessibilityRole="button"
              accessibilityLabel="Share again"
            >
              <Ionicons name="share-outline" size={20} color={c.accent} />
              <Text style={[styles.actionBtnText, { color: c.accent }]}>Share Again</Text>
            </Pressable>
          )}

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
            <Text style={[styles.secondaryBtnText, { color: c.accent }]}>Export Again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Phase: Options (default) ───
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: c.accentLight }]}>
            <Ionicons name="share-outline" size={36} color={c.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: c.text }]}>Export Cookbook</Text>
          <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
            Export your meals as a JSON file you can share with family, friends,
            or import on another device.
          </Text>
        </View>

        {/* Options */}
        <View style={[styles.optionRow, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <View style={styles.optionLabel}>
            <Text style={[styles.optionTitle, { color: c.text }]}>Include archived meals</Text>
            <Text style={[styles.optionHint, { color: c.textMuted }]}>
              Also export meals you've previously archived. Imported copies come back as active meals.
            </Text>
          </View>
          <Switch
            value={includeArchived}
            onValueChange={setIncludeArchived}
            trackColor={{ true: c.accent, false: c.surfaceBorder }}
            thumbColor={c.white}
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
            { backgroundColor: c.accent },
            (exporting || phase === 'sharing') && styles.primaryBtnDisabled,
          ]}
          onPress={handleExportAndShare}
          disabled={exporting || phase === 'sharing'}
          accessibilityRole="button"
          accessibilityLabel="Export and share cookbook"
        >
          {exporting || phase === 'sharing' ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.primaryBtnText}>
                {phase === 'sharing' ? 'Opening share…' : 'Preparing…'}
              </Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Export & Share</Text>
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // ── Hero card ──
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

  // ── Options ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  optionLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  optionHint: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },

  // ── Buttons ──
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 52,
  },
  actionBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },

  // ── Success card ──
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
    lineHeight: 18,
  },
});
