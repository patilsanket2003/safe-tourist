import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  Route, 
  RouteStep, 
  getManeuverIcon, 
  formatDistance, 
  formatDuration 
} from '../services/mapboxDirectionsService';

interface RouteInstructionsProps {
  route: Route | null;
  onStepPress?: (step: RouteStep, index: number) => void;
}

export default function RouteInstructions({ route, onStepPress }: RouteInstructionsProps) {
  if (!route) {
    return (
      <Card style={styles.emptyCard}>
        <Card.Content>
          <Text style={styles.emptyText}>
            Enter origin and destination to see directions
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Collect all steps from all legs
  const allSteps: RouteStep[] = [];
  route.legs.forEach(leg => {
    leg.steps.forEach(step => {
      allSteps.push(step);
    });
  });

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Turn-by-Turn Directions
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {allSteps.length} steps • {formatDistance(route.distance)} • {formatDuration(route.duration)}
        </Text>
      </Card.Content>

      <Divider />

      <ScrollView style={styles.scrollView}>
        {allSteps.map((step, index) => {
          const iconName = getManeuverIcon(
            step.maneuver?.type || 'continue',
            step.maneuver?.modifier
          );

          return (
            <View key={index}>
              <View style={styles.stepContainer}>
                <View style={styles.stepIconContainer}>
                  <MaterialCommunityIcons
                    name={iconName as any}
                    size={24}
                    color="#3b82f6"
                  />
                  {index < allSteps.length - 1 && (
                    <View style={styles.stepConnector} />
                  )}
                </View>

                <View style={styles.stepContent}>
                  <Text style={styles.stepInstruction}>
                    {step.maneuver?.instruction || step.instruction || 'Continue'}
                  </Text>
                  
                  {step.name && (
                    <Text style={styles.stepName}>
                      on {step.name}
                    </Text>
                  )}

                  <View style={styles.stepMeta}>
                    <Text style={styles.stepMetaText}>
                      {formatDistance(step.distance)}
                    </Text>
                    <Text style={styles.stepMetaDivider}>•</Text>
                    <Text style={styles.stepMetaText}>
                      {formatDuration(step.duration)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {index < allSteps.length - 1 && <Divider style={styles.divider} />}
            </View>
          );
        })}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  emptyCard: {
    marginVertical: 8,
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
  },
  scrollView: {
    maxHeight: 400,
  },
  stepContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingVertical: 12,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  stepConnector: {
    position: 'absolute',
    top: 30,
    width: 2,
    height: 40,
    backgroundColor: '#d1d5db',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepInstruction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  stepName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepMetaText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  stepMetaDivider: {
    fontSize: 13,
    color: '#d1d5db',
    marginHorizontal: 8,
  },
  divider: {
    marginLeft: 56,
  },
});
