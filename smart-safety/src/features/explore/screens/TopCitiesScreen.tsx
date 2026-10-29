import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../context/ThemeContext";
import { getExploreCitiesByCategory, getExploreStates } from "../../../utils/api";

const CATEGORY_META: Record<string, { title: string; subtitle: string; icon: string; banner: string }> = {
  "all": {
    title: "All Destinations",
    subtitle: "Explore mountains, beaches, and historic wonders across India",
    icon: "compass",
    banner: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  },
  "sea-beaches": {
    title: "Sea & Beaches",
    subtitle: "Coastal paradises, golden sand shores and ocean adventures",
    icon: "weather-sunny",
    banner: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
  },
  "mountains-nature": {
    title: "Mountains & Nature",
    subtitle: "High-altitude peaks, misty valleys, pine forests and serene retreats",
    icon: "image-filter-hdr",
    banner: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  },
  "historic-places": {
    title: "Historic Places",
    subtitle: "UNESCO World Heritage sites, royal palaces and ancient ruins",
    icon: "castle",
    banner: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
  },
};

const CATEGORY_FILTERS = [
  { id: "all", label: "All Categories" },
  { id: "mountains-nature", label: "Mountains & Nature" },
  { id: "sea-beaches", label: "Sea & Beaches" },
  { id: "historic-places", label: "Historic Places" },
];

