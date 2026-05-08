import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { MarkedEvent } from "@/src/services/sessionService";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OPTIONS = ["Monnaie", "Bijou", "Ferreux", "Dechet", "Artefact", "Autre"];
const PHOTO_SCALES: { label: string; value: MarkedEvent["photoScale"] }[] = [
  { label: "Aucune", value: "none" },
  { label: "Piece", value: "coin" },
  { label: "Regle", value: "rule" },
  { label: "Main", value: "hand" },
];

interface ClassifySheetProps {
  visible: boolean;
  event: MarkedEvent | null;
  onClose: () => void;
  onClassify: (
    classification: string,
    notes?: string,
    photoScale?: MarkedEvent["photoScale"],
  ) => void;
  onRefill?: () => void;
}

export default function ClassifySheet({
  visible,
  event,
  onClose,
  onClassify,
  onRefill,
}: ClassifySheetProps) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState("");
  const [photoScale, setPhotoScale] = useState<MarkedEvent["photoScale"]>("none");
  const [step, setStep] = useState<"classify" | "rebouchage">("classify");
  const [pendingClass, setPendingClass] = useState("");

  useEffect(() => {
    if (!visible) return;

    if (event?.classification && !event.refilledAt) {
      setPendingClass(event.classification);
      setStep("rebouchage");
      return;
    }

    setStep("classify");
    setPendingClass("");
  }, [event?.classification, event?.refilledAt, visible]);

  function handleClose() {
    setStep("classify");
    setNotes("");
    setPhotoScale("none");
    setPendingClass("");
    onClose();
  }

  function handleOptionPress(option: string) {
    setPendingClass(option);
    onClassify(option, notes.trim() || undefined, photoScale);
    setStep("rebouchage");
  }

  function handleRefill() {
    onRefill?.();
    setStep("classify");
    setNotes("");
    setPhotoScale("none");
    setPendingClass("");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
        style={styles.overlay}
      >
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + 16, 32) },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            {step === "classify" ? (
              <>
              <View style={styles.header}>
                <Text style={styles.title}>Classer le signal</Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {event ? (
                <Text style={styles.summary}>
                  Signal {Math.round(event.signal ?? event.signalStrength ?? 0)}%
                  {" — "}{new Date(event.timestamp).toLocaleTimeString()}
                </Text>
              ) : null}

              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.scaleLabel}>Echelle photo</Text>
              <View style={styles.scaleRow}>
                {PHOTO_SCALES.map((scale) => (
                  <TouchableOpacity
                    key={scale.value}
                    style={[
                      styles.scaleOption,
                      photoScale === scale.value && styles.scaleOptionActive,
                    ]}
                    onPress={() => setPhotoScale(scale.value)}
                  >
                    <Text
                      style={[
                        styles.scaleText,
                        photoScale === scale.value && styles.scaleTextActive,
                      ]}
                    >
                      {scale.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.grid}>
                {OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.option}
                    onPress={() => handleOptionPress(option)}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              </>
            ) : (
              <>
              <View style={styles.header}>
                <Text style={styles.title}>Rebouchage obligatoire</Text>
              </View>

              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Obligation légale et éthique : rebouchez le trou avant de
                  quitter la zone.
                </Text>
              </View>

              <Text style={styles.classifiedLabel}>
                Classé :{" "}
                <Text style={styles.classifiedValue}>{pendingClass}</Text>
              </Text>

              <TouchableOpacity style={styles.refillButton} onPress={handleRefill}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.background} />
                <Text style={styles.refillText}>Trou rebouché ✓</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleClose}>
                <Text style={styles.skipText}>Marquer plus tard</Text>
              </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  sheetContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 2,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  scaleLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
  },
  scaleOption: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  scaleOptionActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceRaised,
  },
  scaleText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  scaleTextActive: {
    color: COLORS.accent,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  option: {
    width: "31%",
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  classifiedLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  classifiedValue: {
    color: COLORS.text,
    fontWeight: "700",
  },
  refillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    marginBottom: 12,
  },
  refillText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
});
