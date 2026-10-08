import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { Svg, Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const FEATURES = [
  {
    title: "One-tap SOS with Context",
    body: "Send a single SOS that includes your location, route, and recent status to emergency contacts.",
    icon: "alarm-light",
    iconColor: "#57BAFF",
  },
  {
    title: "Smart Geofence Alerts",
    body: "Get instant notifications when entering/exiting safety zones or deviating from planned routes.",
    icon: "map-marker-alert",
    iconColor: "#57BAFF",
  },
  {
    title: "Day-wise Safety Plan",
    body: "Real-time risk assessment for your route. Daily safety scores, hotspot alerts, and safer-route suggestions.",
    icon: "calendar-check",
    iconColor: "#57BAFF",
  },
];

function FenceIcon({ stroke = "#000", width = 24, height = 24 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 8h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 18h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 8h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 18h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlanIcon({ stroke = "#000", width = 24, height = 24 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 6h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 10h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 14h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 18h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SosIcon({ stroke = "#000", width = 24, height = 24 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8v4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 16h.01" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AnimatedFeatureCard({
  feature,
  index,
  play,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  play: boolean;
}) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);

  useEffect(() => {
    if (!play) {
      return;
    }

    const delay = 220 + index * 120;
    cardOpacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    cardTranslateY.value = withDelay(
      delay,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
  }, [cardOpacity, cardTranslateY, index, play]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.featureCard, cardStyle]}>
      <View style={styles.cardContent}>
        <View style={[styles.iconCircle, { backgroundColor: `${feature.iconColor}80` }]}>
          {feature.icon === "alarm-light" && <SosIcon stroke="#000000" width={26} height={26} />}
          {feature.icon === "map-marker-alert" && <FenceIcon stroke="#000000" width={26} height={26} />}
          {feature.icon === "calendar-check" && <PlanIcon stroke="#000000" width={26} height={26} />}
        </View>
        <View style={styles.textContent}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureBody}>{feature.body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function OnboardingPage2({ isActive = false }: { isActive?: boolean }) {
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(18);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    headerOpacity.value = withTiming(1, { duration: 420 });
    headerTranslateY.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [headerOpacity, headerTranslateY, isActive]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.textBlock, headerStyle]}>
        <Text style={styles.title}>Your Digital{"\n"}Bodyguard</Text>
        <Text style={styles.subtitle}>
          Stay protected with intelligent features designed for modern travel safety
        </Text>
      </Animated.View>

      <View style={styles.featureList}>
        {FEATURES.map((feature, index) => (
          <AnimatedFeatureCard key={feature.title} feature={feature} index={index} play={isActive} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  textBlock: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
    color: "#000000",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    color: "#4B5563",
    textAlign: "center",
  },
  featureList: {
    marginTop: 25,
    width: "100%",
    maxWidth: 355,
    gap: 18,
  },
  featureCard: {
    width: "100%",
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    // shadows removed to keep flat card design (no elevation/shadow)
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    padding: 18,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContent: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    color: "#1F2937",
    marginBottom: 6,
  },
  featureBody: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    color: "#6B7280",
  },
});
