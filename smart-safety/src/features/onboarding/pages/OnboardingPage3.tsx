import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Platform, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { Svg, Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const PROFILES = [
  {
    role: "solo",
    title: "Solo travelers",
    body: "Personal safety on the go one-tap SOS, live location sharing, and route tracking for solo trips.",
    icon: "account",
  },
  {
    role: "group-member",
    title: "Group Member",
    body: "Stay connected with your group receive geofence alerts, deviation warnings, and shared updates.",
    icon: "account-multiple",
  },
  {
    role: "tour-admin",
    title: "Group Admin / Guide",
    body: "Manage group safety real-time risk insights, hotspot alerts, daily safety scores, and safer-route guidance.",
    icon: "account-tie",
  },
];

function SoloIcon({ color = "#000", width = 26, height = 26 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M12 14.25C8.55 14.25 5.75 17.05 5.75 20.5C5.75 20.91 5.41 21.25 5 21.25C4.59 21.25 4.25 20.91 4.25 20.5C4.25 17.3105 6.19168 14.5617 8.95394 13.3749C7.33129 12.3571 6.25 10.5522 6.25 8.5C6.25 5.33 8.83 2.75 12 2.75C15.17 2.75 17.75 5.33 17.75 8.5C17.75 10.5522 16.6687 12.3571 15.0461 13.3749C17.8083 14.5617 19.75 17.3105 19.75 20.5C19.75 20.91 19.41 21.25 19 21.25C18.59 21.25 18.25 20.91 18.25 20.5C18.25 17.05 15.45 14.25 12 14.25ZM12 12.75C9.66 12.75 7.75 10.84 7.75 8.5C7.75 6.16 9.66 4.25 12 4.25C14.34 4.25 16.25 6.16 16.25 8.5C16.25 10.84 14.34 12.75 12 12.75Z" fill={color} />
    </Svg>
  );
}

function GroupIcon({ color = "#000", width = 26, height = 26 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M16.4449 12.2519C16.3193 12.2503 16.1937 12.2433 16.0688 12.231C15.819 13.0551 15.3247 13.7749 14.6709 14.3052C16.786 15.2281 18.25 17.2117 18.25 19.5039C18.25 19.9139 17.91 20.2539 17.5 20.2539C17.09 20.2539 16.75 19.9139 16.75 19.5039C16.75 17.1639 14.62 15.2539 12 15.2539C9.38 15.2539 7.25 17.1639 7.25 19.5039C7.25 19.9139 6.91 20.2539 6.5 20.2539C6.09 20.2539 5.75 19.9139 5.75 19.5039C5.75 17.2117 7.21396 15.2281 9.32906 14.3052C8.67845 13.7775 8.18571 13.062 7.93482 12.2428C7.79195 12.2569 7.64715 12.2639 7.5 12.2639V12.2539C4.88 12.2539 2.75 14.1639 2.75 16.5039C2.75 16.9139 2.41 17.2539 2 17.2539C1.59 17.2539 1.25 16.9139 1.25 16.5039C1.25 14.2117 2.71396 12.2281 4.82906 11.3052C3.86691 10.5248 3.25 9.33378 3.25 8.00391C3.25 5.66391 5.16 3.75391 7.5 3.75391C9.41086 3.75391 11.04 5.00247 11.5704 6.77554C11.7117 6.76124 11.855 6.75391 12 6.75391C12.144 6.75391 12.2864 6.76114 12.4268 6.77526C12.9527 5.00241 14.5775 3.74219 16.5002 3.74219C18.8402 3.74219 20.7502 5.65219 20.7502 7.99219C20.7502 9.32642 20.1292 10.5209 19.1616 11.3011C21.2817 12.2223 22.75 14.2084 22.75 16.5039C22.75 16.9139 22.41 17.2539 22 17.2539C21.59 17.2539 21.25 16.9139 21.25 16.5039C21.25 14.1639 19.12 12.2539 16.5 12.2539C16.4815 12.2539 16.4631 12.2532 16.4449 12.2519ZM7.60761 10.7618C7.57242 10.7566 7.53649 10.7539 7.5 10.7539C7.43319 10.7539 7.36662 10.7549 7.30032 10.7568C5.87372 10.6547 4.75 9.46676 4.75 8.01392C4.75 6.49392 5.98 5.26392 7.5 5.26392C8.73026 5.26392 9.78036 6.05956 10.1301 7.18913C8.79396 7.84803 7.84971 9.18895 7.75743 10.7518C7.70757 10.7565 7.65761 10.7598 7.60761 10.7618ZM14.7275 11.3578C14.5541 12.7103 13.4001 13.7539 12 13.7539C10.6004 13.7539 9.44664 12.711 9.27268 11.3591C9.27229 11.312 9.26752 11.2644 9.25809 11.2167C9.25273 11.1465 9.25 11.0755 9.25 11.0039C9.25 9.78695 10.0384 8.75589 11.1329 8.39313C11.1805 8.38366 11.2264 8.36966 11.27 8.35164C11.5025 8.28792 11.7472 8.25391 12 8.25391C13.52 8.25391 14.75 9.48391 14.75 11.0039C14.75 11.0698 14.7477 11.1351 14.7432 11.1998C14.7323 11.2526 14.7272 11.3056 14.7275 11.3578ZM16.2419 10.7404C16.3264 10.7483 16.4123 10.7522 16.5002 10.7522C18.0202 10.7522 19.2502 9.5222 19.2502 8.0022C19.2502 6.4822 18.0202 5.2522 16.5002 5.2522C15.2662 5.2522 14.2135 6.05266 13.867 7.18767C15.2014 7.84445 16.1456 9.18128 16.2419 10.7404Z" fill={color} />
    </Svg>
  );
}

function AdminIcon({ color = "#000", width = 26, height = 26 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M12.0001 1.25195C14.609 1.25195 17.0401 1.82962 19.0431 2.82617C19.9635 3.28414 20.6145 3.59365 21.1886 4.5205C21.7721 5.46254 21.7501 6.40259 21.7501 7.75V11.2393C21.75 17.3759 16.8468 20.7254 14.17 22.1026C13.4327 22.482 12.9236 22.752 12.0001 22.752C11.0766 22.752 10.5675 22.482 9.83019 22.1026C7.15344 20.7254 2.25024 17.3758 2.25011 11.2393V7.75C2.25011 6.40261 2.22818 5.46252 2.81163 4.5205C3.38573 3.59364 4.03671 3.28412 4.95714 2.82617C6.96009 1.82961 9.3912 1.25197 12.0001 1.25195ZM12.7501 11.752V21.1192C12.9432 21.044 13.1656 20.9322 13.4835 20.7686C15.9824 19.483 19.9744 16.6643 20.2364 11.752H12.7501ZM3.76378 11.752C4.02583 16.6643 8.01782 19.4829 10.5167 20.7686C10.8344 20.932 11.0571 21.043 11.2501 21.1182V11.752H3.76378ZM12.7501 10.252H20.2501V7.75C20.2501 6.28626 20.2288 5.8202 19.9132 5.31054C19.5882 4.78585 19.3102 4.63422 18.3751 4.16894C16.7812 3.37593 14.8522 2.86881 12.7501 2.7705V10.252ZM11.2501 2.7705C9.14808 2.86884 7.21896 3.37593 5.62511 4.16894C4.69001 4.6342 4.41203 4.78583 4.08702 5.31054C3.77139 5.82018 3.75011 6.2863 3.75011 7.75V10.252H11.2501V2.7705Z" fill={color} />
    </Svg>
  );
}

function AnimatedProfileCard({
  profile,
  index,
  isSelected,
  onPress,
  play,
}: {
  profile: (typeof PROFILES)[number];
  index: number;
  isSelected: boolean;
  onPress: () => void;
  play: boolean;
}) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);
  const cardScale = useSharedValue(1);

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

  useEffect(() => {
    cardScale.value = withSpring(isSelected ? 1.02 : 1, { damping: 14, stiffness: 180 });
  }, [cardScale, isSelected]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: cardScale.value }] as ViewStyle["transform"],
  }));

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onPress}
        style={[styles.card, isSelected ? styles.cardSelected : styles.cardDefault]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${profile.title}. ${profile.body}`}
        android_ripple={{ color: "#E8F4FF" }}
      >
        <View style={[styles.iconWrap, isSelected ? styles.iconWrapSelected : styles.iconWrapDefault]}>
          {profile.title.includes("Solo") && (
            <SoloIcon color="#484848" width={26} height={26} />
          )}
          {profile.title.includes("Group Member") && (
            <GroupIcon color="#484848" width={26} height={26} />
          )}
          {profile.title.includes("Admin") && (
            <AdminIcon color="#484848" width={26} height={26} />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>{profile.title}</Text>
          <Text style={styles.cardBody} numberOfLines={3}>{profile.body}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingPage3({ 
  isActive = false, 
  onRoleSelected 
}: { 
  isActive?: boolean;
  onRoleSelected?: (role: "solo" | "group-member" | "tour-admin" | null) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const navigation = useNavigation<any>();

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

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const selectedRole = PROFILES[index].role as "solo" | "group-member" | "tour-admin";
    onRoleSelected?.(selectedRole);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.textBlock, headerStyle]}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Select the profile that best describes how you'll use Smart Safety.</Text>
      </Animated.View>

      <View style={styles.cardList}>
        {PROFILES.map((profile, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <AnimatedProfileCard
              key={profile.title}
              profile={profile}
              index={idx}
              isSelected={isSelected}
              onPress={() => handleSelect(idx)}
              play={isActive}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
  },
  textBlock: {
    width: "100%",
    maxWidth: 328,
    alignItems: "center",
    alignSelf: "center",
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 41,
    color: "#000000",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
    color: "#000000",
    textAlign: "center",
  },
  cardList: {
    marginTop: 52,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    minHeight: 109,
    borderRadius: 12,
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardDefault: {
    backgroundColor: "#FFFFFF",
  },
  cardSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0C87DE",
    borderWidth: 2,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDefault: {
    backgroundColor: "#F3F4F6",
  },
  iconWrapSelected: {
    backgroundColor: "#57BAFF80",
  },
  textWrap: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    color: "#2A282F",
  },
  cardBody: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    color: "#625F68",
  },
});
