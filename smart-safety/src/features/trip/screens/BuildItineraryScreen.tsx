import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card, SegmentedButtons, Chip, TextInput, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { showToast } from '../../../utils/toast';
import { useApp } from '../../../context/AppContext';
import ActivityNodeForm from '../components/ActivityNodeForm';
import { SERVER_URL } from '../../../config';
import { getGroupDashboard } from '../../../utils/api';

interface ActivityNode {
  type: 'start' | 'visit' | 'stay' | 'transit' | 'end';
  name: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  address?: string;
  scheduledTime?: string;
  description?: string;
}

interface DayItinerary {
  date: string;
  dayNumber: number;
  nodes: ActivityNode[];
}

export default function BuildItineraryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, setJustRegistered, createGroup, updateGroupItinerary } = useApp();
  const { tripDuration, startDate, returnDate, touristId, initialItinerary } =
    route.params as {
      tripDuration: number;
      startDate: string;
      returnDate: string;
      touristId: string;
      initialItinerary?: DayItinerary[];
    };

  // Role detection
  const user = state.user as any;

  // Hide default stack header for this screen (remove titles like "Plan your trip")
  useLayoutEffect(() => {
    try {
      (navigation as any).setOptions?.({ headerShown: false });
    } catch (e) {
      // ignore when navigation not available
    }
  }, [navigation]);
  
  // Safe goBack helper: fall back to navigating to Main if goBack isn't available
  const safeGoBack = () => {
    try {
      const navAny = navigation as any;
      if (typeof navAny.canGoBack === 'function' && navAny.canGoBack()) {
        navAny.goBack();
        return;
      }
      // Fallback to navigate to main screen
      if (typeof navAny.navigate === 'function') {
        navAny.navigate('Main');
        return;
      }
    } catch (e) {
      // swallow any navigation errors
      console.warn('[BuildItinerary] safeGoBack failed', e);
    }
  };
  const userRole = user?.role;
  const isSolo = userRole === 'solo';
  const isTourAdmin = userRole === 'tour-admin';
  const isGroupMember = userRole === 'group-member';
  const isEditingGroup = isTourAdmin && !!user?.ownedGroupId;
  const isCreatingGroup = isTourAdmin && !user?.ownedGroupId;

  const [currentDay, setCurrentDay] = useState(1);
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [currentDayNodes, setCurrentDayNodes] = useState<ActivityNode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showGroupNamePrompt, setShowGroupNamePrompt] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const hasInitialItinerary =
    Array.isArray(initialItinerary) && initialItinerary.length > 0;

  useEffect(() => {
    if (!hasInitialItinerary) {
      return;
    }

    const firstDay =
      initialItinerary.find((day) => day.dayNumber === 1) ||
      initialItinerary[0];

    setItinerary(initialItinerary);
    setCurrentDay(firstDay?.dayNumber || 1);
    setCurrentDayNodes(firstDay?.nodes || []);
  }, [hasInitialItinerary, initialItinerary]);

  // Load existing group itinerary for editing or viewing
  useEffect(() => {
    if (!hasInitialItinerary && (isEditingGroup || isGroupMember)) {
      setIsLoadingExisting(true);
      (async () => {
        try {
          console.log('[BuildItinerary] Loading existing group itinerary...');
          const groupData = await getGroupDashboard(state.token);
          console.log('[BuildItinerary] Group data:', groupData);

          const loadedItinerary =
            groupData?.data?.itinerary ||
            groupData?.group?.itinerary ||
            groupData?.itinerary;

          if (Array.isArray(loadedItinerary)) {
            console.log('[BuildItinerary] Setting itinerary:', loadedItinerary);
            setItinerary(loadedItinerary);

            // Load the first day's nodes
            if (loadedItinerary.length > 0) {
              const firstDay =
                loadedItinerary.find((d: any) => d.dayNumber === 1) ||
                loadedItinerary[0];
              if (firstDay && firstDay.nodes) {
                setCurrentDayNodes(firstDay.nodes);
              }
            }
            showToast('Group itinerary loaded');
          }
        } catch (error) {
          console.error('[BuildItinerary] Failed to load group itinerary:', error);
          showToast('Failed to load existing itinerary');
        } finally {
          setIsLoadingExisting(false);
        }
      })();
    }
  }, [hasInitialItinerary, isEditingGroup, isGroupMember, state.token]);

  // Initialize current day's date
  const getCurrentDayDate = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (currentDay - 1));
    return date.toISOString();
  };

  const handleAddNode = (node: ActivityNode) => {
    console.log('[BuildItinerary] add node', { currentDay, nodeName: node.name, type: node.type });
    setCurrentDayNodes([...currentDayNodes, node]);
  };

  const handleRemoveNode = (index: number) => {
    console.log('[BuildItinerary] remove node', { currentDay, index });
    const updated = currentDayNodes.filter((_, i) => i !== index);
    setCurrentDayNodes(updated);
  };

  const handleSaveDay = () => {
    if (currentDayNodes.length === 0) {
      showToast('Please add at least one activity for the day');
      return;
    }

    console.log('[BuildItinerary] save day', { currentDay, nodeCount: currentDayNodes.length });
    const dayData: DayItinerary = {
      date: getCurrentDayDate(),
      dayNumber: currentDay,
      nodes: currentDayNodes,
    };

    // Update or add day to itinerary
    const existingDayIndex = itinerary.findIndex((d) => d.dayNumber === currentDay);
    const updatedItinerary = [...itinerary];

    if (existingDayIndex >= 0) {
      updatedItinerary[existingDayIndex] = dayData;
    } else {
      updatedItinerary.push(dayData);
    }

    setItinerary(updatedItinerary);
    showToast(`Day ${currentDay} saved!`);

    // Move to next day if not last day
    if (currentDay < tripDuration) {
      setCurrentDay(currentDay + 1);
      // Load nodes for next day if already saved
      const nextDay = updatedItinerary.find((d) => d.dayNumber === currentDay + 1);
      setCurrentDayNodes(nextDay?.nodes || []);
    }
  };

  const handleChangeDay = (day: number) => {
    console.log('[BuildItinerary] change day', { from: currentDay, to: day });
    setCurrentDay(day);
    // Load saved nodes for this day
    const dayData = itinerary.find((d) => d.dayNumber === day);
    setCurrentDayNodes(dayData?.nodes || []);
  };

  const handleSubmitItinerary = async () => {
    if (itinerary.length === 0) {
      showToast('Please add at least one day to your itinerary');
      return;
    }

    console.log('[BuildItinerary] submit itinerary attempt', { daysFilled: itinerary.length, tripDuration });
    // Check if all days are filled
    if (itinerary.length < tripDuration) {
      Alert.alert(
        'Incomplete Itinerary',
        `You have only filled ${itinerary.length} out of ${tripDuration} days. Do you want to submit with partial data?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => submitToBackend() },
        ]
      );
    } else {
      submitToBackend();
    }
  };

  const submitToBackend = async () => {
    setIsSubmitting(true);
    try {
      // Sort itinerary by day number
      const sortedItinerary = [...itinerary].sort((a, b) => a.dayNumber - b.dayNumber);

      if (isSolo) {
        // SOLO FLOW (unchanged)
        console.log('[BuildItinerary] Solo flow: POST to /api/itinerary/:touristId');
        console.log('[BuildItinerary] Request URL:', `${SERVER_URL}/api/itinerary/${touristId}`);
        console.log('[BuildItinerary] Request body:', JSON.stringify({ itinerary: sortedItinerary }, null, 2));
        console.log('[BuildItinerary] Auth token:', state.token ? 'Present' : 'Missing');
        
        const response = await fetch(`${SERVER_URL}/api/itinerary/${touristId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({
            itinerary: sortedItinerary,
          }),
        });

        console.log('[BuildItinerary] Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('[BuildItinerary] Response data:', JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
          showToast('Itinerary created successfully!');
          // Clear the justRegistered flag to prevent redirect loops
          setJustRegistered(false);
          console.log('[BuildItinerary] Navigating to Main dashboard...');
          // Navigate to main dashboard
          (navigation.navigate as any)('Main');
        } else {
          console.error('[BuildItinerary] API error:', data);
          showToast(data.message || 'Failed to create itinerary');
        }
      } else if (isCreatingGroup) {
        // TOUR-ADMIN CREATING GROUP
        console.log('[BuildItinerary] Tour-admin creating group');
        
        // Show prompt for group name if not already entered
        if (!groupName.trim()) {
          setShowGroupNamePrompt(true);
          setIsSubmitting(false);
          return;
        }

        const groupData = {
          groupName: groupName.trim(),
          startDate: startDate,
          endDate: returnDate,
          itinerary: sortedItinerary,
        };

        console.log('[BuildItinerary] Calling createGroup with:', groupData);
        const result = await createGroup(groupData);
        
        if (result.ok) {
          showToast(`Group "${groupName}" created successfully!`);
          setJustRegistered(false);
          // Navigate to AddGroupMember screen to add members
          (navigation.navigate as any)('AddGroupMember');
        } else {
          showToast(result.message || 'Failed to create group');
        }
      } else if (isEditingGroup) {
        // TOUR-ADMIN EDITING GROUP
        console.log('[BuildItinerary] Tour-admin editing group itinerary');
        
        const result = await updateGroupItinerary(sortedItinerary);
        
        if (result.ok) {
          showToast('Group itinerary updated successfully!');
          safeGoBack();
        } else {
          showToast(result.message || 'Failed to update itinerary');
        }
      }
    } catch (error) {
      console.error('Error submitting itinerary:', error);
      showToast('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentDayDateFormatted = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (currentDay - 1));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group Name Prompt Dialog (shown when creating group without a name)
  if (showGroupNamePrompt) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Name Your Tour Group
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Choose a name for your group so members can identify it.
            </Text>
            <TextInput
              mode="outlined"
              label="Group Name"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Mountain Trek 2026"
              style={{ marginVertical: 16 }}
              autoFocus
            />
            <Button
              mode="contained"
              onPress={() => {
                if (groupName.trim()) {
                  setShowGroupNamePrompt(false);
                  submitToBackend();
                } else {
                  showToast('Please enter a group name');
                }
              }}
              style={{ marginTop: 8 }}
            >
              Create Group
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setShowGroupNamePrompt(false);
                setIsSubmitting(false);
              }}
              style={{ marginTop: 8 }}
            >
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Show loading when fetching existing itinerary */}
      {isLoadingExisting && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text>Loading group itinerary...</Text>
        </View>
      )}

      {/* Current Day Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header Section - Now scrollable */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={safeGoBack}
            style={styles.backButton}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {isGroupMember ? 'View Group Itinerary' : isEditingGroup ? 'Edit Group Itinerary' : 'Build your Itinerary'}
            </Text>
            <Text style={styles.headerSubtitle}>
              You need to added the day-wise itinerary{'\n'}on this page
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Day Title */}
        <View style={styles.dayTitleContainer}>
          <Text style={styles.dayTitle}>
            Day {currentDay} - {getCurrentDayDateFormatted()}
          </Text>
          <Text style={styles.daySubtitle}>
            Add your activities and stops for this day.
          </Text>
        </View>

        {/* Day Navigation Tabs */}
        <View style={styles.dayTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: tripDuration }, (_, i) => i + 1).map((day) => {
              const isSaved = itinerary.some((d) => d.dayNumber === day);
              const isSelected = currentDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleChangeDay(day)}
                  style={[
                    styles.dayTab,
                    isSelected && styles.dayTabSelected,
                  ]}
                >
                  <Text style={[styles.dayTabText, isSelected && styles.dayTabTextSelected]}>
                    Day {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Display saved nodes */}
        {currentDayNodes.map((node, index) => (
          <Card key={index} style={styles.nodeCard} mode="outlined">
            <Card.Content>
              <View style={styles.nodeHeader}>
                <Text variant="titleMedium">{node.name}</Text>
                {(isSolo || isTourAdmin) && (
                  <Button
                    icon="delete"
                    mode="text"
                    onPress={() => handleRemoveNode(index)}
                    compact
                  >
                    Remove
                  </Button>
                )}
              </View>
              <Text variant="bodySmall" style={styles.nodeDetail}>
                Type: {node.type}
              </Text>
              {node.scheduledTime && (
                <View style={styles.nodeDetailRow}>
                  <IconButton icon="clock-outline" size={16} style={styles.nodeIcon} />
                  <Text variant="bodySmall" style={styles.nodeDetail}>
                    {node.scheduledTime}
                  </Text>
                </View>
              )}
              {node.address && (
                <View style={styles.nodeDetailRow}>
                  <IconButton icon="map-marker" size={16} style={styles.nodeIcon} />
                  <Text variant="bodySmall" style={styles.nodeDetail}>
                    {node.address}
                  </Text>
                </View>
              )}
              {node.description && (
                <View style={styles.nodeDetailRow}>
                  <IconButton icon="text" size={16} style={styles.nodeIcon} />
                  <Text variant="bodySmall" style={styles.nodeDetail}>
                    {node.description}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}

        {/* Add Activity Form - Only for solo and tour-admin */}
        {(isSolo || isTourAdmin) && (
          <ActivityNodeForm onAddNode={handleAddNode} />
        )}

        {/* Save Current Day Button - Only for solo and tour-admin */}
        {(isSolo || isTourAdmin) && currentDayNodes.length > 0 && (
          <Button
            mode="contained"
            onPress={handleSaveDay}
            style={styles.saveDayButton}
            labelStyle={styles.saveDayButtonLabel}
            icon={currentDay < tripDuration ? "arrow-right" : "check"}
          >
            {currentDay < tripDuration ? `Save Day ${currentDay} & Continue` : `Save Day ${currentDay}`}
          </Button>
        )}

        {/* Final Submit Button - Only for solo and tour-admin */}
        {(isSolo || isTourAdmin) && itinerary.length > 0 && (
          <Button
            mode="contained"
            onPress={handleSubmitItinerary}
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Build Itinerary
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
  },
  backButton: {
    marginLeft: -8,
    marginTop: 30,
    marginBottom: 8,
  },
  headerTextContainer: {
    marginLeft: 8,
  },
  headerTitle: {
    fontFamily: 'Jost',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: '#171725',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: 'Jost',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: '#434E58',
  },
  divider: {
    height: 1,
    backgroundColor: '#9B9B9B',
    marginHorizontal: 0,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dayTitleContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    fontFamily: 'Jost',
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: '#171725',
    marginBottom: 4,
  },
  daySubtitle: {
    fontFamily: 'Jost',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: '#434E58',
  },
  dayTabsContainer: {
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
  },
  dayTabSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayTabText: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 16,
    color: '#808080',
  },
  dayTabTextSelected: {
    color: '#808080',
  },
  nodeCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderColor: '#EEEEEE',
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeDetail: {
    color: '#666',
    marginTop: 4,
    flex: 1,
  },
  nodeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  nodeIcon: {
    margin: 0,
    marginRight: -8,
  },
  saveDayButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 8,
  },
  saveDayButtonLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: '#FEFEFE',
  },
  submitButton: {
    backgroundColor: '#0C87DE',
    borderRadius: 12,
    marginTop: 24,
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: '#FEFEFE',
  },
  card: {
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
});
