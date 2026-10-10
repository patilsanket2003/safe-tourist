import React, { useState } from "react";
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
import InteractiveAuthBackground from "../../../components/InteractiveAuthBackground";
import ThemeToggle from "../../../components/ThemeToggle";
import LiquidGlassCard from "../../../components/LiquidGlassCard";
import LiquidGlassButton from "../../../components/LiquidGlassButton";

export default function BasicInfoScreen({ navigation, route }: any) {
  const { state, register, login, setJustRegistered } = useApp();
  const { isDark, colors } = useAppTheme();
  const lang = state.language;
  const role = route?.params?.role as "solo" | "group-member" | "tour-admin" | undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [msg, setMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setMsg(null);

    // Name validation
    if (!name.trim()) {
      setMsg({ type: "error", text: "Please enter your full name" });
      return;
    }

    // Email validation
    if (!email.trim()) {
      setMsg({ type: "error", text: "Please enter your email" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMsg({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    // Phone validation
    if (!phone.trim()) {
      setMsg({ type: "error", text: "Please enter your phone number" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setMsg({ type: "error", text: "Please enter a valid 10-digit mobile number" });
      return;
    }

    // Password validation
    if (!password.trim()) {
      setMsg({ type: "error", text: "Please enter your password" });
      return;
    }
    if (password.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    setJustRegistered(true);

    try {
      const res = await register({
        role: role || "solo",
        name: name.trim(),
        email: email.trim(),
        password,
        govId: cleanPhone,
        phone: cleanPhone,
        dayWiseItinerary: [],
        emergencyContact: { name: "None", phone: "0000000000" },
        language: lang || "en",
        age: "25",
        gender: "Other",
      });

      if (!res.ok) {
        setMsg({ type: "error", text: res.message });
        setLoading(false);
        return;
      }

      const loginRes = await login(email.trim(), password);
      if (!loginRes.ok) {
        setMsg({ type: "success", text: `${res.message}. Please login manually.` });
        setLoading(false);
        return;
      }

      setMsg({ type: "success", text: "Welcome! Account created successfully." });
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "An error occurred during registration" });
    }
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
                <Ionicons name="person-add" size={22} color="#F97316" />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Create an account
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Join Urban Shield for real-time travel protection
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Full Name
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
                    name="person-outline"
                    size={18}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="words"
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Email */}
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
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Phone Number
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
                    name="call-outline"
                    size={18}
                    color={colors.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <NativeTextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="phone-pad"
                    style={[styles.nativeInput, { color: colors.inputText }]}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password */}
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
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.inputPlaceholder}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize="none"
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

              {/* Liquid Glass Submit Button */}
              <View style={{ marginTop: 6, marginBottom: 10 }}>
                <LiquidGlassButton
                  onPress={onSubmit}
                  loading={loading}
                  disabled={loading}
                >
                  Create Account
                </LiquidGlassButton>
              </View>

              {/* Already have an account link */}
              <TouchableOpacity
                onPress={() => navigation.navigate("Login", { role })}
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
                  Already have an account?{" "}
                  <Text style={{ color: "#F97316", fontWeight: "700" }}>
                    Sign in
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
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
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
