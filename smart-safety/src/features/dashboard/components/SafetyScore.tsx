import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SafetyScore() {
  const { state } = useApp();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const score = state.computedSafetyScore ?? state.user?.safetyScore ?? null;

  useEffect(() => {
    if (score !== null) {
      setLastUpdateTime(new Date());
    }
  }, [score]);

  const displayScore = score ?? 0;
  const isLoading = score === null;

  // Badge and color based on score
  const getScoreInfo = (score: number) => {
    if (score >= 80)
      return { label: "EXCELLENT", color: "#10B981", bgColor: "rgba(16, 185, 129, 0.18)" };
    if (score >= 60)
      return { label: "GOOD", color: "#F97316", bgColor: "rgba(249, 115, 22, 0.18)" };
    if (score >= 40)
      return { label: "MODERATE", color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.18)" };
    return { label: "LOW", color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.18)" };
  };

  const scoreInfo = getScoreInfo(displayScore);

  const getDescription = (score: number) => {
    if (score >= 80)
      return "Very Safe Area • Low crime rate reported recently.";
    if (score >= 60) return "Generally Safe • Some caution advised.";
    if (score >= 40) return "Moderate Risk • Stay alert and aware.";
    return "High Risk Area • Exercise extreme caution.";
  };

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);

    if (diff < 60) return "Updated just now";
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
    return `Updated ${lastUpdateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color="#F97316"
              />
            </View>
            <Text style={styles.title}>Safety Score</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: scoreInfo.bgColor }]}>
            <Text style={[styles.badgeText, { color: scoreInfo.color }]}>
              {scoreInfo.label}
            </Text>
          </View>
        </View>

        {/* Score Display */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>
            {isLoading ? "--" : displayScore}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {isLoading
            ? "Calculating safety score..."
            : getDescription(displayScore)}
        </Text>

        {/* Last Update Timestamp */}
        {lastUpdateTime && (
          <Text style={styles.lastUpdate}>{formatLastUpdate()}</Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: isLoading ? "0%" : `${displayScore}%`,
                  backgroundColor: scoreInfo.color,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 52,
  },
  scoreMax: {
    fontSize: 20,
    fontWeight: "500",
    color: "#71717A",
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    fontWeight: "500",
    color: "#A1A1AA",
    marginBottom: 18,
    lineHeight: 22,
  },
  progressContainer: {
    width: "100%",
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#27272A",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  lastUpdate: {
    fontSize: 11,
    color: "#71717A",
    marginTop: 4,
    fontWeight: "500",
  },
});
