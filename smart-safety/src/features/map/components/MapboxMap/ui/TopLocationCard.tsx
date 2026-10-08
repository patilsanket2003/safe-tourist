import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../../../../context/AppContext';
import { useLocation } from '../../../../../context/LocationContext';
import { fetchNearestPolice, fetchNearestHospital, NearbyPOI } from '../../../services/mapboxSearchService';

export default function TopLocationCard() {
    const { state } = useApp();
    const { currentAddress, currentLocation: userLocation } = useLocation();
    const currentPrimary = state.currentPrimary;

    // State for nearby help from Mapbox API
    const [nearestPolice, setNearestPolice] = useState<NearbyPOI | null>(null);
    const [nearestHospital, setNearestHospital] = useState<NearbyPOI | null>(null);
    const [loading, setLoading] = useState(false);

    // Determine zone status
    const isHighRisk = currentPrimary?.risk?.toLowerCase().includes('high');
    const statusText = isHighRisk ? 'High Risk Area' : 'Safe Zone • Green Status';
    const statusColor = isHighRisk ? '#EF4444' : '#22C55E';

    // Fetch nearest help when location changes
    useEffect(() => {
        const fetchNearest = async () => {
            if (!userLocation?.coords) {
                setNearestPolice(null);
                setNearestHospital(null);
                return;
            }

            setLoading(true);
            try {
                const { latitude, longitude } = userLocation.coords;
                const [police, hospital] = await Promise.all([
                    fetchNearestPolice(latitude, longitude),
                    fetchNearestHospital(latitude, longitude),
                ]);
                setNearestPolice(police);
                setNearestHospital(hospital);
            } catch (error) {
                console.error('[TopLocationCard] Error fetching help:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNearest();
    }, [userLocation?.coords?.latitude, userLocation?.coords?.longitude]);

    // Extract location name from address
    const locationName = currentAddress
        ? currentAddress.split(',')[0].trim()
        : 'Getting location...';

    const formatDistance = (distance: number) => {
        if (distance < 1) {
            return `${Math.round(distance * 1000)}m`;
        }
        return `${distance.toFixed(1)}km`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Location Header - matching design exactly */}
                <View style={styles.header}>
                    <View style={styles.locationIcon}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.locationName} numberOfLines={1}>{locationName}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={styles.statusText}>{statusText}</Text>
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Nearby Help - Side by Side */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                    </View>
                ) : (
                    <View style={styles.helpGrid}>
                        {/* Police */}
                        <View style={styles.helpCard}>
                            <View style={[styles.helpBadge, { backgroundColor: '#EEF2FF' }]}>
                                <MaterialCommunityIcons name="shield-check" size={16} color="#6366F1" />
                            </View>
                            <Text style={styles.helpTitle}>Police</Text>
                            {nearestPolice ? (
                                <Text style={styles.helpDistance}>{formatDistance(nearestPolice.distance)}</Text>
                            ) : (
                                <Text style={styles.helpNA}>--</Text>
                            )}
                        </View>

                        {/* Vertical Divider */}
                        <View style={styles.verticalDivider} />

                        {/* Hospital */}
                        <View style={styles.helpCard}>
                            <View style={[styles.helpBadge, { backgroundColor: '#FEF2F2' }]}>
                                <MaterialCommunityIcons name="hospital-box" size={16} color="#EF4444" />
                            </View>
                            <Text style={styles.helpTitle}>Hospital</Text>
                            {nearestHospital ? (
                                <Text style={styles.helpDistance}>{formatDistance(nearestHospital.distance)}</Text>
                            ) : (
                                <Text style={styles.helpNA}>--</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        zIndex: 100,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    locationName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 3,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
    loadingContainer: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    helpGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    helpCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    helpBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
        flex: 1,
    },
    helpDistance: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    helpNA: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    verticalDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
    },
});
