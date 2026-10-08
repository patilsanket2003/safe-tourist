import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../context/AppContext';

export default function EmergencyLoginScreen({ navigation }: any) {
    const { state, loginEmergency } = useApp();
    const [vehicleId, setVehicleId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!vehicleId.trim()) {
            Alert.alert('Error', 'Please enter your Vehicle ID');
            return;
        }

        console.log("EmergencyLoginScreen: Attempting login for", vehicleId);
        setLoading(true);
        try {
            const result = await loginEmergency(vehicleId.trim());
            console.log("EmergencyLoginScreen: Login result:", result);
            if (result.success) {
                console.log("EmergencyLoginScreen: Login successful, waiting for navigation...");
                // Wait for Context to update and reroute automatically, or we can navigate
            } else {
                console.error("EmergencyLoginScreen: Login failed:", result.message);
                Alert.alert('Login Failed', result.message || 'Invalid Vehicle ID or not approved by Admin');
            }
        } catch (error: any) {
            console.error("EmergencyLoginScreen: Login error:", error);
            Alert.alert('Error', error.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="medical" size={40} color="#dc2626" />
                    </View>
                    <Text style={styles.title}>Emergency Vehicle</Text>
                    <Text style={styles.subtitle}>Enter your assigned vehicle ID to continue</Text>
                </View>

                <Surface style={styles.formCard} elevation={2}>
                    <TextInput
                        label="Vehicle ID (e.g. ambulance-101)"
                        value={vehicleId}
                        onChangeText={setVehicleId}
                        mode="outlined"
                        autoCapitalize="none"
                        style={styles.input}
                        left={<TextInput.Icon icon="car" />}
                    />

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading || !vehicleId}
                        style={styles.loginButton}
                        contentStyle={styles.buttonContent}
                    >
                        Login as Responder
                    </Button>
                </Surface>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    backButton: {
        marginBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#fee2e2',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    formCard: {
        padding: 20,
        borderRadius: 16,
        backgroundColor: 'white',
    },
    input: {
        marginBottom: 24,
        backgroundColor: 'white',
    },
    loginButton: {
        borderRadius: 8,
        backgroundColor: '#dc2626',
    },
    buttonContent: {
        height: 48,
    },
});
