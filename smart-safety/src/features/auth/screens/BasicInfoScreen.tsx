import { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button, TextInput, Text, IconButton, HelperText } from "react-native-paper";
import { useApp } from "../../../context/AppContext";

export default function BasicInfoScreen({ navigation, route }: any) {
  const { state, register, login, setJustRegistered } = useApp();
  const lang = state.language;
  const role = route?.params?.role as "solo" | "group-member" | "tour-admin" | undefined;

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [msg, setMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setMsg(null);

    // Email validation
    if (!email.trim()) {
      setMsg({ type: "error", text: "Please enter your email" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMsg({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    // Phone validation
    if (!phone.trim()) {
      setMsg({ type: "error", text: "Please enter your phone number" });
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
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
        name: "Tourist",
        email,
        password,
        govId: phone, // using phone as default ID
        phone,
        dayWiseItinerary: [],
        emergencyContact: { name: "None", phone: "0000000000" },
        language: lang,
        age: "25",
        gender: "Other",
      });

      if (!res.ok) {
        setMsg({ type: "error", text: res.message });
        setLoading(false);
        return;
      }

      const loginRes = await login(email, password);
      if (!loginRes.ok) {
        setMsg({ type: "success", text: `${res.message}. Please login manually.` });
        setLoading(false);
        return;
      }

      setMsg({ type: "success", text: "Welcome!" });
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "An error occurred" });
    }
    setLoading(false);
  };

  return (
    <View style={styles.screenContainer}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => navigation.goBack()}
        style={styles.backIcon}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            {role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {role === 'solo' ? 'Solo Traveler' : role === 'group-member' ? 'Group Member' : role === 'tour-admin' ? 'Tour Admin' : role}
                </Text>
              </View>
            )}
            <Text style={styles.subtitle}>Enter your details to sign up</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                mode="flat"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                autoCapitalize="none"
                keyboardType="email-address"
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                mode="flat"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                mode="flat"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry={secureTextEntry}
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? "eye-off-outline" : "eye-outline"}
                    color="#9CA3AF"
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                  />
                }
              />
            </View>

            {msg && (
              <HelperText type={msg.type === "error" ? "error" : "info"} style={styles.helperText}>
                {msg.text}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={styles.submitButtonLabel}
            >
              Sign Up
            </Button>

            <TouchableOpacity onPress={() => navigation.navigate("Login", { role })} style={styles.signInLink}>
              <Text style={styles.signInLinkText}>Already have account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backIcon: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 38,
    left: 20,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 28,
    paddingTop: 88,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Jost",
    fontWeight: "700",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0.2,
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Jost",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: "#6B7280",
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#171725",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    fontSize: 14,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: "#0C87DE",
    marginTop: 16,
  },
  submitButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  submitButtonLabel: {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: "#FEFEFE",
  },
  signInLink: {
    marginTop: 24,
    alignItems: "center",
  },
  signInLinkText: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: "#2853AF",
  },
  roleBadge: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EEF6FF',
    borderWidth: 1,
    borderColor: '#D3EFFF',
  },
  roleBadgeText: {
    color: '#0C87DE',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
});

