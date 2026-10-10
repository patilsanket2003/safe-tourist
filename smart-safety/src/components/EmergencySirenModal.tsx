import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToSirenState, stopSirenAlert, SirenState } from '../utils/alertHelpers';

export default function EmergencySirenModal() {
  const [sirenState, setSirenState] = useState<SirenState>({
    isPlaying: false,
    title: '',
    body: '',
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const unsubscribe = subscribeToSirenState((newState) => {
      setSirenState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sirenState.isPlaying) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );

      const flashLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1.0,
            duration: 350,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0.35,
            duration: 350,
            useNativeDriver: false,
          }),
        ])
      );

      pulseLoop.start();
      flashLoop.start();

      return () => {
        pulseLoop.stop();
        flashLoop.stop();
      };
    }
  }, [sirenState.isPlaying]);

  if (!sirenState.isPlaying) return null;

  const handleTurnOffSiren = async () => {
    await stopSirenAlert();
  };

  const handleEmergencyCall = () => {
    const url = 'tel:112';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = url;
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      transparent
      visible={sirenState.isPlaying}
      animationType="fade"
      onRequestClose={handleTurnOffSiren}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.alertCard,
            Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 40px rgba(239, 68, 68, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                } as any)
              : {},
          ]}
        >
          {/* Beacon Header */}
          <View style={styles.headerRow}>
            <Animated.View style={[styles.beaconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.beaconIcon}>🚨</Text>
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTag}>EMERGENCY ALERT • SOUND ON</Text>
              <Text style={styles.titleText}>
                {sirenState.title || 'RESTRICTED / DANGER ZONE'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.bodyText}>
            {sirenState.body || 'You have entered a restricted danger zone. The emergency siren and vibration are actively sounding.'}
          </Text>

          {/* Prominent Action Button: Turn Off Siren */}
          <TouchableOpacity
            style={[
              styles.silenceBtn,
              Platform.OS === 'web'
                ? ({
                    boxShadow: '0 4px 18px rgba(220, 38, 38, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                  } as any)
                : {},
            ]}
            onPress={handleTurnOffSiren}
            activeOpacity={0.8}
          >
            <Ionicons name="volume-mute" size={24} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.silenceBtnText}>TURN OFF SIREN</Text>
          </TouchableOpacity>

          {/* Secondary Action: Call Police */}
          <TouchableOpacity
            style={styles.callPoliceBtn}
            onPress={handleEmergencyCall}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color="#fca5a5" style={{ marginRight: 6 }} />
            <Text style={styles.callPoliceBtnText}>Call Emergency Dispatch (112)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  alertCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(24, 10, 16, 0.94)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  beaconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconIcon: {
    fontSize: 28,
  },
  dangerTag: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  silenceBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.4)',
  },
  silenceBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callPoliceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  callPoliceBtnText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
});
