import { type ComponentType, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, useWindowDimensions, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import OnboardingPage1 from "../pages/OnboardingPage1";
import OnboardingPage2 from "../pages/OnboardingPage2";
import OnboardingPage3 from "../pages/OnboardingPage3";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const PAGES = [OnboardingPage1, OnboardingPage2, OnboardingPage3];

export default function OnboardingScreen({ navigation }: any) {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<"solo" | "group-member" | "tour-admin" | null>(null);
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const badgeScale = useSharedValue(1);
  const badgeRotation = useSharedValue(0);
  const badgeProgress = useSharedValue(PAGES.length > 0 ? 1 / PAGES.length : 0);

  const goNext = () => {
    if (index < PAGES.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      try {
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      } catch (e) {
        try {
          listRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
        } catch (_) {}
      }
    } else {
      navigation.navigate("Login", { role: selectedRole || "solo" });
    }
  };

  const goBack = () => {
    if (index > 0) {
      listRef.current?.scrollToIndex({ index: index - 1, animated: true });
    }
  };

  useEffect(() => {
    const nextProgress = PAGES.length > 0 ? (index + 1) / PAGES.length : 0;
    badgeProgress.value = withTiming(nextProgress, { duration: 350, easing: Easing.out(Easing.cubic) });
    badgeScale.value = withSequence(
      withTiming(1.08, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
    );
    badgeRotation.value = withSequence(
      withTiming(6, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) })
    );
  }, [badgeProgress, badgeRotation, badgeScale, index]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotation.value}deg` },
    ] as ViewStyle["transform"],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.skipButton}
        onPress={() => navigation.navigate("Login", { role: "solo" })}
      >
        <Text style={styles.skipText}>Skip →</Text>
      </Pressable>

      {index > 0 && (
        <Pressable
          style={styles.backButton}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go to previous onboarding page"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#171725" />
        </Pressable>
      )}

      <Animated.FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, pageIndex) => `onboarding-${pageIndex}`}
        renderItem={({ item: Page, index: pageIndex }) => (
          <OnboardingPageItem
            Page={Page}
            pageIndex={pageIndex}
            width={width}
            scrollX={scrollX}
            isActive={pageIndex === index}
            onRoleSelected={pageIndex === 2 ? setSelectedRole : undefined}
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
          );
          setIndex(nextIndex);
        }}
      />

      <Pressable
        style={styles.accentWrapper}
        onPress={goNext}
        accessibilityRole="button"
        accessibilityLabel={index === PAGES.length - 1 ? "Continue to login" : "Next onboarding page"}
      >
        <Animated.View style={badgeAnimatedStyle}>
          <AnimatedAccentBadge size={96} progress={badgeProgress} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function OnboardingPageItem({
  Page,
  pageIndex,
  width,
  scrollX,
  isActive,
  onRoleSelected,
}: {
  Page: ComponentType<{ isActive?: boolean; onRoleSelected?: (role: "solo" | "group-member" | "tour-admin" | null) => void }>;
  pageIndex: number;
  width: number;
  scrollX: SharedValue<number>;
  isActive: boolean;
  onRoleSelected?: (role: "solo" | "group-member" | "tour-admin" | null) => void;
}) {
  const pageStyle = useAnimatedStyle(() => {
    const inputRange = [
      (pageIndex - 1) * width,
      pageIndex * width,
      (pageIndex + 1) * width,
    ];
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolate.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [18, 0, 18], Extrapolate.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale }] as ViewStyle["transform"],
    };
  });

  return (
    <View style={[styles.page, { width }]}>
      <Animated.View style={[styles.pageInner, pageStyle]}>
        <Page isActive={isActive} onRoleSelected={onRoleSelected} />
      </Animated.View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedAccentBadge({
  size = 96,
  progress,
}: {
  size?: number;
  progress: SharedValue<number>;
}) {
  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = size * 0.369;
  const arcRadius = size * 0.478;
  const strokeWidth = Math.max(2, size * 0.043);
  const circumference = 2 * Math.PI * arcRadius;
  const arrowStroke = Math.max(1.5, size * 0.022);
  const arrowWidth = size * 0.14;
  const arrowHead = size * 0.07;

  const animatedArcProps = useAnimatedProps(() => {
    const clampedProgress = Math.min(1, Math.max(0.1, progress.value));
    const dashLength = circumference * clampedProgress;
    return {
      strokeDasharray: `${dashLength} ${size * 4}`,
    };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={outerRadius} fill="#B6DBF5" />
      <Circle cx={center} cy={center} r={innerRadius} fill="#0C87DE" />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={arcRadius}
        stroke="#263238"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-120 ${center} ${center})`}
        animatedProps={animatedArcProps}
      />
      <Line
        x1={center - arrowWidth / 2}
        y1={center}
        x2={center + arrowWidth / 2}
        y2={center}
        stroke="#FFFFFF"
        strokeWidth={arrowStroke}
        strokeLinecap="round"
      />
      <Polyline
        points={`${center},${center - arrowHead} ${center + arrowHead},${center} ${center},${center + arrowHead}`}
        stroke="#FFFFFF"
        strokeWidth={arrowStroke}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  page: {
    width: "100%",
  },
  pageInner: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 67,
    left: 30,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  accentWrapper: {
    position: "absolute",
    right: 24,
    bottom: 24,
    zIndex: 9999,
    cursor: "pointer",
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 24,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(12, 135, 222, 0.12)",
    cursor: "pointer",
  },
  skipText: {
    color: "#0C87DE",
    fontSize: 15,
    fontWeight: "700",
  },
});
