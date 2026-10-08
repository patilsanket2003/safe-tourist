import React, { createContext, useContext, useState, useMemo } from 'react';
import * as Location from 'expo-location';

type LocationContextType = {
  currentLocation: Location.LocationObject | null;
  currentAddress: string | null;
  setCurrentLocation: (location: Location.LocationObject | null) => void;
  setCurrentAddress: (address: string | null) => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      currentLocation,
      currentAddress,
      setCurrentLocation,
      setCurrentAddress,
    }),
    [currentLocation, currentAddress]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
