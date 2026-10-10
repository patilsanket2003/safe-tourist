import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Keyboard,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../../context/AppContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function PersonalInfoScreen() {
    const navigation = useNavigation<any>();
    const { state, updateProfile } = useApp();
    const user = (state.user || {}) as any;

    // Personal Info — pre-fill from authenticated user data
    const [fullName, setFullName] = useState(user.name || user.fullName || '');
    const [dob, setDob] = useState(
        user.dob
            ? typeof user.dob === 'string' && user.dob.includes('T')
                ? user.dob.split('T')[0]
                : String(user.dob)
            : user.dateOfBirth || ''
    );
    const [nationality, setNationality] = useState(user.nationality || 'Indian');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user.gender || 'Male');

    // Verification
    const email = user.email || '';
    const phone = user.phone || '';

    // Emergency Info
    const [bloodGroup, setBloodGroup] = useState(user.bloodGroup || 'O+');
    const [bloodMenuVisible, setBloodMenuVisible] = useState(false);
    const isBloodMenuDismissed = useRef(false);
    const [medicalConditions, setMedicalConditions] = useState(user.medicalConditions || 'None');
    const [allergies, setAllergies] = useState(user.allergies || 'None');

    // Save state
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Sync with state.user updates
    useEffect(() => {
        if (state.user) {
            const u = state.user as any;
            if (u.name || u.fullName) setFullName(u.name || u.fullName);
            if (u.dob || u.dateOfBirth) {
                setDob(
                    u.dob
                        ? typeof u.dob === 'string' && u.dob.includes('T')
                            ? u.dob.split('T')[0]
                            : String(u.dob)
                        : u.dateOfBirth
                );
            }
            if (u.nationality) setNationality(u.nationality);
            if (u.gender) setGender(u.gender);
            if (u.bloodGroup) setBloodGroup(u.bloodGroup);
            if (u.medicalConditions !== undefined) setMedicalConditions(u.medicalConditions);
            if (u.allergies !== undefined) setAllergies(u.allergies);
        }
    }, [state.user]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Validation Error', 'Please enter your full name.');
            return;
        }

        setSaving(true);
        setStatusMessage(null);
        try {
            await updateProfile({
                name: fullName.trim(),
                dob: dob.trim(),
                nationality: nationality.trim(),
                gender,
                bloodGroup,
                medicalConditions: medicalConditions.trim(),
                allergies: allergies.trim(),
            });

            setStatusMessage({ type: 'success', text: 'Profile saved successfully!' });
            Alert.alert('Success', 'Profile saved successfully!');
            setTimeout(() => {
                navigation.goBack();
            }, 800);
        } catch (error: any) {
            const msg = error?.message || 'Failed to update profile. Please try again.';
            setStatusMessage({ type: 'error', text: msg });
            Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    };

    // Header Save Button
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={styles.headerSaveButton}
                    activeOpacity={0.7}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-sharp" size={16} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={styles.headerSaveButtonText}>Save</Text>
                        </>
                    )}
                </TouchableOpacity>
            ),
        });
    }, [navigation, fullName, dob, nationality, gender, bloodGroup, medicalConditions, allergies, saving]);

    const openBloodMenu = () => {
        if (isBloodMenuDismissed.current) {
            isBloodMenuDismissed.current = false;
            return;
        }
        Keyboard.dismiss();
        setBloodMenuVisible(true);
    };

    const closeBloodMenu = () => {
        isBloodMenuDismissed.current = true;
        setBloodMenuVisible(false);
        setTimeout(() => {
            isBloodMenuDismissed.current = false;
        }, 200);
    };

    const GenderButton = ({ value, label }: { value: 'Male' | 'Female' | 'Other'; label: string }) => (
        <TouchableOpacity
            style={[styles.genderButton, gender === value && styles.genderButtonActive]}
            onPress={() => setGender(value)}
            activeOpacity={0.7}
        >
            <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Banner */}
                {statusMessage && (
                    <View
                        style={[
                            styles.statusBanner,
                            statusMessage.type === 'success'
                                ? styles.statusSuccess
                                : styles.statusError,
                        ]}
                    >
                        <Ionicons
                            name={statusMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                            size={18}
                            color={statusMessage.type === 'success' ? '#059669' : '#dc2626'}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                statusMessage.type === 'success'
                                    ? styles.statusTextSuccess
                                    : styles.statusTextError,
                            ]}
                        >
                            {statusMessage.text}
                        </Text>
                    </View>
                )}

                {/* Personal Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person" size={20} color="#3b82f6" />
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>

                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter full name"
                        placeholderTextColor="#9ca3af"
                    />

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <View style={styles.inputWithIcon}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    value={dob}
                                    onChangeText={setDob}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#9ca3af"
                                />
                                <Ionicons name="calendar-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                            </View>
                        </View>
                        <View style={styles.quarterField}>
                            <Text style={styles.label}>Nationality</Text>
                            <TextInput
                                style={styles.input}
                                value={nationality}
                                onChangeText={setNationality}
                                placeholder="Nationality"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.genderRow}>
                        <GenderButton value="Male" label="Male" />
                        <GenderButton value="Female" label="Female" />
                        <GenderButton value="Other" label="Other" />
                    </View>
                </View>

                {/* Verification Status */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                        <Text style={styles.sectionTitle}>Verification Status</Text>
                    </View>

                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.verifiedField}>
                        <Text style={styles.verifiedText}>{email || 'Not provided'}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                    </View>

                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.verifiedField}>
                        <Text style={styles.verifiedText}>{phone || 'Not provided'}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                    </View>
                </View>

                {/* Emergency Info */}
                <View style={styles.emergencySection}>
                    <View style={styles.emergencyHeader}>
                        <View style={styles.emergencyIconContainer}>
                            <MaterialCommunityIcons name="medical-bag" size={22} color="#fff" />
                        </View>
                        <Text style={styles.emergencyTitle}>Emergency & Medical Info</Text>
                    </View>

                    <View style={styles.emergencyContent}>
                        <View style={styles.emergencyRow}>
                            <View style={styles.emergencyField}>
                                <Text style={styles.emergencyLabel}>Blood Group</Text>
                                <Menu
                                    visible={bloodMenuVisible}
                                    onDismiss={closeBloodMenu}
                                    anchor={
                                        <View collapsable={false}>
                                            <TouchableOpacity
                                                style={styles.emergencyDropdown}
                                                onPress={openBloodMenu}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="water" size={18} color="#ef4444" />
                                                <Text style={styles.emergencyDropdownText}>{bloodGroup}</Text>
                                                <Ionicons name="chevron-down" size={16} color="#6b7280" />
                                            </TouchableOpacity>
                                        </View>
                                    }
                                    contentStyle={styles.menuContent}
                                >
                                    {BLOOD_GROUPS.map((group) => (
                                        <Menu.Item
                                            key={group}
                                            onPress={() => {
                                                setBloodMenuVisible(false);
                                                setTimeout(() => setBloodGroup(group), 100);
                                            }}
                                            title={group}
                                        />
                                    ))}
                                </Menu>
                            </View>
                        </View>

                        <View style={styles.emergencyField}>
                            <Text style={styles.emergencyLabel}>Medical Conditions</Text>
                            <View style={styles.emergencyInputRow}>
                                <Ionicons name="fitness" size={18} color="#f97316" />
                                <TextInput
                                    style={styles.emergencyInput}
                                    value={medicalConditions}
                                    onChangeText={setMedicalConditions}
                                    placeholder="None or list conditions"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        <View style={[styles.emergencyField, { marginBottom: 0 }]}>
                            <Text style={styles.emergencyLabel}>Allergies</Text>
                            <View style={styles.emergencyInputRow}>
                                <Ionicons name="alert-circle" size={18} color="#eab308" />
                                <TextInput
                                    style={styles.emergencyInput}
                                    value={allergies}
                                    onChangeText={setAllergies}
                                    placeholder="None or list allergies"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bottom Save Button */}
                <TouchableOpacity
                    style={[styles.bottomSaveButton, saving && styles.bottomSaveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <View style={styles.saveButtonContent}>
                            <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.bottomSaveButtonText}>Save Changes</Text>
                        </View>
                    )}
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
        padding: 16,
    },
    headerSaveButton: {
        marginRight: 16,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerSaveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    statusSuccess: {
        backgroundColor: '#d1fae5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    statusError: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    statusTextSuccess: {
        color: '#065f46',
    },
    statusTextError: {
        color: '#991b1b',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    emergencySection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    emergencyHeader: {
        backgroundColor: '#eff6ff',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#dbeafe',
    },
    emergencyIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emergencyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    emergencyContent: {
        padding: 20,
    },
    emergencyRow: {
        marginBottom: 16,
    },
    emergencyField: {
        marginBottom: 16,
    },
    emergencyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emergencyDropdown: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    emergencyDropdownText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    emergencyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 4,
        gap: 10,
    },
    emergencyInput: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
        paddingVertical: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 16,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        right: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    quarterField: {
        width: 100,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    genderButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    genderButtonActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    genderText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    genderTextActive: {
        color: '#3b82f6',
    },
    verifiedField: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    verifiedText: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    verifiedBadgeText: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: '600',
    },
    menuContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        maxHeight: 200,
    },
    bottomSaveButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    bottomSaveButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomSaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
