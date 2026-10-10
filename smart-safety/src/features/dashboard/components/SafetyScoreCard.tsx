import { View, StyleSheet } from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Circle } from "react-native-svg"
import { useApp } from "../../../context/AppContext"

export default function SafetyScoreCard() {
    const { state } = useApp()

    // Priority: computedSafetyScore (from real API) > user.safetyScore > null for loading
    const score = state.computedSafetyScore ?? state.user?.safetyScore ?? null
    const isLoading = score === null

    // Determine rating based on score
    const getRating = (score: number) => {
        if (score >= 90) return { label: "Excellent", message: "Your account is protected", color: "#22c55e" }
        if (score >= 70) return { label: "Good", message: "Your account is mostly secure", color: "#22c55e" }
        if (score >= 50) return { label: "Fair", message: "Some improvements needed", color: "#eab308" }
        return { label: "Poor", message: "Please review your security", color: "#ef4444" }
    }

    const rating = score !== null ? getRating(score) : { label: "Loading...", message: "Calculating score", color: "#6b7280" }

    // Circular progress calculations
    const size = 72
    const strokeWidth = 6
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const displayScore = score ?? 0
    const progress = (displayScore / 100) * circumference
    const strokeDashoffset = circumference - progress

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.content}>
                    {/* Left side - Text content */}
                    <View style={styles.textContent}>
                        <Text style={styles.label}>Security Score</Text>
                        <Text style={styles.rating}>{rating.label}</Text>
                        <View style={styles.messageRow}>
                            {!isLoading && <Ionicons name="checkmark-circle" size={16} color={rating.color} />}
                            {isLoading && <ActivityIndicator size={14} color="#6b7280" />}
                            <Text style={[styles.message, { color: rating.color }]}>{rating.message}</Text>
                        </View>
                    </View>

                    {/* Right side - Circular progress */}
                    <View style={styles.progressContainer}>
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#F97316" />
                        ) : (
                            <>
                                <Svg width={size} height={size} style={styles.svg}>
                                    <Circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        stroke="#27272A"
                                        strokeWidth={strokeWidth}
                                        fill="transparent"
                                    />
                                    {/* Progress circle */}
                                    <Circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        stroke="#F97316"
                                        strokeWidth={strokeWidth}
                                        fill="transparent"
                                        strokeDasharray={`${circumference}, ${circumference}`}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        rotation={-90}
                                        originX={size / 2}
                                        originY={size / 2}
                                    />
                                </Svg>
                                <View style={styles.scoreContainer}>
                                    <Text style={styles.scoreText}>{displayScore}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#141414',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContent: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: '#A1A1AA',
        marginBottom: 4,
        fontWeight: '500',
    },
    rating: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    message: {
        fontSize: 13,
        fontWeight: '500',
    },
    progressContainer: {
        position: 'relative',
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        position: 'absolute',
    },
    scoreContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F97316',
    },
})
