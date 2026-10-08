import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GeoFence, haversineKm } from '../../../../../utils/geofenceLogic';

interface NearbyHelpListProps {
    geoFences?: GeoFence[];
    userLatitude?: number;
    userLongitude?: number;
    onViewAll?: () => void;
}

interface HelpItem {
    fence: GeoFence;
    distance: number;
    type: 'police' | 'hospital' | 'other';
}

export default function NearbyHelpList({
    geoFences,
    userLatitude,
    userLongitude,
    onViewAll
}: NearbyHelpListProps) {

    const nearbyHelp = React.useMemo<HelpItem[]>(() => {
        if (!userLatitude || !userLongitude || !geoFences?.length) return [];

        const helpFences = geoFences
            .filter(f => {
                const cat = f.category?.toLowerCase() || '';
                return cat.includes('police') ||
                    cat.includes('hospital') ||
                    cat.includes('security') ||
                    cat.includes('medical');
            })
            .map(fence => {
                if (!fence.coords || fence.type === 'polygon') return null;
                const coords = fence.coords as number[];
                const dist = haversineKm([userLatitude, userLongitude], coords);
                const cat = fence.category?.toLowerCase() || '';
                const type: 'police' | 'hospital' | 'other' =
                    cat.includes('police') || cat.includes('security') ? 'police' :
                        cat.includes('hospital') || cat.includes('medical') ? 'hospital' : 'other';
                return { fence, distance: dist, type };
            })
            .filter(Boolean) as HelpItem[];

        // Sort by distance and take top 3
        return helpFences.sort((a, b) => a.distance - b.distance).slice(0, 3);
    }, [geoFences, userLatitude, userLongitude]);

    const handleCall = (fence: GeoFence) => {
        // Try to get phone from metadata
        const phone = fence.metadata?.phone || fence.metadata?.Phone || '100';
        Linking.openURL(`tel:${phone}`);
    };

    const handleDirections = (fence: GeoFence) => {
        if (!fence.coords || fence.type === 'polygon') return;
        const coords = fence.coords as number[];
        const lat = coords[0];
        const lng = coords[1];

        const url = Platform.select({
            ios: `maps://app?daddr=${lat},${lng}`,
            android: `google.navigation:q=${lat},${lng}`,
        });

        if (url) Linking.openURL(url);
    };

    const getIcon = (type: 'police' | 'hospital' | 'other') => {
        switch (type) {
            case 'police': return 'shield-account';
            case 'hospital': return 'hospital-box';
            default: return 'map-marker';
        }
    };

    const getIconColor = (type: 'police' | 'hospital' | 'other') => {
        switch (type) {
            case 'police': return '#6366F1';
            case 'hospital': return '#EF4444';
            default: return '#6B7280';
        }
    };

    if (nearbyHelp.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.header}>Nearby Help</Text>
                <Text style={styles.emptyText}>No help locations found nearby</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.header}>Nearby Help</Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll}>
                        <Text style={styles.viewAll}>View all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {nearbyHelp.map((item, index) => (
                <View key={item.fence.id || index} style={styles.helpItem}>
                    <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '15' }]}>
                        <MaterialCommunityIcons
                            name={getIcon(item.type)}
                            size={22}
                            color={getIconColor(item.type)}
                        />
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.helpName} numberOfLines={1}>
                            {item.fence.name || (item.type === 'police' ? 'Police Station' : 'Hospital')}
                        </Text>
                        <Text style={styles.helpDetails}>
                            {item.fence.state || 'Unknown'} • {item.distance.toFixed(1)} km away
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCall(item.fence)}
                    >
                        <MaterialCommunityIcons name="phone" size={20} color="#22C55E" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.directionsButton]}
                        onPress={() => handleDirections(item.fence)}
                    >
                        <MaterialCommunityIcons name="directions" size={20} color="#6366F1" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    header: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    viewAll: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        paddingVertical: 16,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    helpName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    helpDetails: {
        fontSize: 13,
        color: '#6B7280',
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    directionsButton: {
        backgroundColor: '#EEF2FF',
    },
});