export default function TopCitiesScreen({ route, navigation }: any) {
  const { categoryId: paramCategoryId = "all", categoryTitle, stateId: initialSelectedState = "all" } =
    route.params || {};

  const { isDark, colors } = useAppTheme();
  const [activeCategory, setActiveCategory] = useState<string>(paramCategoryId);
  const [cities, setCities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<string>(initialSelectedState);
  const [sortOption, setSortOption] = useState<string>("rank");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const meta = CATEGORY_META[activeCategory] || {
    title: categoryTitle || "Explore Destinations",
    subtitle: "Top ranked verified destinations in India",
    icon: "compass",
    banner: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  };

  const fetchCities = useCallback(async () => {
    try {
      const [citiesRes, statesRes] = await Promise.all([
        getExploreCitiesByCategory(activeCategory, {
          search,
          stateId: selectedState === "all" ? undefined : selectedState,
          sort: sortOption,
          limit: 40,
        }),
        getExploreStates().catch(() => ({ states: [] })),
      ]);

      if (citiesRes?.cities) {
        setCities(citiesRes.cities);
      }
      if (statesRes?.states) {
        setStates(statesRes.states);
      }
    } catch (err) {
      console.error("TopCitiesScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, selectedState, sortOption, search]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCities();
  };

  const getSafetyBadge = (safety?: any) => {
    const risk = safety?.riskLevel || "LOW RISK";
    const score = safety?.score ?? 95;
    if (risk.includes("HIGH")) {
      return {
        bg: "rgba(239, 68, 68, 0.15)",
        text: "#EF4444",
        border: "rgba(239, 68, 68, 0.3)",
        icon: "alert-circle",
        label: "HIGH HAZARD ZONE",
      };
    }
    if (risk.includes("MODERATE")) {
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        text: "#F59E0B",
        border: "rgba(245, 158, 11, 0.3)",
        icon: "alert",
        label: "MODERATE RISK",
      };
    }
    return {
      bg: "rgba(16, 185, 129, 0.15)",
      text: "#10B981",
      border: "rgba(16, 185, 129, 0.3)",
      icon: "shield-check",
      label: "VERIFIED SAFE",
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F8FAFC" }]}>
      {/* Top App Bar */}
      <View style={[styles.header, { backgroundColor: isDark ? "#121212" : "#FFFFFF" }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#0F172A"} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
            {meta.title}
          </Text>
          <Text style={[styles.headerSub, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            Top Ranked Destinations
          </Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={[styles.filterBar, { backgroundColor: isDark ? "#121212" : "#FFFFFF" }]}>
        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={isDark ? "#94A3B8" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder={`Search ${meta.title} destinations...`}
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: isDark ? "#FFFFFF" : "#0F172A" }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#71717A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.stateChipContainer, { paddingBottom: 6 }]}
        >
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                activeCategory === cat.id
                  ? styles.filterChipActive
                  : {
                      backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === cat.id
                    ? styles.filterChipTextActive
                    : { color: isDark ? "#A1A1AA" : "#475569" },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* State Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stateChipContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedState === "all"
                ? styles.filterChipActive
                : {
                    backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
            ]}
            onPress={() => setSelectedState("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedState === "all" ? styles.filterChipTextActive : { color: isDark ? "#A1A1AA" : "#475569" },
              ]}
            >
              All States
            </Text>
          </TouchableOpacity>

          {states.map((st) => (
            <TouchableOpacity
              key={st.stateId}
              style={[
                styles.filterChip,
                selectedState === st.stateId
                  ? styles.filterChipActive
                  : {
                      backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
              ]}
              onPress={() => setSelectedState(st.stateId)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedState === st.stateId
                    ? styles.filterChipTextActive
                    : { color: isDark ? "#A1A1AA" : "#475569" },
                ]}
              >
                {st.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sorting options bar */}
        <View style={styles.sortBarRow}>
          <Text style={[styles.sortLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Sort by:</Text>
          <TouchableOpacity
            style={[styles.sortPill, sortOption === "rank" && styles.sortPillActive]}
            onPress={() => setSortOption("rank")}
          >
            <Text style={[styles.sortPillText, sortOption === "rank" && styles.sortPillTextActive]}>
              Ranked #1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortPill, sortOption === "name" && styles.sortPillActive]}
            onPress={() => setSortOption("name")}
          >
            <Text style={[styles.sortPillText, sortOption === "name" && styles.sortPillTextActive]}>
              A - Z
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortPill, sortOption === "attractions" && styles.sortPillActive]}
            onPress={() => setSortOption("attractions")}
          >
            <Text
              style={[styles.sortPillText, sortOption === "attractions" && styles.sortPillTextActive]}
            >
              Attractions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cities List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ marginTop: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
              Fetching ranked destinations...
            </Text>
          </View>
        ) : cities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color="#71717A" />
            <Text style={[styles.emptyTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              No destinations match your filters
            </Text>
            <Text style={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 13, marginTop: 4 }}>
              Try clearing the state filter or searching for another city.
            </Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSelectedState("all");
                setSearch("");
              }}
            >
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cities.map((city, index) => {
            const badge = getSafetyBadge(city.safety);
            return (
              <TouchableOpacity
                key={city.cityId}
                activeOpacity={0.88}
                style={[
                  styles.cityCard,
                  {
                    backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                    borderColor: isDark ? "#27272A" : "#E2E8F0",
                  },
                ]}
                onPress={() =>
                  navigation.navigate("CityPlaces", {
                    cityId: city.cityId,
                    cityName: city.name,
                    initialCategory: activeCategory,
                  })
                }
              >
                <View style={styles.cityCardImageContainer}>
                  <Image source={{ uri: city.coverImage }} style={styles.cityCardImage} />
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>#{index + 1} in {meta.title}</Text>
                  </View>
                  <View style={styles.attractionPill}>
                    <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
                    <Text style={styles.attractionPillText}>
                      {city.attractionCount || 0} Attractions
                    </Text>
                  </View>
                </View>

                <View style={styles.cityCardBody}>
                  <View style={styles.cityNameRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.cityName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}
                        numberOfLines={1}
                      >
                        {city.name}
                      </Text>
                      <View style={styles.stateRow}>
                        <Ionicons name="location-sharp" size={14} color="#F97316" />
                        <Text style={[styles.stateName, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                          {city.stateName}
                        </Text>
                      </View>
                    </View>

                    {/* SafeTrail Live Safety Indicator */}
                    <View
                      style={[
                        styles.safetyBadge,
                        { backgroundColor: badge.bg, borderColor: badge.border },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={badge.icon as any}
                        size={14}
                        color={badge.text}
                      />
                      <Text style={[styles.safetyBadgeText, { color: badge.text }]}>
                        {city.safety?.riskLevel || "LOW RISK"} ({city.safety?.score ?? 95})
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.cityDesc, { color: isDark ? "#A1A1AA" : "#475569" }]}
                    numberOfLines={2}
                  >
                    {city.shortDescription}
                  </Text>

                  {/* Safety Warning Pill if any */}
                  {city.safety?.warnings && city.safety.warnings.length > 0 && (
                    <View
                      style={[
                        styles.warningBox,
                        {
                          backgroundColor:
                            city.safety.riskLevel === "HIGH RISK"
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="alert-outline"
                        size={14}
                        color={city.safety.riskLevel === "HIGH RISK" ? "#EF4444" : "#F59E0B"}
                      />
                      <Text
                        style={[
                          styles.warningText,
                          {
                            color:
                              city.safety.riskLevel === "HIGH RISK" ? "#EF4444" : "#F59E0B",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {city.safety.warnings[0]}
                      </Text>
                    </View>
                  )}

                  {/* Bottom Action Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.weatherInfo}>
                      <Ionicons
                        name="cloud-outline"
                        size={14}
                        color={isDark ? "#94A3B8" : "#64748B"}
                      />
                      <Text
                        style={[styles.weatherText, { color: isDark ? "#94A3B8" : "#64748B" }]}
                      >
                        {city.weatherInfo?.bestSeason || "Best: Oct - Mar"}
                      </Text>
                    </View>

                    <View style={styles.exploreActionBtn}>
                      <Text style={styles.exploreActionText}>View Places</Text>
                      <Ionicons name="chevron-forward" size={15} color="#F97316" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.1)",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  stateChipContainer: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sortBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  sortPillActive: {
    backgroundColor: "rgba(249, 115, 22, 0.15)",
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
  },
  sortPillTextActive: {
    color: "#F97316",
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingBottom: 90,
    gap: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: "#F97316",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cityCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cityCardImageContainer: {
    height: 160,
    position: "relative",
  },
  cityCardImage: {
    width: "100%",
    height: "100%",
  },
  rankPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#F97316",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  attractionPill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  attractionPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  cityCardBody: {
    padding: 16,
  },
  cityNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cityName: {
    fontSize: 18,
    fontWeight: "700",
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  stateName: {
    fontSize: 12,
    fontWeight: "500",
  },
  safetyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  safetyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cityDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
    paddingTop: 10,
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weatherText: {
    fontSize: 12,
  },
  exploreActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  exploreActionText: {
    color: "#F97316",
    fontSize: 13,
    fontWeight: "700",
  },
});
