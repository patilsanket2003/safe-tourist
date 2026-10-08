import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../../../../context/AppContext';

interface WarningBannerProps {
    onDismiss?: () => void;
}

export default function WarningBanner({ onDismiss }: WarningBannerProps) {
    const { state } = useApp();
    const currentPrimary = state.currentPrimary;

    // Only show if in a high-risk zone
    const isHighRisk = currentPrimary?.risk?.toLowerCase().includes('high');

    if (!isHighRisk || !currentPrimary) {
        return null;
    }

    const zoneName = currentPrimary.name || 'Unknown Zone';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="alert" size={18} color="white" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.warningLabel}>WARNING</Text>
                        <Text style={styles.warningMessage} numberOfLines={1}>
                            Approaching High-Risk Zone: {zoneName}
                        </Text>
                    </View>
                    {onDismiss && (
                        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={20} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 110, // Below TopLocationCard
        left: 16,
        right: 16,
        zIndex: 99,
    },
    gradient: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    warningLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    warningMessage: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
});
