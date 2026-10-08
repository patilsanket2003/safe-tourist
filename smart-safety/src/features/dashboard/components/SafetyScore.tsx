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
      return { label: "EXCELLENT", color: "#4CAF7A", bgColor: "#D1F0E4" };
    if (score >= 60)
      return { label: "GOOD", color: "#5B8BD4", bgColor: "#D4EBFC" };
    if (score >= 40)
      return { label: "MODERATE", color: "#E0A54B", bgColor: "#FCECD4" };
    return { label: "LOW", color: "#D66A6A", bgColor: "#FADED9" };
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
                color="#3B82F6"
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
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
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
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
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
    color: "#1F2937",
    lineHeight: 52,
  },
  scoreMax: {
    fontSize: 20,
    fontWeight: "500",
    color: "#9CA3AF",
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 18,
    lineHeight: 22,
  },
  progressContainer: {
    width: "100%",
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  lastUpdate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "500",
  },
});
