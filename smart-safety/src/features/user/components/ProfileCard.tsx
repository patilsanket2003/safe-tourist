import { useState } from "react"
import { View, TouchableOpacity, StyleSheet, Image, Modal } from "react-native"
import { Button, Text, IconButton } from "react-native-paper"
import QRCode from "react-native-qrcode-svg"
import { useApp } from "../../../context/AppContext"
import { Ionicons } from "@expo/vector-icons"

export default function ProfileCard() {
  const { state } = useApp()
  const [showQR, setShowQR] = useState(false)

  const rawTouristId = (state.user?.touristId || '').trim()
  const looksLikeDataUrl = rawTouristId.startsWith('data:image/')
  // Guard against accidentally receiving an image data URL in touristId.
  const touristId = (!looksLikeDataUrl && rawTouristId) || `TID${new Date().getFullYear()}001234`
  const userName = state.user?.name || "Tourist"
  const isVerified = true

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Profile Picture */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* User Name */}
        <Text style={styles.userName}>{userName}</Text>

        {/* Tourist ID */}
        <Text style={styles.touristId}>Tourist ID: {touristId}</Text>

        {/* Verified Badge */}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}

        {/* QR Code Button */}
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQR(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={20} color="#1e40af" />
          <Text style={styles.qrButtonText}>Show My QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your QR Code</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowQR(false)}
              />
            </View>

            <View style={styles.qrContainer}>
              <QRCode value={touristId} size={180} />
            </View>

            <Text style={styles.qrTouristId}>{touristId}</Text>
            <Text style={styles.qrDescription}>
              Show this QR code for quick identification at checkpoints
            </Text>

            <Button
              mode="contained"
              onPress={() => setShowQR(false)}
              style={styles.closeButton}
              buttonColor="#1e40af"
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e40af',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  touristId: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  verifiedText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  qrButtonText: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
  },
  qrContainer: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
  },
  qrTouristId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  qrDescription: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  closeButton: {
    width: '100%',
    borderRadius: 12,
  },
})
