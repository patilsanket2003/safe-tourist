import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, Alert, Keyboard } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const ISSUE_TYPES = [
    'Bug / Technical Glitch',
    'App Crash',
    'Feature Request',
    'Safety Concern',
    'Account Issue',
    'Other',
];

export default function ReportIssueScreen() {
    const navigation = useNavigation();
    const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
    const [menuVisible, setMenuVisible] = useState(false);
    const isMenuDismissed = useRef(false);
    const [description, setDescription] = useState('');
    const [screenshot, setScreenshot] = useState<string | null>(null);

    const openMenu = () => {
        if (isMenuDismissed.current) {
            isMenuDismissed.current = false;
            return;
        }
        Keyboard.dismiss();
        setMenuVisible(true);
    };

    const closeMenu = () => {
        isMenuDismissed.current = true;
        setMenuVisible(false);
        setTimeout(() => {
            isMenuDismissed.current = false;
        }, 200);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setScreenshot(result.assets[0].uri);
        }
    };

    const handleSubmit = () => {
        if (!description.trim()) {
            Alert.alert('Missing Information', 'Please describe the issue.');
            return;
        }

        // TODO: Implement actual submission logic
        Alert.alert(
            'Report Submitted',
            'Thank you for your feedback! We will review your report shortly.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
    };

    const handleSelectIssueType = (type: string) => {
        setMenuVisible(false);
        setTimeout(() => setIssueType(type), 100);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <MaterialCommunityIcons name="wrench-outline" size={24} color="#f97316" />
                    <Text style={styles.headerTitle}>Report an Issue</Text>
                </View>

                {/* Issue Type */}
                <Text style={styles.label}>ISSUE TYPE</Text>
                <Menu
                    visible={menuVisible}
                    onDismiss={closeMenu}
                    anchor={
                        <View collapsable={false}>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={openMenu}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dropdownText}>{issueType}</Text>
                                <Ionicons name="chevron-down" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                    }
                    contentStyle={styles.menuContent}
                >
                    {ISSUE_TYPES.map((type) => (
                        <Menu.Item
                            key={type}
                            onPress={() => handleSelectIssueType(type)}
                            title={type}
                            titleStyle={styles.menuItem}
                        />
                    ))}
                </Menu>

                {/* Description */}
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Please describe what happened..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                {/* Screenshot */}
                <Text style={styles.label}>SCREENSHOT (OPTIONAL)</Text>
                <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={pickImage}
                    activeOpacity={0.7}
                >
                    {screenshot ? (
                        <Image source={{ uri: screenshot }} style={styles.previewImage} />
                    ) : (
                        <>
                            <Ionicons name="image-outline" size={32} color="#9ca3af" />
                            <Text style={styles.uploadText}>Tap to upload</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                </TouchableOpacity>

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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 28,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    dropdown: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    dropdownText: {
        fontSize: 15,
        color: '#1f2937',
        fontWeight: '500',
    },
    menuContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: 200, // Limit height to prevent cutting off
    },
    menuItem: {
        fontSize: 15,
        color: '#1f2937',
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1f2937',
        minHeight: 140,
        marginBottom: 24,
    },
    uploadArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    uploadText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },
    previewImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
    submitButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
