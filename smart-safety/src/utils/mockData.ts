export const MOCK_USER = {
  id: "user_1",
  name: "Alex Traveler",
  email: "alex@example.com",
  aadhaar: "XXXX-XXXX-1234", // mock only
  blockchainId: "chain-abc-123", // mock only
}

export const MOCK_CONTACTS = [
  { id: "c1", name: "Local Police", phone: "100" },
  { id: "c2", name: "Tour Operator", phone: "1800-000-000" },
]

export const MOCK_ITINERARY = [
  { id: "t1", title: "Day 1: Jaipur City Tour", date: "2025-09-10", notes: "Hawa Mahal, City Palace" },
  { id: "t2", title: "Day 2: Amber Fort", date: "2025-09-11", notes: "Arrive early to avoid crowd" },
]

// MOCK_GEOFENCES removed - using generated geo-fencing data from assets instead

export const MOCK_GROUP = [
  { id: "u2", name: "Priya", lastCheckIn: "10 mins ago", lat: 28.61, lng: 77.21 },
  { id: "u3", name: "Rahul", lastCheckIn: "5 mins ago", lat: 28.62, lng: 77.2 },
]

export const MOCK_INCIDENTS = [
  { id: "i1", area: "Market", type: "Pickpocketing", risk: 0.6 },
  { id: "i2", area: "Station", type: "Scam", risk: 0.5 },
]

export const MOCK_WEATHER = [
  { code: "clear", risk: 0.1 },
  { code: "rain", risk: 0.4 },
  { code: "storm", risk: 0.7 },
  { code: "heat", risk: 0.5 },
]
