import React, { useEffect, useState, useRef } from 'react'
import { Animated, StyleSheet, Dimensions, Text, View } from 'react-native'
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler'
import { onToast } from '../utils/toast'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3

export default function ToastListener() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const translateY = useRef(new Animated.Value(-150)).current
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = (msg: string, duration: number = 4000) => {
    setMessage(msg)
    setVisible(true)
    translateX.setValue(0)

    // Slide down animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto-dismiss after duration
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      hideToast()
    }, duration)
  }

  const hideToast = (swipeDirection?: 'left' | 'right') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: swipeDirection ? 0 : -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: swipeDirection === 'left' ? -SCREEN_WIDTH : swipeDirection === 'right' ? SCREEN_WIDTH : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false)
      translateY.setValue(-150)
      translateX.setValue(0)
      opacity.setValue(0)
    })
  }

  useEffect(() => {
    const off = onToast(({ message, duration }) => {
      showToast(message, duration || 4000)
    })
    return () => {
      off()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  )

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent
      if (Math.abs(translationX) > SWIPE_THRESHOLD) {
        const direction = translationX > 0 ? 'right' : 'left'
        hideToast(direction)
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          damping: 15,
          useNativeDriver: true,
        }).start()
      }
    }
  }

  if (!visible) return null

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.toast,
            {
              transform: [
                { translateY },
                { translateX },
              ],
              opacity,
            },
          ]}
        >
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    minWidth: SCREEN_WIDTH * 0.9,
    maxWidth: SCREEN_WIDTH * 0.96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toastText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
})
