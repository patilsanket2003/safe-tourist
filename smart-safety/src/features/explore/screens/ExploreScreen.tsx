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
  Dimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAppTheme } from "../../../context/ThemeContext";
import {
  getExploreCategories,
  getExploreStates,
  searchExplore,
  getExploreCitiesByCategory,
} from "../../../utils/api";

const { width } = Dimensions.get("window");

export default function ExploreScreen({ navigation }: any) {
  const { isDark, colors } = useAppTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [featuredCities, setFeaturedCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ cities: any[]; places: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [catRes, stateRes, mountainRes, beachRes, historicRes] = await Promise.all([
        getExploreCategories().catch(() => ({ categories: [] })),
        getExploreStates().catch(() => ({ states: [] })),
        getExploreCitiesByCategory("mountains-nature", { limit: 3 }).catch(() => ({ cities: [] })),
        getExploreCitiesByCategory("sea-beaches", { limit: 3 }).catch(() => ({ cities: [] })),
        getExploreCitiesByCategory("historic-places", { limit: 3 }).catch(() => ({ cities: [] })),
      ]);

      if (catRes?.categories) setCategories(catRes.categories);
      if (stateRes?.states) setStates(stateRes.states);

      // Featured showcase from top rankings across categories
      const topPicks = [
        ...(mountainRes?.cities || []).slice(0, 2),
        ...(beachRes?.cities || []).slice(0, 2),
        ...(historicRes?.cities || []).slice(0, 2),
      ];
      setFeaturedCities(topPicks);
    } catch (err: any) {
      console.error("ExploreScreen load error:", err);
      setError("Unable to load tourist exploration data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Debounced / On-demand search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      const res = await searchExplore(text.trim());
      if (res?.success) {
        setSearchResults({
          cities: res.results?.cities || [],
          places: res.results?.places || [],
        });
      }
    } catch (e) {
      console.warn("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const getSafetyBadge = (safety?: any) => {
    const risk = safety?.riskLevel || "LOW RISK";
    const score = safety?.score ?? 95;
    if (risk.includes("HIGH")) {
      return { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444", icon: "alert-circle" };
    }
    if (risk.includes("MODERATE")) {
      return { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B", icon: "alert" };
    }
    return { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981", icon: "shield-check" };
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F8FAFC" }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: isDark ? "#121212" : "#FFFFFF" }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <View style={styles.titleWithFlag}>
              <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Explore India
              </Text>
              <Text style={styles.flagEmoji}> 🇮🇳</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Verified destinations with live SafeTrail safety alerts
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.sosPill, { backgroundColor: "rgba(249, 115, 22, 0.12)" }]}
            onPress={() => navigation.navigate("EmergencyMap")}
          >
            <MaterialCommunityIcons name="shield-airplane" size={20} color="#F97316" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isDark ? "#94A3B8" : "#64748B"}
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search Manali, Goa, Taj Mahal, temples..."
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={handleSearch}
            style={[styles.searchInput, { color: isDark ? "#FFFFFF" : "#0F172A" }]}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 6 }} />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={isDark ? "#94A3B8" : "#64748B"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Live Search Results Dropdown Overlay */}
      {searchResults && (
        <View
          style={[
            styles.searchResultsCard,
            {
              backgroundColor: isDark ? "#18181B" : "#FFFFFF",
              borderColor: isDark ? "#27272A" : "#E2E8F0",
            },
          ]}
        >
          <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.searchSectionTitle, { color: isDark ? "#A1A1AA" : "#71717A" }]}>
              DESTINATIONS ({searchResults.cities.length})
            </Text>
            {searchResults.cities.length === 0 && (
              <Text style={{ color: isDark ? "#71717A" : "#94A3B8", fontSize: 13, padding: 8 }}>
                No cities found
              </Text>
            )}
            {searchResults.cities.map((city) => (
              <TouchableOpacity
                key={city.cityId}
                style={[
                  styles.searchResultItem,
                  { borderBottomColor: isDark ? "#27272A" : "#F1F5F9" },
                ]}
                onPress={() => {
                  clearSearch();
                  navigation.navigate("CityPlaces", {
                    cityId: city.cityId,
                    cityName: city.name,
                  });
                }}
              >
                <Ionicons name="location" size={18} color="#F97316" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultItemTitle, { color: isDark ? "#F4F4F5" : "#0F172A" }]}>
                    {city.name}
                  </Text>
                  <Text style={[styles.resultItemSub, { color: isDark ? "#A1A1AA" : "#64748B" }]}>
                    {city.stateName} • {city.primaryCategory?.replace("-", " & ")}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#71717A" />
              </TouchableOpacity>
            ))}

            <Text
              style={[
                styles.searchSectionTitle,
                { color: isDark ? "#A1A1AA" : "#71717A", marginTop: 12 },
              ]}
            >
              TOURIST ATTRACTIONS ({searchResults.places.length})
            </Text>
            {searchResults.places.length === 0 && (
              <Text style={{ color: isDark ? "#71717A" : "#94A3B8", fontSize: 13, padding: 8 }}>
                No tourist spots found
              </Text>
            )}
            {searchResults.places.map((place) => (
              <TouchableOpacity
                key={place.placeId}
                style={[
                  styles.searchResultItem,
                  { borderBottomColor: isDark ? "#27272A" : "#F1F5F9" },
                ]}
                onPress={() => {
                  clearSearch();
                  navigation.navigate("PlaceDetails", {
                    placeId: place.placeId,
                    placeName: place.name,
                  });
                }}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={18}
                  color="#3B82F6"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultItemTitle, { color: isDark ? "#F4F4F5" : "#0F172A" }]}>
                    {place.name}
                  </Text>
                  <Text style={[styles.resultItemSub, { color: isDark ? "#A1A1AA" : "#64748B" }]}>
                    {place.cityName}, {place.stateName}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#71717A" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={[styles.loadingText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Loading verified attractions & safety status...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 1. THREE MAIN CATEGORY CARDS */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Explore by Category
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                Choose your travel vibe to see top ranked destinations
              </Text>
            </View>

            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.88}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                      borderColor: isDark ? "#27272A" : "#E2E8F0",
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate("TopCities", {
                      categoryId: cat.id,
                      categoryTitle: cat.title,
                    })
                  }
                >
                  <Image source={{ uri: cat.coverImage }} style={styles.categoryImage} />
                  <View style={styles.categoryGradientOverlay} />

                  {/* Top Badges */}
                  <View style={styles.categoryTopRow}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{cat.badge}</Text>
                    </View>
                    <View style={styles.countPill}>
                      <MaterialCommunityIcons name="map-marker-multiple" size={12} color="#FFF" />
                      <Text style={styles.countPillText}>{cat.destinationCount} Cities</Text>
                    </View>
                  </View>

                  {/* Bottom Info */}
                  <View style={styles.categoryBottomInfo}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.categoryName}>{cat.title}</Text>
                      <View style={styles.arrowCircle}>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {cat.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. POPULAR STATES CAROUSEL */}
            {states.length > 0 && (
              <View style={styles.statesSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Popular States
                  </Text>
                  <Text style={{ fontSize: 13, color: "#F97316", fontWeight: "600" }}>
                    {states.length} States
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {states.map((st) => (
                    <TouchableOpacity
                      key={st.stateId}
                      style={[
                        styles.stateChip,
                        {
                          backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                          borderColor: isDark ? "#27272A" : "#E2E8F0",
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate("TopCities", {
                          categoryId: "all",
                          stateId: st.stateId,
                          categoryTitle: `${st.name} Destinations`,
                        })
                      }
                    >
                      <Image source={{ uri: st.coverImage }} style={styles.stateChipImage} />
                      <View style={{ marginLeft: 10 }}>
                        <Text
                          style={[styles.stateChipName, { color: isDark ? "#F4F4F5" : "#0F172A" }]}
                        >
                          {st.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#64748B" }}>
                          {st.destinationCount || 1}+ destinations
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 3. FEATURED DESTINATIONS SHOWCASE */}
            {featuredCities.length > 0 && (
              <View style={styles.featuredSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Top Ranked Destinations
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
                    Verified Safe
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {featuredCities.map((city) => {
                    const badge = getSafetyBadge(city.safety);
                    return (
                      <TouchableOpacity
                        key={city.cityId}
                        style={[
                          styles.featuredCityCard,
                          {
                            backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                            borderColor: isDark ? "#27272A" : "#E2E8F0",
                          },
                        ]}
                        onPress={() =>
                          navigation.navigate("CityPlaces", {
                            cityId: city.cityId,
                            cityName: city.name,
                          })
                        }
                      >
                        <Image source={{ uri: city.coverImage }} style={styles.featuredCityImage} />
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>Rank #{city.rank}</Text>
                        </View>

                        <View style={styles.featuredCityInfo}>
                          <View style={styles.cityTitleRow}>
                            <Text
                              style={[
                                styles.cityNameText,
                                { color: isDark ? "#FFFFFF" : "#0F172A" },
                              ]}
                              numberOfLines={1}
                            >
                              {city.name}
                            </Text>
                          </View>
                          <Text
                            style={[styles.stateSubText, { color: isDark ? "#94A3B8" : "#64748B" }]}
                          >
                            {city.stateName}
                          </Text>

                          {/* SafeTrail Live Safety Indicator */}
                          <View style={[styles.safetyPill, { backgroundColor: badge.bg }]}>
                            <MaterialCommunityIcons
                              name={badge.icon as any}
                              size={13}
                              color={badge.text}
                            />
                            <Text style={[styles.safetyPillText, { color: badge.text }]}>
                              {city.safety?.riskLevel || "LOW RISK"} (
                              {city.safety?.score ?? 95}/100)
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.cityShortDesc,
                              { color: isDark ? "#A1A1AA" : "#475569" },
                            ]}
                            numberOfLines={2}
                          >
                            {city.shortDescription}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Bottom SafeTrail Attribution notice */}
            <View
              style={[
                styles.attributionCard,
                {
                  backgroundColor: isDark ? "#121212" : "#F1F5F9",
                  borderColor: isDark ? "#27272A" : "#E2E8F0",
                },
              ]}
            >
              <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.attributionTitle, { color: isDark ? "#F4F4F5" : "#0F172A" }]}>
                  SafeTrail Verified Data
                </Text>
                <Text style={[styles.attributionDesc, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Integrated with OpenStreetMap, Wikidata, Wikimedia Commons and SafeTrail’s real-time
                  hazard monitoring network.
                </Text>
              </View>
            </View>
          </>
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
    paddingTop: Platform.OS === "ios" ? 54 : 38,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.1)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleWithFlag: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  flagEmoji: {
    fontSize: 22,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "400",
  },
  sosPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  searchResultsCard: {
    position: "absolute",
    top: Platform.OS === "ios" ? 140 : 124,
    left: 20,
    right: 20,
    zIndex: 999,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  searchSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultItemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 40,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
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
    fontSize: 13,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  categoryCard: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  categoryGradientOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  categoryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  categoryPill: {
    backgroundColor: "rgba(249, 115, 22, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  countPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  categoryBottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  catTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryDesc: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    lineHeight: 16,
  },
  statesSection: {
    marginTop: 24,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingVertical: 4,
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  stateChipImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  stateChipName: {
    fontSize: 13,
    fontWeight: "700",
  },
  featuredSection: {
    marginTop: 24,
  },
  featuredCityCard: {
    width: 240,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  featuredCityImage: {
    width: "100%",
    height: 130,
  },
  rankBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#F97316",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rankBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  featuredCityInfo: {
    padding: 12,
  },
  cityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityNameText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  stateSubText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  safetyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 6,
  },
  safetyPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cityShortDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  attributionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  attributionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  attributionDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
