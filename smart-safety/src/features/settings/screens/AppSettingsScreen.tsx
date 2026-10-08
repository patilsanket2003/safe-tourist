import React, { useState, useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Switch, Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';

type LocationAccuracyType = 'High' | 'Medium' | 'Low';
type ThemeMode = 'Light' | 'Dark' | 'Auto';
type FontSize = 'Small' | 'Medium' | 'Large';

export default function AppSettingsScreen() {
    const navigation = useNavigation();

    // Appearance
    const [theme, setTheme] = useState<ThemeMode>('Auto');
    const [fontSize, setFontSize] = useState<FontSize>('Medium');
    const [fontSliderValue, setFontSliderValue] = useState(0.5);

    // Connectivity
    const [offlineMode, setOfflineMode] = useState(false);
    const [dataSaver, setDataSaver] = useState(true);
    const [wifiOnly, setWifiOnly] = useState(true);

    // Location
    const [locationAccuracy, setLocationAccuracy] = useState<LocationAccuracyType>('High');
    const [backgroundLocation, setBackgroundLocation] = useState(true);

    const handleReset = () => {
        setTheme('Auto');
        setFontSize('Medium');
        setFontSliderValue(0.5);
        setOfflineMode(false);
        setDataSaver(true);
        setWifiOnly(true);
        setLocationAccuracy('High');
        setBackgroundLocation(true);
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: 'App Settings',
            headerTitleStyle: {
                fontSize: 24,
                fontWeight: '700',
                color: '#0f172a',
            },
            headerStyle: {
                backgroundColor: '#fff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
            },
            headerRight: () => (
                <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={{ marginRight: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#3b82f6' }}>Reset</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    const handleFontSlider = (value: number) => {
        setFontSliderValue(value);
        if (value < 0.33) {
            setFontSize('Small');
        } else if (value < 0.66) {
            setFontSize('Medium');
        } else {
            setFontSize('Large');
        }
    };

    const ThemeButton = ({ value, label }: { value: ThemeMode; label: string }) => (
        <TouchableOpacity
            style={[styles.themeButton, theme === value && styles.themeButtonActive]}
            onPress={() => setTheme(value)}
            activeOpacity={0.9}
        >
            <Text style={[styles.themeText, theme === value && styles.themeTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const LocationButton = ({ value, label }: { value: LocationAccuracyType; label: string }) => (
        <TouchableOpacity
            style={[styles.themeButton, locationAccuracy === value && styles.themeButtonActive]}
            onPress={() => setLocationAccuracy(value)}
            activeOpacity={0.9}
        >
            <Text style={[styles.themeText, locationAccuracy === value && styles.themeTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* APPEARANCE Section */}
                <View style={styles.sectionLabelRow}>
                    <Ionicons name="color-palette" size={16} color="#94a3b8" />
                    <Text style={styles.sectionLabel}>Appearance</Text>
                </View>

                <Card style={styles.card}>
                    <Card.Content>
                        {/* Theme */}
                        <Text style={styles.settingTitle}>Theme</Text>
                        <View style={styles.themeRow}>
                            <ThemeButton value="Light" label="Light" />
                            <ThemeButton value="Dark" label="Dark" />
                            <ThemeButton value="Auto" label="Auto" />
                        </View>

                        <Divider style={styles.divider} />

                        {/* Font Size */}
                        <View style={styles.settingRow}>
                            <Text style={styles.settingTitle}>Font Size</Text>
                            <Text style={styles.settingValue}>{fontSize}</Text>
                        </View>
                        <View style={styles.sliderRow}>
                            <Text style={styles.fontSmall}>A</Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={1}
                                value={fontSliderValue}
                                onValueChange={handleFontSlider}
                                minimumTrackTintColor="#3b82f6"
                                maximumTrackTintColor="#e2e8f0"
                                thumbTintColor="#3b82f6"
                            />
                            <Text style={styles.fontLarge}>A</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* CONNECTIVITY Section */}
                <View style={styles.sectionLabelRow}>
                    <Ionicons name="wifi" size={16} color="#94a3b8" />
                    <Text style={styles.sectionLabel}>Connectivity</Text>
                </View>

                <Card style={styles.card}>
                    <Card.Content>
                        {/* Offline Mode */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <Ionicons name="cloud-offline-outline" size={22} color="#64748b" style={styles.toggleIcon} />
                                <Text style={styles.toggleLabel}>Offline Mode</Text>
                            </View>
                            <Switch
                                value={offlineMode}
                                onValueChange={setOfflineMode}
                                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                                thumbColor={offlineMode ? '#3b82f6' : '#f8fafc'}
                            />
                        </View>

                        <Divider style={styles.divider} />

                        {/* Data Saver */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <Ionicons name="cellular-outline" size={22} color="#64748b" style={styles.toggleIcon} />
                                <Text style={styles.toggleLabel}>Data Saver</Text>
                            </View>
                            <Switch
                                value={dataSaver}
                                onValueChange={setDataSaver}
                                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                                thumbColor={dataSaver ? '#3b82f6' : '#f8fafc'}
                            />
                        </View>

                        <Divider style={styles.divider} />

                        {/* Wi-Fi Only Updates */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <Ionicons name="wifi-outline" size={22} color="#64748b" style={styles.toggleIcon} />
                                <Text style={styles.toggleLabel}>Wi-Fi Only Updates</Text>
                            </View>
                            <Switch
                                value={wifiOnly}
                                onValueChange={setWifiOnly}
                                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                                thumbColor={wifiOnly ? '#3b82f6' : '#f8fafc'}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* LOCATION SERVICES Section */}
                <View style={styles.sectionLabelRow}>
                    <Ionicons name="location" size={16} color="#94a3b8" />
                    <Text style={styles.sectionLabel}>Location Services</Text>
                </View>

                <Card style={styles.card}>
                    <Card.Content>
                        {/* Location Accuracy */}
                        <View style={styles.settingRow}>
                            <Text style={styles.settingTitle}>Location Accuracy</Text>
                            {locationAccuracy === 'High' && (
                                <Text style={styles.warningText}>High Battery Usage</Text>
                            )}
                        </View>
                        <View style={styles.themeRow}>
                            <LocationButton value="High" label="High" />
                            <LocationButton value="Medium" label="Medium" />
                            <LocationButton value="Low" label="Low" />
                        </View>

                        <Divider style={styles.divider} />

                        {/* Background Location */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <View>
                                    <Text style={styles.toggleLabel}>Background Location</Text>
                                    <Text style={styles.toggleSubtitle}>Required for safety alerts</Text>
                                </View>
                            </View>
                            <Switch
                                value={backgroundLocation}
                                onValueChange={setBackgroundLocation}
                                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                                thumbColor={backgroundLocation ? '#3b82f6' : '#f8fafc'}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* STORAGE Section */}
                <View style={styles.sectionLabelRow}>
                    <Ionicons name="folder-open" size={16} color="#94a3b8" />
                    <Text style={styles.sectionLabel}>Storage</Text>
                </View>

                <Card style={styles.card}>
                    <Card.Content>
                        {/* Cached Data */}
                        <View style={styles.settingRow}>
                            <Text style={styles.toggleLabel}>Cached Data</Text>
                            <Text style={styles.cacheValue}>128.5 MB</Text>
                        </View>

                        <Divider style={styles.divider} />

                        {/* Clear Cache */}
                        <TouchableOpacity activeOpacity={0.7} style={styles.actionRow}>
                            <Text style={styles.destructiveAction}>Clear Cache</Text>
                        </TouchableOpacity>

                        <Divider style={styles.divider} />

                        {/* Manage Map Downloads */}
                        <TouchableOpacity activeOpacity={0.7} style={styles.actionRow}>
                            <Text style={styles.toggleLabel}>Manage Map Downloads</Text>
                            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 12,
        paddingHorizontal: 4,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 20,
        marginBottom: 24,
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
    },
    warningText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f97316',
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    settingValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
    },
    themeRow: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        padding: 4,
    },
    themeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    themeButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    themeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    themeTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 20,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 8,
    },
    slider: {
        flex: 1,
        marginHorizontal: 16,
        height: 40,
    },
    fontSmall: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    fontLarge: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    toggleIcon: {
        marginRight: 16,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
    toggleSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
    },
    destructiveAction: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ef4444',
    },
    cacheValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#64748b',
    },
});
