import { Tourist, SOSAlert, DashboardMetrics } from '../types';

export const mockTourists: Tourist[] = [
  {
    id: 'T001',
    name: 'John Smith',
    govIdHash: '0x7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
    country: 'USA',
    phoneNumber: '+1-555-0123',
    emergencyContact: '+1-555-0124',
    tripValidFrom: '2024-01-15',
    tripValidTo: '2024-02-15',
    safetyScore: 85,
    status: 'active',
    lastKnownLocation: {
      lat: 28.6139,
      lng: 77.2090,
      address: 'India Gate, New Delhi',
      timestamp: '2024-01-20T10:30:00Z'
    },
    travelItinerary: ['Delhi', 'Agra', 'Jaipur', 'Mumbai']
  },
  {
    id: 'T002',
    name: 'Emma Johnson',
    govIdHash: '0x8e976f869c7f1a8b2d7f4c3e5a9b8d1f2e4a6c8b9d0e3f7a1c5b8d2e9f4c6a7b',
    country: 'UK',
    phoneNumber: '+44-7700-900123',
    emergencyContact: '+44-7700-900124',
    tripValidFrom: '2024-01-10',
    tripValidTo: '2024-02-10',
    safetyScore: 92,
    status: 'active',
    lastKnownLocation: {
      lat: 27.1751,
      lng: 78.0421,
      address: 'Taj Mahal, Agra',
      timestamp: '2024-01-20T14:15:00Z'
    },
    travelItinerary: ['Delhi', 'Agra', 'Varanasi', 'Goa']
  },
  {
    id: 'T003',
    name: 'Hans Mueller',
    govIdHash: '0x9f087a96ad3b7e9c8d1e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    country: 'Germany',
    phoneNumber: '+49-176-12345678',
    emergencyContact: '+49-176-87654321',
    tripValidFrom: '2023-12-20',
    tripValidTo: '2024-01-20',
    safetyScore: 78,
    status: 'expired',
    lastKnownLocation: {
      lat: 26.9124,
      lng: 75.7873,
      address: 'Hawa Mahal, Jaipur',
      timestamp: '2024-01-19T16:45:00Z'
    },
    travelItinerary: ['Jaipur', 'Udaipur', 'Jodhpur']
  }
];

export const mockSOSAlerts: SOSAlert[] = [
  {
    id: 'SOS001',
    touristId: 'T004',
    touristName: 'Maria Garcia',
    location: {
      lat: 19.0760,
      lng: 72.8777,
      address: 'Marine Drive, Mumbai'
    },
    emergencyType: 'medical',
    severity: 'high',
    timestamp: '2024-01-20T15:30:00Z',
    status: 'new',
    contactInfo: '+34-666-123456',
    description: 'Tourist reported sudden chest pain and difficulty breathing'
  },
  {
    id: 'SOS002',
    touristId: 'T005',
    touristName: 'David Kim',
    location: {
      lat: 15.2993,
      lng: 74.1240,
      address: 'Calangute Beach, Goa'
    },
    emergencyType: 'accident',
    severity: 'medium',
    timestamp: '2024-01-20T12:45:00Z',
    status: 'assigned',
    assignedUnit: 'Unit-007',
    contactInfo: '+82-10-1234-5678',
    description: 'Tourist involved in minor scooter accident, requires assistance'
  },
  {
    id: 'SOS003',
    touristId: 'T006',
    touristName: 'Sarah Wilson',
    location: {
      lat: 25.1972,
      lng: 55.2744,
      address: 'Pushkar Lake, Rajasthan'
    },
    emergencyType: 'lost',
    severity: 'low',
    timestamp: '2024-01-20T11:20:00Z',
    status: 'in_progress',
    assignedUnit: 'Unit-003',
    contactInfo: '+1-555-987654',
    description: 'Tourist lost in desert area, no mobile signal for 2 hours'
  }
];

export const mockMetrics: DashboardMetrics = {
  activeTourists: 1247,
  sosToday: 8,
  highRiskZones: 3,
  expiredIds: 42,
  resolvedCases: 156,
  responseTime: '4.2 min'
};

export const mockUsers = [
  {
    email: 'police@system.gov',
    password: 'police123',
    role: 'police' as const,
    name: 'Officer Raj Singh',
    department: 'Delhi Police'
  },
  {
    email: 'tourism@system.gov',
    password: 'tourism123',
    role: 'tourism' as const,
    name: 'Ms. Priya Sharma',
    department: 'Tourism Ministry'
  },
  {
    email: 'admin@system.gov',
    password: 'admin123',
    role: 'admin' as const,
    name: 'System Administrator',
    department: 'IT Department'
  }
];