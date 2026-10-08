import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../../context/AppContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function PersonalInfoScreen() {
    const navigation = useNavigation();
    const { state } = useApp();

    // Personal Info
    const [fullName, setFullName] = useState(state.user?.name || 'Arjun Sharma');
    const [dob, setDob] = useState('08/15/1995');
    const [nationality, setNationality] = useState('Indian');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

    // Verification
    const email = state.user?.email || 'arjun.sharma@example.com';
    const phone = state.user?.phone || '+91 98765 43210';


    // Emergency Info
    const [bloodGroup, setBloodGroup] = useState('O+');
    const [bloodMenuVisible, setBloodMenuVisible] = useState(false);
    const isBloodMenuDismissed = useRef(false);
    const [medicalConditions, setMedicalConditions] = useState('None');
    const [allergies, setAllergies] = useState('Peanuts');

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
                    />

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <View style={styles.inputWithIcon}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    value={dob}
                                    onChangeText={setDob}
                                    placeholder="MM/DD/YYYY"
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
                        <Text style={styles.verifiedText}>{email}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                    </View>

                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.verifiedField}>
                        <Text style={styles.verifiedText}>{phone}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Text style={styles.reVerifyLink}>Re-verify</Text>
                    </TouchableOpacity>
                </View>

                {/* Emergency Info */}
                <View style={styles.emergencySection}>
                    <View style={styles.emergencyHeader}>
                        <View style={styles.emergencyIconContainer}>
                            <MaterialCommunityIcons name="medical-bag" size={22} color="#fff" />
                        </View>
                        <Text style={styles.emergencyTitle}>Emergency Info</Text>
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
                                    placeholder="None"
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
                                    placeholder="None"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>
                    </View>
                </View>

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
    reVerifyLink: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '600',
        textAlign: 'right',
    },
    dropdown: {
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
    dropdownText: {
        fontSize: 14,
        color: '#1f2937',
    },
    menuContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        maxHeight: 200, // Limit height to prevent cutting off
    },
});
