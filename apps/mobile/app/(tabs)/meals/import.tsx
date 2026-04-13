import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useFileImport } from '@/features/import/useFileImport';
import { useColors } from '@/hooks/useTheme';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { spacing, radii, fontSizes } from '@/ui/theme';

export default function ImportScreen() {
  const router = useRouter();
  const c = useColors();
  const { importing, result, error, importFromJson, reset } = useFileImport();
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear the local read-error banner whenever a new import starts or completes.
  useEffect(() => {
    if (importing || result) setLocalError(null);
  }, [importing, result]);

  const handlePickFile = useCallback(async () => {
    try {
      reset();
      setLocalError(null);
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      if (!asset?.uri) return;

      setFileName(asset.name ?? 'recipes.json');
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      importFromJson(content);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "We couldn't read that file. Make sure it's a JSON export from the web app.",
      );
    }
  }, [importFromJson, reset]);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Instruction card */}
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: c.accentLight }]}>
            <Ionicons name="cloud-download-outline" size={36} color={c.accent} />
          </View>
          <Text style={[styles.infoTitle, { color: c.text }]}>Import recipes</Text>
          <Text style={[styles.infoSubtitle, { color: c.textSecondary }]}>
            Pick a JSON file exported from the web app and we'll bring every meal,
            ingredient, and tag onto this device. Duplicates are skipped automatically.
          </Text>
        </View>

        {/* File picker button */}
        {!result && (
          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              { backgroundColor: c.accent },
              pressed && styles.pickBtnPressed,
              importing && styles.pickBtnDisabled,
            ]}
            onPress={handlePickFile}
            disabled={importing}
            accessibilityRole="button"
            accessibilityLabel="Choose a recipe file"
          >
            {importing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-outline" size={22} color="#FFFFFF" />
                <Text style={styles.pickBtnText}>Choose File</Text>
              </>
            )}
          </Pressable>
        )}

        {/* File read error */}
        {localError && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              title="Couldn't read file"
              message={localError}
              onDismiss={() => setLocalError(null)}
            />
          </View>
        )}

        {/* Import parse/validation error */}
        {error && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              title="Import failed"
              message={error}
              onDismiss={reset}
            />
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsSection}>
            {fileName && (
              <Text style={[styles.fileLabel, { color: c.textSecondary }]}>
                <Ionicons name="document-text-outline" size={14} color={c.textSecondary} />{' '}
                {fileName}
              </Text>
            )}

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
              <Ionicons
                name="checkmark-circle"
                size={36}
                color={c.success}
                style={styles.successIcon}
              />
              <Text style={[styles.summaryTitle, { color: c.text }]}>Import complete</Text>
              <Text style={[styles.summarySubtitle, { color: c.textSecondary }]}>
                {result.summary.importedCount > 0
                  ? `${result.summary.importedCount} meal${result.summary.importedCount === 1 ? '' : 's'} added to your library.`
                  : 'Nothing new was imported — everything was already here.'}
              </Text>
              <View style={styles.summaryRow}>
                <StatBadge
                  label="Imported"
                  count={result.summary.importedCount}
                  color={c.success}
                />
                <StatBadge
                  label="Skipped"
                  count={result.summary.skippedCount}
                  color={c.warning}
                />
                <StatBadge
                  label="Failed"
                  count={result.summary.failedCount}
                  color={c.error}
                />
              </View>
            </View>

            {/* Skipped details */}
            {result.skipped.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: c.surface }]}>
                <Text style={[styles.detailTitle, { color: c.text }]}>Skipped (duplicates)</Text>
                {result.skipped.map((item, i) => (
                  <Text key={i} style={[styles.detailItem, { color: c.textSecondary }]}>
                    • {item.name}
                  </Text>
                ))}
              </View>
            )}

            {/* Failed details */}
            {result.failed.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: c.surface }]}>
                <Text style={[styles.detailTitle, { color: c.text }]}>Failed</Text>
                {result.failed.map((item, i) => (
                  <Text key={i} style={[styles.detailItem, { color: c.textSecondary }]}>
                    • {item.name ?? 'Unknown'}: {item.reason}
                  </Text>
                ))}
              </View>
            )}

            {/* Done button */}
            <Pressable
              style={[styles.doneBtn, { backgroundColor: c.accent }]}
              onPress={handleDone}
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>

            {/* Import another */}
            <Pressable
              style={styles.anotherBtn}
              onPress={() => { reset(); setFileName(null); }}
              accessibilityRole="button"
            >
              <Text style={[styles.anotherBtnText, { color: c.accent }]}>Import Another File</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.statBadge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
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
  infoCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  infoIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  bannerWrap: {
    marginTop: spacing.lg,
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
  summarySubtitle: {
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 18,
    maxWidth: 280,
  },
  infoTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  infoSubtitle: {
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  pickBtnPressed: {
    opacity: 0.85,
  },
  pickBtnDisabled: {
    opacity: 0.6,
  },
  pickBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsSection: {
    marginTop: spacing.sm,
  },
  fileLabel: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBadge: {
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 80,
  },
  statCount: {
    fontSize: fontSizes.xxl ?? 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  detailSection: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  detailTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detailItem: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    minHeight: 52,
  },
  doneBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  anotherBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  anotherBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
