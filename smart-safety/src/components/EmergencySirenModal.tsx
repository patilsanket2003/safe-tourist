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
import { useApp } from '../context/AppContext';
import { subscribeToSirenState, stopSirenAlert, exitRestrictedZone, resumeWebSirenAudio, SirenState } from '../utils/alertHelpers';

export default function EmergencySirenModal() {
  const { state } = useApp();
  const isAuthenticated = !!(state?.user && state?.token);

  const [sirenState, setSirenState] = useState<SirenState>({
    isPlaying: false,
    isInsideZone: false,
    title: '',
    body: '',
    silenced: false,
  });

  const [isMinimized, setIsMinimized] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0.4)).current;

  // If unauthenticated (login page, logged out), immediately silence and exit restricted zone
  useEffect(() => {
    if (!isAuthenticated) {
      exitRestrictedZone().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = subscribeToSirenState((newState) => {
      setSirenState(newState);
      if (newState.isPlaying) {
        // If sound starts, maximize alert and un-mute web audio
        setIsMinimized(false);
        resumeWebSirenAudio();
      }
      if (!newState.isInsideZone) {
        // Exited zone: auto-reset minimized state
        setIsMinimized(false);
      }
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

  // If user is not authenticated OR not inside any restricted/danger zone, render nothing!
  if (!isAuthenticated || !sirenState.isInsideZone) return null;

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

  // Render floating top pill banner if user minimized while still in restricted zone
  if (isMinimized && !sirenState.isPlaying) {
    return (
      <View style={styles.floatingBannerContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.floatingBanner,
            Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 30px rgba(220, 38, 38, 0.45)',
                } as any)
              : {},
          ]}
          onPress={() => setIsMinimized(false)}
          activeOpacity={0.85}
        >
          <View style={styles.bannerLeft}>
            <View style={styles.bannerBeacon}>
              <Text style={{ fontSize: 16 }}>🚨</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.bannerTag}>RESTRICTED ZONE ACTIVE</Text>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {sirenState.title || sirenState.zoneName || 'Danger Area'} • Move to safety
              </Text>
            </View>
          </View>
          <View style={styles.bannerDetailsBtn}>
            <Text style={styles.bannerDetailsText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color="#fca5a5" />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal
      transparent
      visible={sirenState.isInsideZone}
      animationType="fade"
      onRequestClose={handleTurnOffSiren}
    >
      <View
        style={styles.backdrop}
        onTouchStart={sirenState.isPlaying ? resumeWebSirenAudio : undefined}
        {...({ onClick: sirenState.isPlaying ? resumeWebSirenAudio : undefined } as any)}
      >
        <View
          style={[
            styles.alertCard,
            !sirenState.isPlaying && styles.alertCardSilenced,
            Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(22px)',
                  boxShadow: sirenState.isPlaying
                    ? '0 0 50px rgba(239, 68, 68, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    : '0 0 35px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.15)',
                } as any)
              : {},
          ]}
          onTouchStart={sirenState.isPlaying ? resumeWebSirenAudio : undefined}
          {...({ onClick: sirenState.isPlaying ? resumeWebSirenAudio : undefined } as any)}
        >
          {/* Beacon Header */}
          <View style={styles.headerRow}>
            <Animated.View
              style={[
                styles.beaconCircle,
                !sirenState.isPlaying && styles.beaconCircleSilenced,
                sirenState.isPlaying && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.beaconIcon}>{sirenState.isPlaying ? '🚨' : '⚠️'}</Text>
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerTag, !sirenState.isPlaying && styles.dangerTagSilenced]}>
                {sirenState.isPlaying
                  ? 'EMERGENCY ALERT • SIREN RINGING'
                  : '⚠️ RESTRICTED / RED ZONE WARNING'}
              </Text>
              <Text style={styles.titleText}>
                {sirenState.title || sirenState.zoneName || 'RESTRICTED / DANGER ZONE'}
              </Text>
            </View>
          </View>

          {/* Subtitle / Silence status notice */}
          {sirenState.silenced && !sirenState.isPlaying ? (
            <View style={styles.silencedNoticePill}>
              <Ionicons name="volume-mute" size={15} color="#fbbf24" style={{ marginRight: 6 }} />
              <Text style={styles.silencedNoticeText}>
                Siren turned off • Will not ring again in this session
              </Text>
            </View>
          ) : null}

          {/* Description */}
          <Text style={styles.bodyText}>
            {sirenState.isPlaying
              ? (sirenState.body || 'You have entered a restricted danger zone. The emergency siren and vibration are actively sounding. Proceed to safety.')
              : 'You are currently inside a restricted / red danger zone. Siren audio is turned off, but please navigate out of this area immediately for your safety.'}
          </Text>

          {/* Automatic Turn-Off Guarantee Notice */}
          <View style={styles.autoOffNotice}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" style={{ marginRight: 6 }} />
            <Text style={styles.autoOffNoticeText}>
              This pop-up will turn off automatically when you move out of this zone.
            </Text>
          </View>

          {/* Tap to Unmute / Play Sound button (if browser blocked autoplay on web) */}
          {Platform.OS === 'web' && sirenState.isPlaying && (
            <TouchableOpacity
              style={styles.unmuteBanner}
              onPress={resumeWebSirenAudio}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={20} color="#fbbf24" style={{ marginRight: 8 }} />
              <Text style={styles.unmuteBannerText}>🔊 Tap if siren audio is muted</Text>
            </TouchableOpacity>
          )}

          {/* Primary Action Button */}
          {sirenState.isPlaying ? (
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
              <Ionicons name="volume-mute" size={22} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.silenceBtnText}>TURN OFF SIREN</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={() => setIsMinimized(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.minimizeBtnText}>MINIMIZE TO BANNER (VIEW MAP)</Text>
            </TouchableOpacity>
          )}

          {/* Secondary Action: Call Police (112) */}
          <TouchableOpacity
            style={styles.callPoliceBtn}
            onPress={handleEmergencyCall}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={17} color="#fca5a5" style={{ marginRight: 6 }} />
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
    backgroundColor: 'rgba(24, 10, 16, 0.95)',
    borderRadius: 22,
    padding: 22,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  alertCardSilenced: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(23, 14, 10, 0.95)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  beaconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconCircleSilenced: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
  },
  beaconIcon: {
    fontSize: 26,
  },
  dangerTag: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  dangerTagSilenced: {
    color: '#fbbf24',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  silencedNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  silencedNoticeText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  autoOffNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  autoOffNoticeText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  unmuteBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  unmuteBannerText: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '700',
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
  minimizeBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.3)',
  },
  minimizeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  callPoliceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
  floatingBannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 16,
    right: 16,
    zIndex: 99998,
    alignItems: 'center',
  },
  floatingBanner: {
    maxWidth: 500,
    width: '100%',
    backgroundColor: 'rgba(24, 10, 16, 0.94)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerBeacon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bannerTag: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  bannerDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  bannerDetailsText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
});
