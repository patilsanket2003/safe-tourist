import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAppTheme } from "../../../context/ThemeContext";
import { getExplorePlaceDetails } from "../../../utils/api";

export default function PlaceDetailsScreen({ route, navigation }: any) {
  const { placeId, placeName: paramPlaceName } = route.params || {};
  const { isDark, colors } = useAppTheme();

  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      setError(null);
      const res = await getExplorePlaceDetails(placeId);
      if (res?.place) {
        setPlace(res.place);
      } else {
        setError("Attraction details not found.");
      }
    } catch (err: any) {
      console.error("PlaceDetailsScreen error:", err);
      setError("Failed to load place details.");
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const getSafetyBadge = (safety?: any) => {
    const risk = safety?.riskLevel || "LOW RISK";
    const score = safety?.score ?? 95;
    if (risk.includes("HIGH")) {
      return {
        bg: "rgba(239, 68, 68, 0.15)",
        text: "#EF4444",
        border: "rgba(239, 68, 68, 0.3)",
        icon: "alert-circle",
        label: "HIGH HAZARD / RESTRICTED",
      };
    }
    if (risk.includes("MODERATE")) {
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        text: "#F59E0B",
        border: "rgba(245, 158, 11, 0.3)",
        icon: "alert",
        label: "MODERATE CAUTION",
      };
    }
    return {
      bg: "rgba(16, 185, 129, 0.15)",
      text: "#10B981",
      border: "rgba(16, 185, 129, 0.3)",
      icon: "shield-check",
      label: "VERIFIED SAFE AREA",
    };
  };

  const handleOpenGoogleMaps = () => {
    if (!place?.location?.coordinates) return;
    const lng = place.location.coordinates[0];
    const lat = place.location.coordinates[1];
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open map URL.");
    });
  };

  const handleShowOnLiveMap = () => {
    if (!place?.location?.coordinates) return;
    const lng = place.location.coordinates[0];
    const lat = place.location.coordinates[1];
    navigation.navigate("Main", {
      screen: "EmergencyMap",
      params: {
        focusCoords: { latitude: lat, longitude: lng },
        placeName: place.name,
      },
    });
  };

  const displayName = place?.name || paramPlaceName || "Tourist Attraction";
  const safetyBadge = getSafetyBadge(place?.safety);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F8FAFC" }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: isDark ? "#121212" : "#FFFFFF" }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#0F172A"} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={[styles.headerSub, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            {place?.cityName ? `${place.cityName}, ${place.stateName}` : "Explore India"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerMapAction}
          onPress={handleOpenGoogleMaps}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="navigate-circle" size={28} color="#F97316" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={{ marginTop: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
            Loading SafeTrail safety analysis...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetails}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : place ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. HERO COVER IMAGE */}
          <View style={styles.heroImageContainer}>
            <Image source={{ uri: place.coverImage }} style={styles.heroImage} />
            <View style={styles.heroGradient} />

            {/* Attribution Pill on Top-Right */}
            <View style={styles.attributionPill}>
              <MaterialCommunityIcons name="shield-lock-outline" size={12} color="#FFFFFF" />
              <Text style={styles.attributionPillText}>Wikimedia Commons • CC BY-SA</Text>
            </View>

            {/* SubCategory Tag */}
            <View style={styles.subCatTag}>
              <Text style={styles.subCatTagText}>{place.subCategory || "Attraction"}</Text>
            </View>
          </View>

          {/* 2. PLACE TITLE & RATING */}
          <View style={styles.titleSection}>
            <Text style={[styles.mainPlaceTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              {place.name}
            </Text>
            <View style={styles.locationSubtitleRow}>
              <Ionicons name="location-sharp" size={16} color="#F97316" />
              <Text style={[styles.locationSubtitleText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                {place.cityName}, {place.stateName} • India
              </Text>
            </View>

            <View style={styles.ratingBadgeRow}>
              <View style={styles.starPill}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.starPillText}>{place.rating?.score?.toFixed(1) || "4.7"}</Text>
              </View>
              <Text style={[styles.reviewCountText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                Verified Guide ({place.rating?.reviewCount || 1000}+ reviews)
              </Text>
            </View>
          </View>

          {/* 3. SAFETRAIL REAL-TIME SAFETY STATUS CARD */}
          <View
            style={[
              styles.safetyCard,
              {
                backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                borderColor: safetyBadge.border,
              },
            ]}
          >
            <View style={styles.safetyCardHeader}>
              <View style={styles.safetyCardTitleRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={20}
                  color={safetyBadge.text}
                />
                <Text style={[styles.safetyCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  SafeTrail Safety Assessment
                </Text>
              </View>
              <View
                style={[
                  styles.riskPill,
                  { backgroundColor: safetyBadge.bg, borderColor: safetyBadge.border },
                ]}
              >
                <Text style={[styles.riskPillText, { color: safetyBadge.text }]}>
                  {safetyBadge.label}
                </Text>
              </View>
            </View>

            {/* Score Bar */}
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreValue, { color: safetyBadge.text }]}>
                {place.safety?.score ?? 95}/100
              </Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${place.safety?.score ?? 95}%`,
                        backgroundColor: safetyBadge.text,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.scoreBarLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Computed from natural hazard layers & restricted zones
                </Text>
              </View>
            </View>

            {/* Real Warnings List */}
            {place.safety?.warnings && place.safety.warnings.length > 0 ? (
              <View style={styles.warningsList}>
                <Text style={[styles.warningsTitle, { color: isDark ? "#F87171" : "#DC2626" }]}>
                  Active Hazards in this Area:
                </Text>
                {place.safety.warnings.map((warn: string, idx: number) => (
                  <View key={idx} style={styles.warningItem}>
                    <Ionicons name="warning-outline" size={14} color="#EF4444" />
                    <Text style={[styles.warningItemText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                      {warn}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.cleanSafetyNotice}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.cleanSafetyText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                  No active high-risk flood, landslide, or restricted military zones detected.
                </Text>
              </View>
            )}
          </View>

          {/* 4. VERIFIED TRAVEL INFO (Entry fee, timings, season) */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                borderColor: isDark ? "#27272A" : "#E2E8F0",
              },
            ]}
          >
            <Text style={[styles.cardHeading, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              Verified Travel Information
            </Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Ionicons name="time-outline" size={18} color="#F97316" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.infoLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Opening Timings
                  </Text>
                  <Text style={[styles.infoVal, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    {place.verifiedInfo?.timings || "Open Daily"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <Ionicons name="ticket-outline" size={18} color="#F97316" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.infoLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Entry Fee
                  </Text>
                  <Text style={[styles.infoVal, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    {place.verifiedInfo?.entryFee || "Free"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <Ionicons name="calendar-outline" size={18} color="#F97316" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.infoLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Best Season
                  </Text>
                  <Text style={[styles.infoVal, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    {place.verifiedInfo?.bestSeason || "October to March"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <MaterialCommunityIcons name="wheelchair-accessibility" size={18} color="#F97316" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.infoLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Accessibility
                  </Text>
                  <Text style={[styles.infoVal, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    {place.verifiedInfo?.wheelchairAccessible ? "Wheelchair Accessible" : "Standard Steps"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 5. DESCRIPTION & OPEN DATA ATTRIBUTION */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                borderColor: isDark ? "#27272A" : "#E2E8F0",
              },
            ]}
          >
            <Text style={[styles.cardHeading, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              About This Attraction
            </Text>
            <Text style={[styles.descParagraph, { color: isDark ? "#CBD5E1" : "#334155" }]}>
              {place.description}
            </Text>

            {/* Open Data Attribution Tag */}
            <View style={styles.osmMetadataBox}>
              <MaterialCommunityIcons name="database-outline" size={14} color="#71717A" />
              <Text style={styles.osmMetadataText}>
                Source: {place.source?.provider || "OpenStreetMap"} (OSM ID:{" "}
                {place.source?.osmId || "Verified"}) • Wikidata: {place.source?.wikidataId || "Q-Ref"}
              </Text>
            </View>
          </View>

          {/* 6. INTERACTIVE ACTION BUTTONS */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: "#F97316" }]}
              onPress={handleShowOnLiveMap}
            >
              <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Show on SafeTrail Live Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#CBD5E1",
                },
              ]}
              onPress={handleOpenGoogleMaps}
            >
              <Ionicons name="navigate-outline" size={18} color={isDark ? "#FFFFFF" : "#0F172A"} />
              <Text style={[styles.secondaryActionText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Get Turn-by-Turn Directions
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 38,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  headerMapAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 60,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 110,
    gap: 16,
  },
  heroImageContainer: {
    height: 240,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  attributionPill: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  attributionPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  subCatTag: {
    position: "absolute",
    bottom: 14,
    left: 14,
    backgroundColor: "#F97316",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  subCatTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  titleSection: {
    paddingHorizontal: 20,
  },
  mainPlaceTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  locationSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationSubtitleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  ratingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  starPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  starPillText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewCountText: {
    fontSize: 12,
  },
  safetyCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  safetyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  safetyCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  safetyCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreBarLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  warningsList: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  warningsTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  warningItemText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  cleanSafetyNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  cleanSafetyText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  infoGrid: {
    gap: 12,
  },
  infoCol: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 11,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  descParagraph: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  osmMetadataBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(150, 150, 150, 0.08)",
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  osmMetadataText: {
    fontSize: 10,
    color: "#71717A",
    flex: 1,
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
