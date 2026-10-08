import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  IconButton,
  Menu,
  Divider,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../../../context/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type NodeType = "stay" | "visit" | "transit" | "start" | "end";

interface Node {
  type: NodeType;
  name: string;
  coords: string; // "lat, lng"
  time: string; // "HH:mm"
}

interface DayPlan {
  dayNumber: number;
  date: Date;
  nodes: Node[];
}

export default function CreateTripScreen({ navigation }: any) {
  const { createGroup, logout } = useApp();
  const theme = useTheme();

  const [groupName, setGroupName] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000)); // Next day
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [days, setDays] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // UI State for menus
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

  const toggleMenu = (dayIndex: number, nodeIndex: number, visible: boolean) => {
    setMenuVisible(prev => ({ ...prev, [`${dayIndex}-${nodeIndex}`]: visible }));
  };

  // Auto-calc days based on date range
  useEffect(() => {
    if (days.length === 0) {
      setDays([
        {
          dayNumber: 1,
          date: startDate,
          nodes: [{ type: "stay", name: "", coords: "", time: "10:00" }],
        },
      ]);
    } else {
      setDays((prev) =>
        prev.map((day, idx) => ({
          ...day,
          date: new Date(startDate.getTime() + idx * 86400000),
        })),
      );
    }
  }, [startDate]);

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      {
        dayNumber: prev.length + 1,
        date: new Date(startDate.getTime() + prev.length * 86400000),
        nodes: [],
      },
    ]);
  };

  const removeDay = (index: number) => {
    setDays((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((d, i) => ({
          ...d,
          dayNumber: i + 1,
          date: new Date(startDate.getTime() + i * 86400000),
        })),
    );
  };

  const addNode = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].nodes.push({
      type: "visit",
      name: "",
      coords: "",
      time: "10:00",
    });
    setDays(newDays);
  };

  const updateNode = (
    dayIndex: number,
    nodeIndex: number,
    field: keyof Node,
    value: string,
  ) => {
    const newDays = [...days];
    newDays[dayIndex].nodes[nodeIndex] = {
      ...newDays[dayIndex].nodes[nodeIndex],
      [field]: value,
    };
    setDays(newDays);
  };

  const removeNode = (dayIndex: number, nodeIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].nodes.splice(nodeIndex, 1);
    setDays(newDays);
  };

  const onSubmit = async () => {
    if (!groupName) {
      Alert.alert("Error", "Group Name is required");
      return;
    }

    setLoading(true);
    try {
      const itinerary = days.map((day) => ({
        dayNumber: day.dayNumber,
        date: day.date,
        nodes: day.nodes.map((node) => {
          let coordinates: [number, number] = [0, 0];
          if (node.coords) {
            const parts = node.coords
              .split(",")
              .map((s) => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const first = parts[0];
              const second = parts[1];
              const isValidLat = (v: number) => v >= -90 && v <= 90;
              const isValidLng = (v: number) => v >= -180 && v <= 180;

              // Prefer interpreting as "lat, lng" (backwards compatible),
              // but also handle "lng, lat". GeoJSON expects [lng, lat].
              if (isValidLat(first) && isValidLng(second)) {
                // "lat, lng" -> [lng, lat]
                coordinates = [second, first];
              } else if (isValidLat(second) && isValidLng(first)) {
                // "lng, lat" -> [lng, lat]
                coordinates = [first, second];
              } else {
                // Fallback to original assumption to avoid breaking existing data
                coordinates = [second, first];
              }
            }
          }
          return {
            type: node.type,
            name: node.name,
            location: { type: "Point", coordinates },
            scheduledTime: node.time,
            description: node.name,
          };
        }),
      }));

      const res = await createGroup({
        groupName,
        startDate,
        endDate,
        itinerary,
      });

      if (res.ok) {
        Alert.alert("Success", "Group initialized!");
      } else {
        Alert.alert("Error", res.message || "Failed to create group");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, " - ");
  };

  const nodeTypes: { label: string; value: NodeType; icon: string }[] = [
    { label: "Stay", value: "stay", icon: "bed" },
    { label: "Visit", value: "visit", icon: "camera" },
    { label: "Transit", value: "transit", icon: "train-car" },
    { label: "Start", value: "start", icon: "flag" },
    { label: "End", value: "end", icon: "flag-checkered" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text variant="headlineMedium" style={styles.title}>
            Create New Group Tour
          </Text>
          <Button onPress={logout} mode="contained-tonal" compact style={styles.logoutBtn}>
            Logout
          </Button>
        </View>

          <Card style={styles.card} mode="elevated" elevation={1}>
          <Card.Content>
            <View style={styles.groupDescription}>
              <Text style={styles.groupTitle}>Type Group Name</Text>
              <Text style={styles.groupSubtitle}>
                Chooses the Group name so member can identify it.
              </Text>
            </View>
            <Text style={styles.groupLabel}>Group Name</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              mode="outlined"
              style={styles.groupInput}
              outlineStyle={styles.groupInputOutline}
              contentStyle={styles.groupInputContent}
              placeholder="Enter Group Name"
            />

            <View style={styles.dateRow}>
              <View style={styles.dateInput}>
                <TouchableOpacity onPress={() => setShowStartPicker(true)}>
                  <TextInput
                    label="Start Date"
                    value={formatDate(startDate)}
                    mode="outlined"
                    editable={false}
                    outlineStyle={{ borderRadius: 8 }}
                    right={<TextInput.Icon icon="calendar" color="#1E88E5" />}
                    style={{ backgroundColor: 'white' }}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ width: 16 }} />
              <View style={styles.dateInput}>
                <TouchableOpacity onPress={() => setShowEndPicker(true)}>
                  <TextInput
                    label="End Date"
                    value={formatDate(endDate)}
                    mode="outlined"
                    editable={false}
                    outlineStyle={{ borderRadius: 8 }}
                    right={<TextInput.Icon icon="calendar" color="#1E88E5" />}
                    style={{ backgroundColor: 'white' }}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {(showStartPicker || showEndPicker) && (
             <DateTimePicker
                value={showStartPicker ? startDate : endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                    if (showStartPicker) setShowStartPicker(false);
                    if (showEndPicker) setShowEndPicker(false);
                    if (selectedDate) {
                        if (showStartPicker) setStartDate(selectedDate);
                        else setEndDate(selectedDate);
                    }
                }}
             />
            )}

            <Button
              mode="contained"
              style={styles.groupCreateButton}
              contentStyle={styles.groupCreateButtonContent}
              labelStyle={styles.groupCreateButtonLabel}
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
            >
              Crete Group
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.itineraryHeader}>
          <Text
            variant="titleLarge"
            style={styles.builderTitle}
          >
            Itinerary Builder
          </Text>
          <Text variant="bodyMedium" style={{ color: "#6B7280", marginTop: 4 }}>
            Add daily plans. The backend requires a "Node-Based" format.
          </Text>
        </View>

        {days.map((day, dayIndex) => (
          <Card key={dayIndex} style={styles.dayCard} elevation={0}>
            <Card.Content>
              <View style={styles.dayHeader}>
                <Text variant="titleMedium" style={styles.dayTitle}>
                  Day {day.dayNumber} (Date: {formatDate(day.date)})
                </Text>
                {days.length > 1 && (
                  <IconButton
                    icon="trash-can-outline"
                    size={20}
                    iconColor="#EF4444"
                    onPress={() => removeDay(dayIndex)}
                  />
                )}
              </View>

              {day.nodes.map((node, nodeIndex) => (
                <View key={nodeIndex} style={styles.nodeContainer}>
                  <View style={styles.nodeLeftBar} />
                  <View style={styles.nodeContent}>
                    {/* Row 1: Type Dropdown & Place Name */}
                    <View style={styles.nodeRow}>
                       <View style={{ width: 130, marginRight: 8 }}>
                          <Menu
                            visible={menuVisible[`${dayIndex}-${nodeIndex}`]}
                            onDismiss={() => toggleMenu(dayIndex, nodeIndex, false)}
                            anchor={
                                <TouchableOpacity 
                                    onPress={() => toggleMenu(dayIndex, nodeIndex, true)}
                                    style={styles.dropdownTrigger}
                                >
                                    <MaterialCommunityIcons name={nodeTypes.find(t => t.value === node.type)?.icon as any} size={18} color="#374151" style={{ marginRight: 8 }} />
                                    <Text style={{ flex: 1, color: '#374151' }}>{nodeTypes.find(t => t.value === node.type)?.label}</Text>
                                    <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            }
                          >
                            {nodeTypes.map((type) => (
                                <Menu.Item 
                                    key={type.value}
                                    onPress={() => {
                                        updateNode(dayIndex, nodeIndex, "type", type.value);
                                        toggleMenu(dayIndex, nodeIndex, false);
                                    }} 
                                    title={type.label}
                                    leadingIcon={type.icon} 
                                />
                            ))}
                          </Menu>
                       </View>

                      <TextInput
                        mode="outlined"
                        style={{ flex: 1, backgroundColor: 'white' }}
                        outlineStyle={{ borderRadius: 8 }}
                        placeholder="Place Name (e.g. Hotel Taj)"
                        value={node.name}
                        onChangeText={(text) =>
                          updateNode(dayIndex, nodeIndex, "name", text)
                        }
                      />
                      <IconButton
                        icon="close"
                        size={18}
                        iconColor="#9CA3AF"
                        onPress={() => removeNode(dayIndex, nodeIndex)}
                        style={{ margin: 0 }}
                      />
                    </View>

                    {/* Row 2: Coords & Time */}
                    <View style={styles.nodeRow}>
                      <TextInput
                        mode="outlined"
                        style={{ flex: 1, marginRight: 8, backgroundColor: 'white' }}
                        outlineStyle={{ borderRadius: 8 }}
                        placeholder="Latitude, Longitude (e.g. 28.6139, 77.2090)" // Explicit format: lat, lng
                        value={node.coords}
                        onChangeText={(text) =>
                          updateNode(dayIndex, nodeIndex, "coords", text)
                        }
                      />
                      <TextInput
                        mode="outlined"
                        style={{ width: 120, backgroundColor: 'white' }}
                        outlineStyle={{ borderRadius: 8 }}
                        placeholder="10:00"
                        value={node.time}
                        onChangeText={(text) =>
                          updateNode(dayIndex, nodeIndex, "time", text)
                        }
                        right={<TextInput.Icon icon="clock-outline" color="#9CA3AF" />}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <Button
                mode="outlined"
                style={styles.addNodeButton}
                textColor="#1E88E5"
                onPress={() => addNode(dayIndex)}
              >
                + Add Location Node
              </Button>
            </Card.Content>
          </Card>
        ))}

        <Button mode="outlined" style={styles.addDayButton} textColor="#6B7280" onPress={addDay}>
          + Add another day
        </Button>

        <Button
          mode="contained"
          style={styles.submitButton}
          contentStyle={{ height: 50 }}
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
        >
          Initialize Group Tour
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5", // Matched Dashboard background
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    color: "#1F2937",
    fontWeight: "bold",
    fontSize: 24,
  },
  logoutBtn: {
    backgroundColor: '#E5E7EB'
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  groupDescription: {
    alignItems: "center",
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#171725",
    textAlign: "center",
  },
  groupSubtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    color: "#434E58",
    textAlign: "center",
    maxWidth: 240,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#171725",
    marginBottom: 8,
  },
  groupInput: {
    backgroundColor: "#F6F6F6",
    marginBottom: 16,
  },
  groupInputOutline: {
    borderRadius: 12,
    borderColor: "#F6F6F6",
  },
  groupInputContent: {
    fontSize: 14,
  },
  groupCreateButton: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: "#0C87DE",
  },
  groupCreateButtonContent: {
    height: 50,
  },
  groupCreateButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FEFEFE",
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "600",
    color: '#374151'
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  dateRow: {
    flexDirection: "row",
  },
  dateInput: {
    flex: 1,
  },
  itineraryHeader: {
    marginBottom: 16,
  },
  builderTitle: {
     color: "#1E88E5", 
     fontWeight: "bold",
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayTitle: {
    fontWeight: "700",
    color: '#374151',
    fontSize: 16
  },
  nodeContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  nodeLeftBar: {
    width: 4,
    backgroundColor: "#1E88E5",
    borderRadius: 2,
    marginRight: 12,
  },
  nodeContent: {
    flex: 1,
    gap: 8,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#79747E', // Outlined input default border
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
    backgroundColor: 'white'
  },
  addNodeButton: {
    marginTop: 8,
    borderStyle: "dashed",
    borderColor: '#1E88E5',
    borderWidth: 1,
  },
  addDayButton: {
    marginTop: 8,
    marginBottom: 32,
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: "#1E88E5",
    borderRadius: 12,
    marginBottom: 20
  },
});
