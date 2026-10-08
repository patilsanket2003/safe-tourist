/**
 * Utility functions for formatting alert data
 */

/**
 * Format timestamp to relative time (e.g., "2 mins ago", "1 hour ago")
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffMs = now.getTime() - alertTime.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return alertTime.toLocaleDateString();
  }
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +XX-XXX-XXX-XXXX for Indian numbers
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  
  // Generic format
  return phone;
};

/**
 * Get severity level from safety score (0-100, lower is more critical)
 * Note: If score is between 0-1, it's converted to 0-100 scale
 */
export const getSeverityFromScore = (safetyScore: number): 'critical' | 'high' | 'medium' | 'low' => {
  // Convert decimal scores (0-1) to percentage (0-100)
  const score = safetyScore <= 1 ? safetyScore * 100 : safetyScore;
  
  if (score <= 20) return 'critical';
  if (score <= 40) return 'high';
  if (score <= 60) return 'medium';
  return 'low';
};

/**
 * Get color classes for severity badge
 */
export const getSeverityColors = (severity: 'critical' | 'high' | 'medium' | 'low'): {
  bg: string;
  text: string;
  border: string;
} => {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-900', text: 'text-white', border: 'border-red-700' };
    case 'high':
      return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' };
    case 'medium':
      return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-300' };
    case 'low':
      return { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-300' };
  }
};

/**
 * Get color for severity indicator bar
 */
export const getSeverityBarColor = (severity: 'critical' | 'high' | 'medium' | 'low'): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-900';
    case 'high':
      return 'bg-red-600';
    case 'medium':
      return 'bg-orange-500';
    case 'low':
      return 'bg-yellow-500';
  }
};

/**
 * Format SOS reason for display
 */
export const formatSOSReason = (sosReason: any): string => {
  if (typeof sosReason === 'string') return sosReason;
  if (sosReason?.reason) return sosReason.reason;
  return 'Emergency';
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
