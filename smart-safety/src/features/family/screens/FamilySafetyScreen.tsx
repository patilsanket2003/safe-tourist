import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useApp } from "../../../context/AppContext";
import { useAppTheme } from "../../../context/ThemeContext";
import {
  getFamilyMembers,
  addFamilyMember,
  removeFamilyMember,
  setLiveLocationSharing,
} from "../../../utils/api";
import touristSocketService from "../../../services/touristSocketService";

const RELATIONSHIPS = ["Parent", "Friend", "Guardian", "Sibling", "Spouse", "Other"];

export default function FamilySafetyScreen({ navigation }: any) {
  const { state } = useApp();
  const { isDark, colors } = useAppTheme();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection for live sharing
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSharingActive, setIsSharingActive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("Parent");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Fetch family members
  const loadMembers = useCallback(async () => {
    if (!state.token) return;
    try {
      const res = await getFamilyMembers(state.token);
      if (res?.success && Array.isArray(res.members)) {
        setMembers(res.members);
        // Pre-select members who are currently being shared with
        const currentlySharing = res.members
          .filter((m: any) => m.isSharingWith)
          .map((m: any) => m.memberTouristId);
        
        if (currentlySharing.length > 0) {
          setSelectedIds(currentlySharing);
          setIsSharingActive(true);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load family members:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [state.token]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Toggle member selection for location sharing
  const toggleSelectMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.memberTouristId));
    }
  };

  // Start live location sharing with selected members
  const handleStartSharing = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("Select Contacts", "Please select at least one contact to share your live location with.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await setLiveLocationSharing(state.token!, selectedIds, true);
      if (res?.success) {
        setIsSharingActive(true);
        // Also emit via socket for real-time delivery
        touristSocketService.startFamilySharing(
          selectedIds,
          state.user?.name || "Your Family Contact"
        );
        Alert.alert(
          "Live Location Sharing Active",
          `Broadcasting your real-time safety location to ${selectedIds.length} contact(s). They can now see your live marker on their map.`
        );
        loadMembers();
      }
    } catch (err: any) {
      Alert.alert("Sharing Error", err?.message || "Failed to start live sharing");
    } finally {
      setActionLoading(false);
    }
  };

  // Stop live location sharing
  const handleStopSharing = async () => {
    setActionLoading(true);
    try {
      const allRecipientIds = members.map((m) => m.memberTouristId);
      const res = await setLiveLocationSharing(state.token!, allRecipientIds, false);
      if (res?.success) {
        setIsSharingActive(false);
        // Notify via socket
        touristSocketService.stopFamilySharing(allRecipientIds);
        Alert.alert("Location Sharing Ended", "Live location broadcast has been stopped.");
        loadMembers();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to stop location sharing");
    } finally {
      setActionLoading(false);
    }
  };

  // Add a new member by email
  const handleAddMember = async () => {
    setAddError(null);
    setAddSuccess(null);

    const email = emailInput.trim();
    if (!email) {
      setAddError("Please enter a valid email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAddError("Please enter a valid email address format");
      return;
    }

    setAddLoading(true);
    try {
      const res = await addFamilyMember(state.token!, email, selectedRelationship);
      if (res?.success) {
        setAddSuccess(res.message || "Member added successfully!");
        setEmailInput("");
        loadMembers();
        setTimeout(() => {
          setShowAddModal(false);
          setAddSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      // Check for user-not-found error message
      const msg = err?.message || "";
      if (msg.includes("404") || msg.toLowerCase().includes("not exist") || msg.toLowerCase().includes("no account")) {
        setAddError("No account found with this email ID. Only users who have registered in the app can be added.");
      } else {
        setAddError(msg || "Could not add member. Please try again.");
      }
    } finally {
      setAddLoading(false);
    }
  };

  // Remove a member
  const handleRemoveMember = (member: any) => {
    Alert.alert(
      "Remove Contact",
      `Are you sure you want to remove ${member.name} (${member.relationship}) from your safety circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFamilyMember(state.token!, member.memberTouristId);
              loadMembers();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F4F4F5" }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: isDark ? "rgba(24, 24, 27, 0.85)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
            },
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(16px)",
                  boxShadow: isDark
                    ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)"
                    : "0 8px 24px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                } as any)
              : {},
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-account" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Parental & Family Safety
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Live circle tracking & location broadcasting
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                setRefreshing(true);
                loadMembers();
              }}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={refreshing ? "#10B981" : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Location Sharing Controller Glass Card */}
        <View
          style={[
            styles.controlCard,
            {
              backgroundColor: isSharingActive
                ? isDark
                  ? "rgba(6, 78, 59, 0.35)"
                  : "rgba(209, 250, 229, 0.7)"
                : isDark
                ? "rgba(24, 24, 27, 0.85)"
                : "#FFFFFF",
              borderColor: isSharingActive
                ? "#10B981"
                : isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
            },
            Platform.OS === "web"
              ? ({
                  backdropFilter: "blur(16px)",
                  boxShadow: isSharingActive
                    ? "0 0 20px rgba(16, 185, 129, 0.25)"
                    : isDark
                    ? "0 8px 24px rgba(0,0,0,0.3)"
                    : "0 4px 16px rgba(0,0,0,0.05)",
                } as any)
              : {},
          ]}
        >
          <View style={styles.controlHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  styles.statusPulseDot,
                  { backgroundColor: isSharingActive ? "#10B981" : "#71717A" },
                ]}
              />
              <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>
                {isSharingActive ? "Live Sharing Active" : "Location Broadcasting"}
              </Text>
            </View>
            {isSharingActive && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE GPS</Text>
              </View>
            )}
          </View>

          <Text style={[styles.controlDescription, { color: colors.textSecondary }]}>
            {isSharingActive
              ? `You are broadcasting your live GPS location to ${selectedIds.length} contact(s). They can see your real-time marker on their map.`
              : "Select one or multiple family members below to share your live safety coordinates with them."}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {isSharingActive ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.stopBtn]}
                onPress={handleStopSharing}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnTextWhite}>End Live Sharing</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.startBtn,
                  selectedIds.length === 0 && { opacity: 0.5 },
                ]}
                onPress={handleStartSharing}
                disabled={actionLoading || selectedIds.length === 0}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="crosshairs-gps"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.btnTextWhite}>
                      Share Live Location ({selectedIds.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.mapBtn,
                { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" },
              ]}
              onPress={() => navigation.navigate("Map")}
            >
              <Ionicons name="map" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.btnText, { color: colors.textPrimary }]}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Header: Trusted Members */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Trusted Circle ({members.length})
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {members.length > 0 && (
              <TouchableOpacity onPress={toggleSelectAll} style={{ marginRight: 12 }}>
                <Text style={styles.selectText}>
                  {selectedIds.length === members.length ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.addMemberBtn}
              onPress={() => {
                setAddError(null);
                setAddSuccess(null);
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addMemberBtnText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
              Loading trusted circle...
            </Text>
          </View>
        ) : members.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? "rgba(24, 24, 27, 0.6)" : "#FFFFFF",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
              },
            ]}
          >
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="account-multiple-plus" size={38} color="#10B981" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Members Added Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add your parents, guardians, or close friends by their registered email ID to start sharing your live safety location.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => {
                setAddError(null);
                setAddSuccess(null);
                setShowAddModal(true);
              }}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnTextWhite}>Add First Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map((member) => {
            const isSelected = selectedIds.includes(member.memberTouristId);
            return (
              <TouchableOpacity
                key={member.memberTouristId}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(209, 250, 229, 0.5)"
                      : isDark
                      ? "rgba(24, 24, 27, 0.85)"
                      : "#FFFFFF",
                    borderColor: isSelected
                      ? "#10B981"
                      : isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => toggleSelectMember(member.memberTouristId)}
              >
                {/* Selection Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? "#10B981" : colors.textSecondary,
                      backgroundColor: isSelected ? "#10B981" : "transparent",
                    },
                  ]}
                  onPress={() => toggleSelectMember(member.memberTouristId)}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>

                {/* Member Avatar */}
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>

                {/* Member Info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <View style={styles.relationshipChip}>
                      <Text style={styles.relationshipChipText}>
                        {member.relationship || "Family"}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.memberEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {member.email}
                  </Text>

                  {/* Status Badges */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
                    {member.isSharingWithMe && (
                      <View style={styles.sharingWithMeBadge}>
                        <View style={styles.greenPulseDot} />
                        <Text style={styles.sharingWithMeText}>Sharing with you</Text>
                      </View>
                    )}
                    {member.isSharingWith && (
                      <View style={styles.receivingMyBadge}>
                        <Ionicons name="radio" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                        <Text style={styles.receivingMyText}>Receiving your live GPS</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeIconBtn}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="person-add" size={20} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Add Trusted Contact
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter the registered email ID of your family member or close friend. Only users who have an account in the app can be added.
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Registered Email ID
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: colors.textPrimary,
                    borderColor: addError ? "#EF4444" : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                    backgroundColor: isDark ? "rgba(39, 39, 42, 0.6)" : "rgba(244, 244, 245, 0.8)",
                  },
                ]}
                placeholder="e.g. parent@example.com"
                placeholderTextColor={colors.textMuted}
                value={emailInput}
                onChangeText={(text) => {
                  setEmailInput(text);
                  setAddError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Relationship Chips */}
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Relationship
              </Text>
              <View style={styles.chipsRow}>
                {RELATIONSHIPS.map((rel) => {
                  const isChipActive = selectedRelationship === rel;
                  return (
                    <TouchableOpacity
                      key={rel}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isChipActive
                            ? "#10B981"
                            : isDark
                            ? "rgba(39, 39, 42, 0.8)"
                            : "rgba(244, 244, 245, 0.9)",
                          borderColor: isChipActive
                            ? "#10B981"
                            : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                        },
                      ]}
                      onPress={() => setSelectedRelationship(rel)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isChipActive ? "#FFFFFF" : colors.textPrimary },
                        ]}
                      >
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Error Message */}
            {addError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{addError}</Text>
              </View>
            )}

            {/* Success Message */}
            {addSuccess && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.successText}>{addSuccess}</Text>
              </View>
            )}

            {/* Modal Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" },
                ]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, addLoading && { opacity: 0.7 }]}
                onPress={handleAddMember}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnTextWhite}>Check & Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  controlCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  liveBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  controlDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  startBtn: {
    backgroundColor: "#10B981",
  },
  stopBtn: {
    backgroundColor: "#EF4444",
  },
  mapBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  btnText: {
    fontWeight: "600",
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addMemberBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 15,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
  relationshipChip: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationshipChipText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "700",
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  sharingWithMeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 4,
  },
  sharingWithMeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "600",
  },
  receivingMyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  receivingMyText: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "600",
  },
  removeIconBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  inputContainer: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  successText: {
    color: "#10B981",
    fontSize: 12,
    flex: 1,
    fontWeight: "600",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
});
