import React from 'react';
import { View, StyleSheet, TouchableOpacity, ToastAndroid, Platform, Alert } from 'react-native';
import { Text, Card, IconButton, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface GroupStatusCardProps {
  groupName: string;
  accessCode: string;
  memberCount: number;
  isTourAdmin?: boolean;
  isGroupMember?: boolean;
  onEditItinerary?: () => void;
  onViewItinerary?: () => void;
}

export default function GroupStatusCard({ groupName, accessCode, memberCount, isTourAdmin, isGroupMember, onEditItinerary, onViewItinerary }: GroupStatusCardProps) {
  const theme = useTheme();

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(accessCode);
    if (Platform.OS === 'android') {
        ToastAndroid.show('Access Code Copied!', ToastAndroid.SHORT);
    } else {
        Alert.alert('Copied', 'Access code copied to clipboard');
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.leftContent}>
            <Text variant="titleMedium" style={styles.groupName}>{groupName}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.codeRow}>
                <Text variant="bodyMedium" style={styles.codeLabel}>Access Code: </Text>
                <Text variant="bodyMedium" style={styles.codeValue}>{accessCode}</Text>
                <MaterialCommunityIcons name="content-copy" size={16} color="white" style={{ marginLeft: 6, opacity: 0.9 }} />
            </TouchableOpacity>
        </View>
        
        <View style={styles.rightContent}>
            <View style={styles.accessBadge}>
             <MaterialCommunityIcons name="account-group" size={20} color="#004D40" />
             <Text style={styles.badgeText}>{memberCount} Members</Text>
            </View>
        </View>
      </Card.Content>
      
      {/* Edit Itinerary Button - Only for tour-admins */}
      {isTourAdmin && onEditItinerary && (
        <Card.Actions style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Button
            mode="contained"
            onPress={onEditItinerary}
            icon="pencil"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8 }}
            labelStyle={{ color: '#00897B', fontWeight: 'bold' }}
            compact
          >
            Edit Itinerary
          </Button>
        </Card.Actions>
      )}
      
      {/* View Itinerary Button - Only for group-members */}
      {isGroupMember && onViewItinerary && (
        <Card.Actions style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Button
            mode="contained"
            onPress={onViewItinerary}
            icon="calendar-check"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8 }}
            labelStyle={{ color: '#00897B', fontWeight: 'bold' }}
            compact
          >
            View Itinerary
          </Button>
        </Card.Actions>
      )}
      
      {/* Decorative background circle */}
      <View style={styles.bgCircle} />
      <View style={styles.bgCircleSmall} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#00897B', // Teal/Blueish
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leftContent: {
    flex: 1,
  },
  groupName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.9)',
  },
  codeValue: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rightContent: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4
  },
  badgeText: {
    color: '#004D40',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bgCircle: {
    position: 'absolute',
    right: -20,
    bottom: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bgCircleSmall: {
    position: 'absolute',
    top: -10,
    right: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});
