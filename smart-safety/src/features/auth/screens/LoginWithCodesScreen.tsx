import React, { useState, useRef, useCallback } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as NativeTextInput,
} from "react-native";
import { Text, HelperText } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../../context/AppContext";
import { useAppTheme } from "../../../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import InteractiveAuthBackground from "../../../components/InteractiveAuthBackground";
import ThemeToggle from "../../../components/ThemeToggle";
import LiquidGlassCard from "../../../components/LiquidGlassCard";
import LiquidGlassButton from "../../../components/LiquidGlassButton";

export default function LoginWithCodesScreen({ navigation }: any) {
  const { loginWithCodes } = useApp() as any;
  const { isDark, colors } = useAppTheme();
  const [guideId, setGuideId] = useState("");
  const [touristId, setTouristId] = useState("");
  const [groupAccessCode, setGroupAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "info" | "error" | "success";
    text: string;
  } | null>(null);
  const touristIdInputRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        touristIdInputRef.current?.focus?.();
      }, 300);
      return () => clearTimeout(timeout);
    }, [])
  );

  const onSubmit = async () => {
    setMsg(null);

    if (!touristId.trim()) {
      setMsg({ type: "error", text: "Please enter your Tourist ID" });
      return;
    }

    if (!guideId.trim()) {
      setMsg({ type: "error", text: "Please enter your Guide ID" });
      return;
    }

    if (!groupAccessCode.trim()) {
      setMsg({ type: "error", text: "Please enter your Group Access Code" });
      return;
    }

    setLoading(true);
    let res: any;
    try {
      res = await loginWithCodes(
        guideId.trim(),
        touristId.trim(),
        groupAccessCode.trim()
      );
    } catch (e: any) {
      res = { ok: false, message: e?.message || "An error occurred" };
    }
    setMsg({ type: res.ok ? "success" : "error", text: res.message });
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Interactive Animated Background */}
      <InteractiveAuthBackground />

      {/* Top Bar with Back and Theme Toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.navIconButton,
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(16px)",
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 4px 12px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                } as any)
              : {},
            {
              backgroundColor: colors.toggleBg,
              borderColor: colors.toggleBorder,
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <ThemeToggle />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, zIndex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Liquid Glass Card */}
          <LiquidGlassCard maxWidth={360}>
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.brandIconWrapper,
                  Platform.OS === "web"
                    ? ({
                        boxShadow: "0 0 15px rgba(249, 115, 22, 0.3), inset 0 1px 1px rgba(255,255,255,0.4)",
                      } as any)
                    : {},
                ]}
              >
                <Ionicons name="people" size={22} color="#F97316" />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Group Member Login
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the 3 access codes provided by your tour guide
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.formContainer}>
              {/* Tourist ID */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Tourist ID
                </Text>
                <View
                  style={[
                    styles.liquidInputWrapper,
                    Platform.OS === "web"
                      ? ({
                          backdropFilter: "blur(14px)",
                          boxShadow: isDark
                            ? "inset 0 1px 3px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1)"
                            : "inset 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 1px rgba(255, 255, 255, 0.8)",
                        } as any)
                      : {},
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    ref={touristIdInputRef}
                    value={touristId}
                    onChangeText={setTouristId}
                    placeholder="e.g. T1234"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Guide ID */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Guide ID
                </Text>
                <View
                  style={[
                    styles.liquidInputWrapper,
                    Platform.OS === "web"
                      ? ({
                          backdropFilter: "blur(14px)",
                          boxShadow: isDark
                            ? "inset 0 1px 3px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1)"
                            : "inset 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 1px rgba(255, 255, 255, 0.8)",
                        } as any)
                      : {},
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="compass-outline"
                    size={20}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    value={guideId}
                    onChangeText={setGuideId}
                    placeholder="e.g. G5678"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Group Access Code */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Group Access Code
                </Text>
                <View
                  style={[
                    styles.liquidInputWrapper,
                    Platform.OS === "web"
                      ? ({
                          backdropFilter: "blur(14px)",
                          boxShadow: isDark
                            ? "inset 0 1px 3px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1)"
                            : "inset 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 1px rgba(255, 255, 255, 0.8)",
                        } as any)
                      : {},
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="key-outline"
                    size={20}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    value={groupAccessCode}
                    onChangeText={setGroupAccessCode}
                    placeholder="Enter group access code"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {msg && (
                <HelperText
                  type={msg.type === "error" ? "error" : "info"}
                  style={{
                    color: msg.type === "error" ? "#ef4444" : "#10b981",
                    fontSize: 13,
                    textAlign: "center",
                    marginVertical: 4,
                  }}
                >
                  {msg.text}
                </HelperText>
              )}

              {/* Liquid Glass Submit Button */}
              <View style={{ marginTop: 6, marginBottom: 10 }}>
                <LiquidGlassButton
                  onPress={onSubmit}
                  loading={loading}
                  disabled={loading}
                >
                  Verify & Enter
                </LiquidGlassButton>
              </View>

              {/* Back to regular login */}
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
                style={styles.actionLink}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.actionLinkText,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  <Text style={{ color: "#F97316", fontWeight: "700" }}>
                    Sign in with email
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </LiquidGlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "web" ? 24 : 50,
    left: 24,
    right: 24,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  brandIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 2,
  },
  liquidInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  nativeInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },
  actionLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  actionLinkText: {
    fontSize: 14,
  },
});
