import { useState, useRef, useCallback } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import {
  Button,
  HelperText,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useApp } from "../../../context/AppContext";
import { useFocusEffect } from "@react-navigation/native";

export default function LoginWithCodesScreen({ navigation }: any) {
  const { loginWithCodes } = useApp() as any;
  const [guideId, setGuideId] = useState("");
  const [touristId, setTouristId] = useState("");
  const [groupAccessCode, setGroupAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "info" | "error" | "success";
    text: string;
  } | null>(null);
  const touristIdInputRef = useRef<any>(null);

  // Auto-focus on the first input field
  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        touristIdInputRef.current?.focus?.();
      }, 250);
      return () => clearTimeout(timeout);
    }, [])
  );

  const onSubmit = async () => {
    // Clear previous messages
    setMsg(null);

    // Validate inputs with specific messages
    if (!touristId.trim()) {
      setMsg({
        type: "error",
        text: "Please enter your Tourist ID",
      });
      return;
    }

    if (!guideId.trim()) {
      setMsg({
        type: "error",
        text: "Please enter your Guide ID",
      });
      return;
    }

    if (!groupAccessCode.trim()) {
      setMsg({
        type: "error",
        text: "Please enter your Group Access Code",
      });
      return;
    }

    setLoading(true);

    try {
      // Call AppContext function which handles everything
      const result = await loginWithCodes(guideId, touristId, groupAccessCode);

      if (result.ok) {
        setMsg({
          type: "success",
          text: "Welcome! Logging you in...",
        });
        // Navigation happens automatically via RootNavigator watching state.user
      } else {
        setMsg({
          type: "error",
          text: result.message || "Login failed. Please check your codes.",
        });
      }
    } catch (e: any) {
      console.error("LoginWithCodes error:", e);
      setMsg({
        type: "error",
        text: e?.message || "Login failed. Please check your codes and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
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
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#171725" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome, Traveler!</Text>
            <Text style={styles.subtitle}>
              Enter your details to sync with your guide and join
              the safety group.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tourist ID</Text>
              <TextInput
                ref={touristIdInputRef}
                mode="flat"
                value={touristId}
                onChangeText={setTouristId}
                placeholder="Enter Tourist ID"
                autoCapitalize="characters"
                autoCorrect={false}
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                disabled={loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Guide ID</Text>
              <TextInput
                mode="flat"
                value={guideId}
                onChangeText={setGuideId}
                placeholder="Enter Guide ID"
                autoCapitalize="characters"
                autoCorrect={false}
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                disabled={loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Group Access Code</Text>
              <TextInput
                mode="flat"
                value={groupAccessCode}
                onChangeText={setGroupAccessCode}
                placeholder="Enter Group Access Code"
                autoCapitalize="characters"
                autoCorrect={false}
                cursorColor="#0C87DE"
                selectionColor="#0C87DE"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                disabled={loading}
              />
            </View>

            {msg && (
              <HelperText
                type={msg.type === "error" ? "error" : "info"}
                style={[
                  styles.message,
                  msg.type === "success" && styles.successMessage,
                ]}
              >
                {msg.text}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? "Joining..." : "Join Tour"}
            </Button>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.helpLink}
              disabled={loading}
            >
              <Text style={styles.helpText}>Need Help?</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 34,
    paddingTop: 88,
    paddingBottom: 32,
  },
  backButton: {
    position: "absolute",
    top: 67,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Jost",
    fontSize: 28,
    fontWeight: "700",
    color: "#171725",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: "Jost",
    fontSize: 14,
    color: "#434E58",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "Jost",
    fontSize: 14,
    fontWeight: "600",
    color: "#171725",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 56,
    paddingLeft: 16,
    fontSize: 15,
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    color: "#059669",
  },
  button: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: "#0C87DE",
    elevation: 3,
    shadowColor: "#0C87DE",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonContent: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonLabel: {
    fontFamily: "Plus Jakarta Sans",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
  helpLink: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 8,
  },
  helpText: {
    fontFamily: "Jost",
    fontSize: 16,
    color: "#2853AF",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
