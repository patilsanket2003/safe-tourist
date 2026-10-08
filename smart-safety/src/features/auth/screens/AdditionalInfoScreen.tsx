import { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import { Button, HelperText, TextInput, Text, IconButton } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { t } from "../../../context/translations";

export default function AdditionalInfoScreen({ navigation, route }: any) {
  const { state, register, login, setJustRegistered } = useApp();
  const lang = state.language;
  const role = route?.params?.role as "solo" | "group-member" | "tour-admin" | undefined;
  const basicInfo = route?.params?.basicInfo;

  const [govId, setGovId] = useState("");
  const [phone, setPhone] = useState("");

  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [msg, setMsg] = useState<{
    type: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setMsg(null);

    if (!role || !basicInfo) {
      setMsg({ type: "error", text: "Missing registration information. Please start again." });
      return;
    }

    // Mobile number validation
    if (!phone.trim()) {
      setMsg({ type: "error", text: "Please enter your mobile number" });
      return;
    }

    // Phone format validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setMsg({ type: "error", text: "Please enter a valid 10-digit mobile number" });
      return;
    }

    // Government ID validation
    if (!govId.trim()) {
      setMsg({ type: "error", text: "Please enter your Government ID" });
      return;
    }

    // Emergency contact validation for solo travelers
    if (role === "solo") {
      if (!emergencyContactName.trim()) {
        setMsg({ type: "error", text: "Please enter emergency contact name" });
        return;
      }

      if (!emergencyContactPhone.trim()) {
        setMsg({ type: "error", text: "Please enter emergency contact phone" });
        return;
      }

      // Emergency phone format validation
      if (!phoneRegex.test(emergencyContactPhone.replace(/\s/g, ''))) {
        setMsg({ type: "error", text: "Please enter a valid emergency contact number" });
        return;
      }
    }

    setLoading(true);

    setJustRegistered(true);

    try {
      const res = await register({
        role,
        name: basicInfo.name,
        email: basicInfo.email,
        password: basicInfo.password,
        govId,
        phone,
        dayWiseItinerary: [],
        emergencyContact:
          role === "solo"
            ? { name: emergencyContactName, phone: emergencyContactPhone }
            : { name: basicInfo.name, phone },
        language: lang,
        tripEndDate: undefined,
        age: basicInfo.age,
        gender: basicInfo.gender,
      });

      if (!res.ok) {
        setMsg({ type: "error", text: res.message });
        setLoading(false);
        return;
      }

      const loginRes = await login(basicInfo.email, basicInfo.password);
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
            <Text style={styles.title}>Additional Information</Text>
            <Text style={styles.subtitle}>Step 2 of 2 - Complete your profile</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                mode="flat"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.phoneInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gov ID</Text>
              <TextInput
                mode="flat"
                value={govId}
                onChangeText={setGovId}
                placeholder="Aadhaar/Passport"
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {role === "solo" && (
              <View style={styles.emergencySection}>
                <Text style={styles.emergencyHeader}>Emergency Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contact Name</Text>
                  <TextInput
                    mode="flat"
                    value={emergencyContactName}
                    onChangeText={setEmergencyContactName}
                    placeholder="Emergency Contact Name"
                    cursorColor="#0C87DE"
                    selectionColor="#0C87DE"
                    style={styles.textInput}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor="#9CA4AB"
                    left={<TextInput.Icon icon="account-alert-outline" color="#9CA3AF" />}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contact Phone</Text>
                  <TextInput
                    mode="flat"
                    value={emergencyContactPhone}
                    onChangeText={setEmergencyContactPhone}
                    placeholder="Emergency Contact Phone"
                    keyboardType="phone-pad"
                    cursorColor="#0C87DE"
                    selectionColor="#0C87DE"
                    style={styles.textInput}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor="#9CA4AB"
                    left={<TextInput.Icon icon="phone-alert-outline" color="#9CA3AF" />}
                  />
                </View>
              </View>
            )}

            {msg && (
              <HelperText type={msg.type === "error" ? "error" : "info"} style={styles.helperText}>
                {msg.text}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading || !role}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={styles.submitButtonLabel}
            >
              Create An Account
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
    paddingHorizontal: 34,
    paddingTop: 88,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Jost",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: "#171725",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Jost",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#434E58",
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
  phoneInput: {
    width: "100%",
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    fontSize: 14,
  },
  emergencySection: {
    marginTop: 8,
    marginBottom: 4,
  },
  emergencyHeader: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#171725",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: "#0C87DE",
  },
  submitButtonContent: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  submitButtonLabel: {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    fontSize: 16,
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
});
