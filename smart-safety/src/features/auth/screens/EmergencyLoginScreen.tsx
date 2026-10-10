import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput as NativeTextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../context/AppContext';
import { useAppTheme } from '../../../context/ThemeContext';
import InteractiveAuthBackground from '../../../components/InteractiveAuthBackground';
import ThemeToggle from '../../../components/ThemeToggle';
import LiquidGlassCard from '../../../components/LiquidGlassCard';
import LiquidGlassButton from '../../../components/LiquidGlassButton';

export default function EmergencyLoginScreen({ navigation }: any) {
    const { loginEmergency } = useApp();
    const { isDark, colors } = useAppTheme();
    const [vehicleId, setVehicleId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!vehicleId.trim()) {
            Alert.alert('Error', 'Please enter your Vehicle ID');
            return;
        }

        setLoading(true);
        try {
            const result = await loginEmergency(vehicleId.trim());
            if (!result.success) {
                Alert.alert('Login Failed', result.message || 'Invalid Vehicle ID or not approved by Admin');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Interactive Animated Background */}
            <InteractiveAuthBackground />

            {/* Top Bar with Back and Theme Toggle */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={[
                        styles.navIconButton,
                        Platform.OS === 'web'
                            ? ({
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: isDark
                                        ? '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                                        : '0 4px 12px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)',
                              } as any)
                            : {},
                        {
                            backgroundColor: colors.toggleBg,
                            borderColor: colors.toggleBorder,
                        },
                    ]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <ThemeToggle />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1, zIndex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                enabled
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Liquid Glass Card */}
                    <LiquidGlassCard maxWidth={360}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    Platform.OS === 'web'
                                        ? ({
                                                boxShadow: '0 0 16px rgba(239, 68, 68, 0.3), inset 0 1px 1px rgba(255,255,255,0.4)',
                                          } as any)
                                        : {},
                                ]}
                            >
                                <Ionicons name="medical" size={26} color="#dc2626" />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Emergency Vehicle
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Enter your assigned vehicle ID to connect as a First Responder
                            </Text>
                        </View>

                        {/* Input Field */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>
                                Vehicle ID
                            </Text>
                            <View
                                style={[
                                    styles.liquidInputWrapper,
                                    Platform.OS === 'web'
                                        ? ({
                                                backdropFilter: 'blur(14px)',
                                                boxShadow: isDark
                                                    ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1)'
                                                    : 'inset 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 1px rgba(255, 255, 255, 0.8)',
                                          } as any)
                                        : {},
                                    {
                                        backgroundColor: colors.inputBg,
                                        borderColor: colors.inputBorder,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name="car-outline"
                                    size={20}
                                    color="#ef4444"
                                    style={{ marginRight: 10 }}
                                />
                                <NativeTextInput
                                    value={vehicleId}
                                    onChangeText={setVehicleId}
                                    placeholder="e.g. ambulance-101, police-04"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={[styles.nativeInput, { color: colors.inputText }]}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Liquid Glass Responder Button */}
                        <View style={{ marginTop: 4, marginBottom: 12 }}>
                            <LiquidGlassButton
                                onPress={handleLogin}
                                loading={loading}
                                disabled={loading || !vehicleId.trim()}
                                variant="destructive"
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="shield" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                                        Login as Responder
                                    </Text>
                                </View>
                            </LiquidGlassButton>
                        </View>

                        {/* Back to tourist login link */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.backLink}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.backLinkText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                                Return to{' '}
                                <Text style={{ color: '#F97316', fontWeight: '700' }}>Tourist Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </LiquidGlassCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    topBar: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 24 : 50,
        left: 24,
        right: 24,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 18,
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 2,
    },
    liquidInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 44,
    },
    nativeInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
        paddingVertical: 0,
        outlineStyle: 'none' as any,
    },
    backLink: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    backLinkText: {
        fontSize: 14,
    },
});
