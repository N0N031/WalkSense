import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { MarkedEvent } from "@/src/services/sessionService";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
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

const OPTIONS = ["Monnaie", "Bijou", "Ferreux", "Dechet", "Artefact", "Autre"];

type PhotoScale = MarkedEvent["photoScale"];

const SCALE_OPTIONS: { value: NonNullable<PhotoScale>; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { value: "none",  label: "Aucune", icon: "close-outline" },
  { value: "coin",  label: "Pièce",  icon: "ellipse-outline" },
  { value: "rule",  label: "Règle",  icon: "resize-outline" },
  { value: "hand",  label: "Main",   icon: "hand-left-outline" },
];

interface ClassifySheetProps {
  visible: boolean;
  event: MarkedEvent | null;
  onClose: () => void;
  onClassify: (
    classification: string,
    notes?: string,
    photoScale?: PhotoScale,
    photoUri?: string,
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
  const [notes, setNotes] = useState("");
  const [photoScale, setPhotoScale] = useState<NonNullable<PhotoScale>>("none");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<"classify" | "rebouchage">("classify");
  const [pendingClass, setPendingClass] = useState("");
  const stepTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const requiresRefill =
    event?.type === "find" || event?.type === "manual";

  function handleClose() {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setStep("classify");
    setNotes("");
    setPendingClass("");
    setPhotoScale("none");
    setPhotoUri(undefined);
    onClose();
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera indisponible", "Autorisez la camera pour ajouter une photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      if (photoScale === "none") setPhotoScale("rule");
    }
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photos indisponibles",
        "Autorisez l'acces aux photos pour associer une image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      if (photoScale === "none") setPhotoScale("rule");
    }
  }

  function handleOptionPress(option: string) {
    const scale: PhotoScale = photoScale === "none" ? undefined : photoScale;
    if (requiresRefill) {
      setPendingClass(option);
      onClassify(option, notes.trim() || undefined, scale, photoUri);
      stepTimerRef.current = setTimeout(() => {
        stepTimerRef.current = null;
        setStep("rebouchage");
      }, 150);
    } else {
      onClassify(option, notes.trim() || undefined, scale, photoUri);
      setNotes("");
      setPhotoScale("none");
      setPhotoUri(undefined);
    }
  }

  function handleRefill() {
    onRefill?.();
    setStep("classify");
    setNotes("");
    setPendingClass("");
    setPhotoScale("none");
    setPhotoUri(undefined);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheet}>
              {step === "classify" ? (
                <>
                  <View style={styles.header}>
                    <Text style={styles.title}>Classer le marqueur</Text>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={handleClose}
                    >
                      <Ionicons name="close" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  {event ? (
                    <Text style={styles.summary}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  ) : null}

                  <TextInput
                    style={styles.input}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes"
                    placeholderTextColor={COLORS.textTertiary}
                  />

                  <Text style={styles.scaleLabel}>Échelle visible sur photo</Text>
                  <View style={styles.photoPanel}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons
                          name="camera-outline"
                          size={22}
                          color={COLORS.textTertiary}
                        />
                        <Text style={styles.photoPlaceholderText}>
                          Photo graduee
                        </Text>
                      </View>
                    )}
                    <View style={styles.photoActions}>
                      <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                        <Ionicons name="camera" size={16} color={COLORS.accent} />
                        <Text style={styles.photoButtonText}>Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
                        <Ionicons name="images" size={16} color={COLORS.accent} />
                        <Text style={styles.photoButtonText}>Galerie</Text>
                      </TouchableOpacity>
                      {photoUri ? (
                        <TouchableOpacity
                          style={styles.photoClearButton}
                          onPress={() => setPhotoUri(undefined)}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.scaleRow}>
                    {SCALE_OPTIONS.map((opt) => {
                      const active = photoScale === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.scaleBtn, active && styles.scaleBtnActive]}
                          onPress={() => setPhotoScale(opt.value)}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={16}
                            color={active ? COLORS.background : COLORS.textSecondary}
                          />
                          <Text
                            style={[
                              styles.scaleBtnText,
                              active && styles.scaleBtnTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={COLORS.warning}
                    />
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
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={COLORS.background}
                    />
                    <Text style={styles.refillText}>Trou rebouché ✓</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.skipButton} onPress={handleClose}>
                    <Text style={styles.skipText}>Je reboucherai plus tard</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: COLORS.cardBackground,
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
    marginBottom: 14,
  },
  scaleLabel: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  photoPanel: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
    marginBottom: 12,
  },
  photoPreview: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  photoPlaceholder: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  photoPlaceholderText: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  photoActions: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  photoButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.36)",
    backgroundColor: "rgba(212, 175, 55, 0.08)",
  },
  photoButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  photoClearButton: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  scaleBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  scaleBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  scaleBtnText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  scaleBtnTextActive: {
    color: COLORS.background,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
