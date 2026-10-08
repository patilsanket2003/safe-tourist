import { NavigationContainer, DefaultTheme as NavDefaultTheme } from "@react-navigation/native"
import { PaperProvider } from "react-native-paper"
import { AppProvider } from "./src/context/AppContext"
import { LocationProvider } from "./src/context/LocationContext"
import { PathDeviationProvider } from "./src/context/PathDeviationContext"
import { RootNavigator } from "./src/navigation"
import { paperTheme } from "./src/theme/paper"
import ToastListener from './src/components/ToastListener'
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import * as SplashScreen from "expo-splash-screen"
import { View, Text, ActivityIndicator, AppState } from "react-native"
import React from "react"
import { configureNotificationHandler } from "./src/utils/notificationsCompat"
import { requestNotificationPermission } from "./src/utils/notificationPermissions"

// Ensure background tasks are defined at startup.
import "./src/services/backgroundLocation";
import { setAppStateForBackgroundTasks } from "./src/services/backgroundLocation";
SplashScreen.preventAutoHideAsync().catch(() => {})

configureNotificationHandler()

const navTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    background: "#FFFFFF",
  },
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
    // In production you could hook this into a logging service.
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#ffffff',
          padding: 20 
        }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            Something went wrong. Please restart the app.
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false)

  useEffect(() => {
    const normalize = (s: string) =>
      s === "active" || s === "background" || s === "inactive" ? s : "inactive";

    setAppStateForBackgroundTasks(normalize(AppState.currentState));
    const sub = AppState.addEventListener("change", (next) => {
      // Keep background tasks aware of foreground/background to avoid duplicate sends.
      setAppStateForBackgroundTasks(normalize(next));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('App: Starting initialization...')
        // Request runtime notification permissions in background without blocking initial render
        requestNotificationPermission()
          .then((granted) => console.log('Notification permission granted:', granted))
          .catch((e) => console.warn('Failed to request notification permission:', e));

        await new Promise(resolve => setTimeout(resolve, 300))
        console.log('App: Initialization complete')
      } catch (e) {
        console.warn('App: Initialization error:', e)
      } finally {
        console.log('App: Setting app as ready')
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  useEffect(() => {
    if (appIsReady) {
      console.log('App: Hiding splash screen')
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [appIsReady])

  if (!appIsReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#ffffff' 
      }}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{ marginTop: 20, fontSize: 16 }}>Loading...</Text>
      </View>
    )
  }

  return (
    <AppProvider>
      <LocationProvider>
        <PathDeviationProvider>
          <PaperProvider theme={paperTheme}>
            <ToastListener />
            <NavigationContainer theme={navTheme}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </PathDeviationProvider>
      </LocationProvider>
    </AppProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
