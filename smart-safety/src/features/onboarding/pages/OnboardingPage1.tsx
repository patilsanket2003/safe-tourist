import { useEffect } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import SelfieIllustration from "../../../assets/images/onboarding-selfie.svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function OnboardingPage1({ isActive = false }: { isActive?: boolean }) {
  const illustrationOpacity = useSharedValue(0);
  const illustrationScale = useSharedValue(0.92);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const floatOffset = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    illustrationOpacity.value = withTiming(1, { duration: 450 });
    illustrationScale.value = withSpring(1, { damping: 14, stiffness: 140 });
    textOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    textTranslateY.value = withDelay(
      150,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    floatOffset.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    pulseScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.01, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.99, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [illustrationOpacity, illustrationScale, textOpacity, textTranslateY, isActive]);

  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [
      { translateY: floatOffset.value },
      { scale: illustrationScale.value * pulseScale.value },
    ] as ViewStyle["transform"],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.illustrationWrapper, illustrationStyle]}>
        <SelfieIllustration width={350} height={350} />
      </Animated.View>

      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.title}>Safety for you</Text>
        <Text style={styles.subtitle}>
          Plan trips, share itineraries, get real-time safety alerts.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  illustrationWrapper: {
    width: 350,
    maxWidth: "100%",
    alignItems: "center",
  },
  textBlock: {
    marginTop: 28,
    width: 262,
    alignItems: "center",
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 41,
    color: "#000000",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
    color: "#000000",
    textAlign: "center",
  },
});
