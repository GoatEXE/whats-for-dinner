import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useFileImport } from '@/features/import/useFileImport';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function ImportScreen() {
  const router = useRouter();
  const { importing, result, error, importFromJson, reset } = useFileImport();
  const [fileName, setFileName] = useState<string | null>(null);

  const handlePickFile = useCallback(async () => {
    try {
      reset();
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
      Alert.alert('Error', 'Failed to read the selected file.');
    }
  }, [importFromJson, reset]);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Instruction card */}
        <View style={styles.infoCard}>
          <Ionicons name="cloud-download-outline" size={40} color={colors.accent} />
          <Text style={styles.infoTitle}>Import Recipes</Text>
          <Text style={styles.infoSubtitle}>
            Select a JSON file exported from the web app to import your meals,
            ingredients, and tags into this device.
          </Text>
        </View>

        {/* File picker button */}
        {!result && (
          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed && styles.pickBtnPressed,
              importing && styles.pickBtnDisabled,
            ]}
            onPress={handlePickFile}
            disabled={importing}
            accessibilityRole="button"
            accessibilityLabel="Choose a recipe file"
          >
            {importing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="document-outline" size={22} color={colors.white} />
                <Text style={styles.pickBtnText}>Choose File</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Import Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsSection}>
            {fileName && (
              <Text style={styles.fileLabel}>
                <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />{' '}
                {fileName}
              </Text>
            )}

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Import Complete</Text>
              <View style={styles.summaryRow}>
                <StatBadge
                  label="Imported"
                  count={result.summary.importedCount}
                  color={colors.success}
                />
                <StatBadge
                  label="Skipped"
                  count={result.summary.skippedCount}
                  color={colors.warning}
                />
                <StatBadge
                  label="Failed"
                  count={result.summary.failedCount}
                  color={colors.error}
                />
              </View>
            </View>

            {/* Skipped details */}
            {result.skipped.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Skipped (duplicates)</Text>
                {result.skipped.map((item, i) => (
                  <Text key={i} style={styles.detailItem}>
                    • {item.name}
                  </Text>
                ))}
              </View>
            )}

            {/* Failed details */}
            {result.failed.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Failed</Text>
                {result.failed.map((item, i) => (
                  <Text key={i} style={styles.detailItem}>
                    • {item.name ?? 'Unknown'}: {item.reason}
                  </Text>
                ))}
              </View>
            )}

            {/* Done button */}
            <Pressable
              style={styles.doneBtn}
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
              <Text style={styles.anotherBtnText}>Import Another File</Text>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  infoTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  infoSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
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
    color: colors.white,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.error,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  resultsSection: {
    marginTop: spacing.sm,
  },
  fileLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  detailTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailItem: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    minHeight: 52,
  },
  doneBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  anotherBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  anotherBtnText: {
    fontSize: fontSizes.md,
    color: colors.accent,
    fontWeight: '600',
  },
});
