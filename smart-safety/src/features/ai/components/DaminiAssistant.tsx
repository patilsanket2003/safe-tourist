import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TextInput, ScrollView, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SERVER_URL } from '../../../config';
import { useLocation } from '../../../context/LocationContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  status?: string;
  isEmergency?: boolean;
}

export default function DaminiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Damini 👋\n\nI'm your Smart Tourist Safety Assistant.\n\nI can check your route, nearby hazards, weather, traffic and important travel disruptions.\n\nHow can I help you stay safe today?",
      isUser: false
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const { currentLocation } = useLocation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const isMobile = width < 768;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch(`${SERVER_URL}/api/ai/damini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          location: currentLocation ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          } : null
        })
      });

      const data = await response.json();
      
      let isEmergency = false;
      let finalMessage = data.message;
      if (finalMessage.includes('ACTIVATING_EMERGENCY_MODE')) {
        isEmergency = true;
        finalMessage = finalMessage.replace('ACTIVATING_EMERGENCY_MODE', '').trim();
        if (!finalMessage) finalMessage = 'I am activating Emergency Mode. Please stay calm.';
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: finalMessage,
        isUser: false,
        status: data.status,
        isEmergency
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I couldn't reach the safety servers right now.",
        isUser: false,
        status: 'DATA UNAVAILABLE'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "🛡️ Check My Safety", query: "Am I safe right now?" },
    { label: "🗺️ Check My Route", query: "Is my route safe?" },
    { label: "⚠️ Nearby Hazards", query: "Are there any hazards near me?" },
    { label: "🌦️ Weather", query: "What's the weather?" },
    { label: "🆘 Emergency Help", query: "Help me" }
  ];

  return (
    <>
      <Animated.View style={[styles.floatingButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => setIsOpen(true)}>
          <Text style={styles.buttonIcon}>👩</Text>
          <Text style={styles.buttonText}>Damini AI</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={isOpen} transparent={true} animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.chatContainer, isMobile ? styles.mobileContainer : styles.desktopContainer]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerAvatar}>👩</Text>
                <View>
                  <Text style={styles.headerTitle}>Damini AI</Text>
                  <Text style={styles.headerSubtitle}>🟢 Online • Safety Assistant</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView 
              style={styles.chatArea} 
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map(msg => (
                <View key={msg.id} style={[styles.messageWrapper, msg.isUser ? styles.userWrapper : styles.aiWrapper]}>
                  {!msg.isUser && <Text style={styles.msgAvatar}>👩</Text>}
                  <View style={[
                    styles.messageBubble, 
                    msg.isUser ? styles.userBubble : styles.aiBubble,
                    msg.isEmergency && styles.emergencyBubble
                  ]}>
                    <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.aiText, msg.isEmergency && styles.emergencyText]}>
                      {msg.text}
                    </Text>
                    {msg.status && !msg.isUser && (
                      <View style={[styles.statusBadge, getStatusStyle(msg.status)]}>
                        <Text style={styles.statusText}>{msg.status}</Text>
                      </View>
                    )}
                    {msg.isEmergency && (
                      <View style={styles.emergencyActions}>
                        <TouchableOpacity style={styles.emgBtn}><Text style={styles.emgBtnText}>📞 Call Police</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.emgBtn}><Text style={styles.emgBtnText}>🏥 Find Hospital</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {loading && <Text style={styles.typingText}>Damini is analyzing...</Text>}
            </ScrollView>

            {/* Quick Actions (only show if no messages sent yet, or as horizontal scroll) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsContainer}>
              {quickActions.map(action => (
                <TouchableOpacity key={action.label} style={styles.quickActionBtn} onPress={() => sendMessage(action.query)}>
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input}
                placeholder="Ask Damini anything..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => sendMessage(inputText)}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(inputText)}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'LOW RISK': return { backgroundColor: '#e8f5e9', borderColor: '#4caf50' };
    case 'CAUTION': return { backgroundColor: '#fff8e1', borderColor: '#ffc107' };
    case 'HIGH RISK': return { backgroundColor: '#ffebee', borderColor: '#f44336' };
    case 'VERY HIGH RISK': return { backgroundColor: '#b71c1c', borderColor: '#ff5252' };
    default: return { backgroundColor: '#f5f5f5', borderColor: '#9e9e9e' };
  }
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },
  floatingButton: {
    backgroundColor: '#0a2540',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  chatContainer: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  mobileContainer: {
    width: '100%',
    height: '90%',
  },
  desktopContainer: {
    width: 400,
    height: 650,
    position: 'absolute',
    bottom: 90,
    right: 24,
    borderRadius: 16,
  },
  header: {
    backgroundColor: '#0a2540',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    fontSize: 28,
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#4caf50',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    fontSize: 24,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#1976d2',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emergencyBubble: {
    backgroundColor: '#ffebee',
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  emergencyText: {
    color: '#b71c1c',
    fontWeight: 'bold',
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyActions: {
    marginTop: 12,
    gap: 8,
  },
  emgBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emgBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
    marginLeft: 36,
  },
  quickActionsContainer: {
    maxHeight: 50,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  quickActionBtn: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#90caf9',
    height: 36,
  },
  quickActionText: {
    color: '#1565c0',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#0a2540',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  }
});
