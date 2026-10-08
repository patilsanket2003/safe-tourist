import { Linking, Platform } from 'react-native'

export type SmsPayload = {
  recipients: string[]
  message: string
}

/**
 * Opens the native SMS app with pre-filled recipients and message
 * This allows the user to review and send the message manually
 * Works on both Android and iOS
 */
export async function sendSMS(
  payload: SmsPayload,
): Promise<{ ok: boolean; result?: any; reason?: string }> {
  try {
    if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      console.warn('[SMS] No recipients provided')
      return { ok: false, reason: 'no_recipients' }
    }

    if (Platform.OS === 'web') {
      console.warn('[SMS] SMS not supported on web')
      return { ok: false, reason: 'web_unsupported' }
    }

    // Format recipients - remove duplicates and filter invalid numbers
    const uniqueRecipients = [...new Set(payload.recipients)]
      .filter(num => num && num.trim().length > 0)
      .map(num => num.trim())

    if (uniqueRecipients.length === 0) {
      console.warn('[SMS] No valid recipients after filtering')
      return { ok: false, reason: 'no_valid_recipients' }
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(payload.message)

    // Build SMS URL based on platform
    let smsUrl: string
    
    if (Platform.OS === 'ios') {
      // iOS format: sms:+1234567890,+0987654321&body=Hello
      const recipientsString = uniqueRecipients.join(',')
      smsUrl = `sms:${recipientsString}&body=${encodedMessage}`
    } else {
      // Android format: sms:+1234567890,+0987654321?body=Hello
      const recipientsString = uniqueRecipients.join(',')
      smsUrl = `sms:${recipientsString}?body=${encodedMessage}`
    }

    console.log('[SMS] Opening native SMS app for', uniqueRecipients.length, 'recipients')
    
    // Check if SMS URL scheme is supported
    const canOpen = await Linking.canOpenURL(smsUrl)
    if (!canOpen) {
      console.warn('[SMS] SMS URL scheme not supported')
      return { ok: false, reason: 'sms_not_supported' }
    }

    // Open the native SMS app
    await Linking.openURL(smsUrl)
    
    console.log('[SMS] ✅ Native SMS app opened successfully')
    return { 
      ok: true, 
      result: { 
        channel: 'native-sms-app',
        recipients: uniqueRecipients,
        recipientCount: uniqueRecipients.length
      } 
    }
  } catch (e) {
    console.warn('[SMS] Failed to open native SMS app:', e)
    return { ok: false, reason: 'unexpected_error' }
  }
}

export default { sendSMS }
