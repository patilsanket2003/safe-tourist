import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useApp } from "../../../context/AppContext";
import { useAppTheme } from "../../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import InteractiveAuthBackground from "../../../components/InteractiveAuthBackground";
import ThemeToggle from "../../../components/ThemeToggle";
import LiquidGlassCard from "../../../components/LiquidGlassCard";
import LiquidGlassButton from "../../../components/LiquidGlassButton";

export default function LoginScreen({ navigation, route }: any) {
  const { state, login } = useApp();
  const { isDark, colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const role = route?.params?.role as "solo" | "group-member" | "tour-admin" | undefined;
  const emailInputRef = useRef<any>(null);

  useEffect(() => {
    if (role === "group-member") {
      navigation.replace("LoginWithCodes", { role });
    }
  }, [navigation, role]);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        emailInputRef.current?.focus?.();
      }, 300);
      return () => clearTimeout(timeout);
    }, [])
  );

  const onSubmit = async () => {
    setMsg(null);

    // Email validation
    if (!email.trim()) {
      setMsg({ type: "error", text: "Please enter your email" });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMsg({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    // Password validation
    if (!password.trim()) {
      setMsg({ type: "error", text: "Please enter your password" });
      return;
    }

    setLoading(true);
    let res: any;
    try {
      res = await login(email, password);
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

      {/* Top Bar with Navigation / Theme Toggle */}
      <View style={styles.topBar}>
        {navigation.canGoBack() ? (
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
        ) : (
          <View style={{ width: 40 }} />
        )}

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
          <LiquidGlassCard maxWidth={330}>
            {/* Header Section */}
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
                <Ionicons name="shield-checkmark" size={22} color="#F97316" />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Welcome back
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Urban Shield
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Email
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
                    name="mail-outline"
                    size={18}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Password
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
                    name="lock-closed-outline"
                    size={18}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={colors.inputPlaceholder}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={secureTextEntry ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
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

              {/* Liquid Glass Button */}
              <View style={{ marginTop: 6, marginBottom: 10 }}>
                <LiquidGlassButton
                  onPress={onSubmit}
                  loading={loading}
                  disabled={loading}
                >
                  Login
                </LiquidGlassButton>
              </View>

              {/* Create Account Link */}
              {role !== "group-member" && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("BasicInfo", { role })}
                  disabled={loading}
                  style={styles.actionLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpLinkText}>Create an account</Text>
                </TouchableOpacity>
              )}

              {/* Emergency Vehicle Login Link */}
              <TouchableOpacity
                style={[
                  styles.actionLink,
                  styles.emergencyGlassPill,
                  Platform.OS === "web"
                    ? ({
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
                      } as any)
                    : {},
                ]}
                onPress={() =>
                  (navigation as any).navigate("EmergencyLoginScreen")
                }
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="medical"
                  size={15}
                  color="#ef4444"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.actionLinkText,
                    { color: "#ef4444", fontWeight: "600" },
                  ]}
                >
                  Emergency Vehicle Login
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
    marginBottom: 12,
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
  roleBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.16)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
  },
  roleBadgeText: {
    color: "#F97316",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
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
  signUpLinkText: {
    color: "#F97316",
    fontSize: 14,
    fontWeight: "600",
  },
  actionLinkText: {
    fontSize: 13,
  },
  emergencyGlassPill: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
  },
});
