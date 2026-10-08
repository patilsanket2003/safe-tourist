import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";

export default function JoinGroupScreen({ navigation }: any) {
  const { joinGroup, logout } = useApp();

  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const onJoin = async () => {
    if (!accessCode || accessCode.length < 3) {
      setMsg({ type: "error", text: "Please enter a valid access code." });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await joinGroup(accessCode);
      if (res.ok) {
        setMsg({ type: "success", text: "Joined successfully!" });
        Alert.alert("Success", "You have joined the group.");
      } else {
        setMsg({ type: "error", text: res.message || "Failed to join group." });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* Logo or Icon can go here if needed, but for now just text */}

          <View style={styles.header}>
            <Text style={styles.title}>
              Enter Access Code
            </Text>
            <Text style={styles.subtitle}>
              Please enter the 6-digit code provided by your Tour Admin.
            </Text>
          </View>

          <View style={styles.formSection}>
              <TextInput
                placeholder="E.G. X7Y2Z"
                placeholderTextColor="#9CA3AF"
                value={accessCode}
                onChangeText={(text) => setAccessCode(text.toUpperCase())} // Auto caps
                mode="outlined"
                autoCapitalize="characters"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                disabled={loading}
                // Hiding label to match "E.G. X7Y2Z" as placeholder look
              />

              {msg && (
                <HelperText 
                    type={msg.type === "error" ? "error" : "info"}
                    style={styles.helperText}
                >
                  {msg.text}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={onJoin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Join Group
              </Button>
          </View>

          <Button
            onPress={logout}
            disabled={loading}
            style={styles.logoutButton}
            labelStyle={{ color: '#64748B' }}
          >
            Logout
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5", // Match Dashboard/Itinerary
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E40AF", // Blue title
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#4B5563", // Gray subtitle
    textAlign: "center",
    lineHeight: 24,
    maxWidth: '90%'
  },
  formSection: {
      width: '100%',
      alignItems: 'center'
  },
  input: {
    width: '100%',
    backgroundColor: "white",
    fontSize: 24, // Large text
    textAlign: "center",
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 24,
  },
  inputOutline: {
      borderRadius: 12,
      borderColor: '#E5E7EB',
      borderWidth: 1.5
  },
  inputContent: {
      height: 60,
      textAlign: 'center'
  },
  helperText: {
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 14
  },
  button: {
    width: 200, // Fixed width for centered pill/box look
    borderRadius: 8,
    backgroundColor: '#2563EB', // Bright Blue
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 0.5
  },
  logoutButton: {
      marginTop: 32,
  }
});
