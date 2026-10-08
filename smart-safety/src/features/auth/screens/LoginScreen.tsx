
import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollView, KeyboardAvoidingView, Platform, View, StyleSheet, TouchableOpacity } from "react-native"
import { Button, HelperText, Text, TextInput, IconButton } from "react-native-paper"
import { useApp } from "../../../context/AppContext"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"

export default function LoginScreen({ navigation, route }: any) {
  const { state, login } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null)
  const [secureTextEntry, setSecureTextEntry] = useState(true)
  const role = route?.params?.role as "solo" | "group-member" | "tour-admin" | undefined
  const emailInputRef = useRef<any>(null)

  useEffect(() => {
    if (role === "group-member") {
      navigation.replace("LoginWithCodes", { role })
    }
  }, [navigation, role])

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        emailInputRef.current?.focus?.()
      }, 250)
      return () => clearTimeout(timeout)
    }, [])
  )

  const onSubmit = async () => {
    setMsg(null)
    
    // Email validation
    if (!email.trim()) {
      setMsg({ type: "error", text: "Please enter your email" })
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMsg({ type: "error", text: "Please enter a valid email address" })
      return
    }
    
    // Password validation
    if (!password.trim()) {
      setMsg({ type: "error", text: "Please enter your password" })
      return
    }
    
    setLoading(true)
    let res
    try {
      res = await login(email, password)
      try { console.log('LoginScreen: login result', { email, res }) } catch (e) { }
    } catch (e: any) {
      try { console.error('LoginScreen: login threw', { email, error: e?.message || e }) } catch (ee) { }
      res = { ok: false, message: e?.message || 'An error occurred' }
    }
    setMsg({ type: res.ok ? "success" : "error", text: res.message })
    setLoading(false)
  }

  return (
    <View style={styles.screenContainer}>
      {/* Back Arrow */}
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            {role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {role === 'solo' ? 'Solo Traveler' : role === 'group-member' ? 'Group Member' : role === 'tour-admin' ? 'Tour Admin' : role}
                </Text>
              </View>
            )}
            <Text style={styles.subtitle}>Sign in to continue to Smart Safety.</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={emailInputRef}
                  mode="flat"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  autoCapitalize="none"
                  cursorColor="#0C87DE"
                  selectionColor="#0C87DE"
                  autoCorrect={false}
                  autoComplete="email"
                  style={styles.textInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  disabled={loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  mode="flat"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry={secureTextEntry}
                  cursorColor="#0C87DE"
                  selectionColor="#0C87DE"
                  autoCorrect={false}
                  autoComplete="password"
                  style={styles.textInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  disabled={loading}
                  right={
                    <TextInput.Icon 
                      icon={secureTextEntry ? "eye-off" : "eye"} 
                      color="#9CA4AB" 
                      onPress={() => setSecureTextEntry(!secureTextEntry)} 
                    />
                  }
                />
              </View>
            </View>

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
              onPress={onSubmit}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              loading={loading}
              disabled={loading}
            >
              Login
            </Button>

            {role !== "group-member" && (
              <TouchableOpacity 
                onPress={() => navigation.navigate("Register", { role })} 
                disabled={loading}
                style={styles.signUpLink}
              >
                <Text style={styles.signUpLinkText}>Create an account</Text>
              </TouchableOpacity>
            )}

            {/* Emergency Vehicle Login Link */}
            <TouchableOpacity 
              style={[styles.signUpLink, { marginTop: 12, flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => (navigation as any).navigate('EmergencyLoginScreen')}
              disabled={loading}
            >
              <Ionicons name="medical" size={16} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={[styles.signUpLinkText, { color: '#dc2626' }]}>Emergency Vehicle Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: 67,
    left: 30,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingTop: 117,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Jost',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: '#171725',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Jost',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: '#434E58',
    textAlign: 'center',
    marginTop: 6,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Jost',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: '#171725',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: '#F6F6F6',
    fontSize: 14,
    paddingLeft: 16,
  },
  helperText: {
    marginBottom: 10,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0C87DE',
    borderRadius: 12,
    marginTop: 56,
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: '#FEFEFE',
  },
  groupMemberLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  groupMemberLinkText: {
    fontFamily: 'Jost',
    fontWeight: '600',
    fontSize: 14,
    color: '#2853AF',
  },
  onboardingLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  onboardingLinkText: {
    fontFamily: 'Jost',
    fontWeight: '600',
    fontSize: 14,
    color: '#2853AF',
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  signUpLinkText: {
    fontFamily: 'Jost',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: '#2853AF',
    textAlign: 'center',
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
})

