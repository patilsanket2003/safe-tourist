import React, { useEffect, useState } from 'react';
import { SOSAlert } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Phone, User, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatPhoneNumber, formatSOSReason, getSeverityFromScore, getSeverityColors } from '../utils/formatters';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AlertDetailViewProps {
  alert: SOSAlert;
  onClose: () => void;
  onRespond: (alert: SOSAlert) => void;
  onResolve?: (alert: SOSAlert) => Promise<void> | void;
  onMarkFalseAlarm?: (alert: SOSAlert) => void;
}

export const AlertDetailView: React.FC<AlertDetailViewProps> = ({
  alert,
  onClose,
  onRespond,
  onResolve,
  onMarkFalseAlarm,
}) => {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [optimisticEndTime, setOptimisticEndTime] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  
  // Handle dialog close
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  const handleResolveClick = async () => {
    try {
      setIsResolving(true);
      if (onResolve) {
        await onResolve(alert);
      } else {
        await onRespond(alert);
      }
    } finally {
      setIsResolving(false);
    }
  };
  
  // Calculate elapsed time
  useEffect(() => {
    // If already assigned/resolved/responding or we have an optimistic click time
    const isFinished = alert.status === 'assigned' || alert.status === 'responding' || alert.status === 'resolved';
    const endTime = isFinished && alert.responseDate 
      ? new Date(alert.responseDate).getTime() 
      : optimisticEndTime;

    if (endTime) {
      const start = new Date(alert.timestamp).getTime();
      const diff = Math.floor((endTime - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      return;
    }
    
    // Otherwise run live timer
    const startTime = new Date(alert.timestamp).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [alert.timestamp, alert.status, alert.responseDate, optimisticEndTime]);
  
  const reason = formatSOSReason(alert.sosReason);
  const locationName = alert.locationName || alert.location?.locationName || alert.location?.address || 'Unknown Location';
  const lat = alert.location?.lat || alert.location?.coordinates?.[1] || 0;
  const lng = alert.location?.lng || alert.location?.coordinates?.[0] || 0;
  
  // Severity badge color - using new palette
  const severity = alert.severity || getSeverityFromScore(alert.safetyScore || 50);
  const severityColors = getSeverityColors(severity);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        {/* Breadcrumb Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>›</span>
            <span>Alerts</span>
            <span>›</span>
            <span className="text-foreground font-medium">{alert.alertId || alert.id}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 font-semibold">LIVE FEED CONNECTED</span>
          </div>
        </div>

        {/* Alert Header */}
        <div className="px-6 py-4 bg-muted border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Badge className={`${severityColors.bg} ${severityColors.text} uppercase`}>
                  🚨 {severity}
                </Badge>
                <Badge variant="outline" className="uppercase">
                  Status: {alert.status || 'Active'}
                </Badge>
                <Badge variant="outline" className="uppercase">
                  Score: {alert.safetyScore ?? 'N/A'}
                </Badge>
                <span className="text-sm text-muted-foreground border-l border-border pl-3">
                  ID: {alert.alertId || alert.id}
                </span>
                <span className="text-sm text-muted-foreground border-l border-border pl-3">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold mb-2">{reason.toUpperCase()}</h1>
              <p className="text-muted-foreground">
                Tourist reported {reason} and location is {locationName}.
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase mb-1">Response Time Elapsed</div>
              <div className="text-3xl font-bold text-red-600 tabular-nums">{elapsedTime}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span>HRS</span>
                <span className="ml-4">MIN</span>
                <span className="ml-4">SEC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Tourist Info */}
            <div className="space-y-4">
              {/* Tourist Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Tourist Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{alert.touristName}</h3>
                      <div className="text-sm text-muted-foreground">{alert.nationality || 'Unknown'}</div>
                      {alert.touristId && (
                        <div className="text-xs text-muted-foreground mt-1">Pass: {alert.touristId}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Age / Gender</div>
                      <div className="font-semibold">{alert.age || 'N/A'} / {alert.gender || 'Unknown'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Alert */}
              {(alert.medicalConditions || alert.allergies || alert.bloodGroup) && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <Activity className="w-5 h-5" />
                      MEDICAL INFO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-red-800 space-y-1">
                    {alert.bloodGroup && <div>Blood Type: <span className="font-bold">{alert.bloodGroup}</span></div>}
                    {alert.medicalConditions && <div>{alert.medicalConditions}</div>}
                    {alert.allergies && <div>Allergies: {alert.allergies}</div>}
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Tourist Mobile</div>
                    <a
                      href={`tel:${alert.phone || alert.emergencyContact?.phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Phone className="w-4 h-4" />
                      {formatPhoneNumber(alert.phone || alert.emergencyContact?.phone || 'N/A')}
                    </a>
                  </div>
                  
                  {alert.emergencyContact && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase mb-1">
                          Emergency Contact ({alert.emergencyContact.relation || 'Family'})
                        </div>
                        <div className="font-semibold mb-1">
                          {alert.emergencyContact.name}
                        </div>
                        <a
                          href={`tel:${alert.emergencyContact.phone}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-4 h-4" />
                          {formatPhoneNumber(alert.emergencyContact.phone)}
                        </a>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Map */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="h-96 relative">
                  {lat !== 0 && lng !== 0 ? (
                    <MapContainer
                      center={[lat, lng]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                      className="z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[lat, lng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{alert.touristName}</div>
                            <div>{locationName}</div>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-2" />
                        <div>Location unavailable</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 bg-background rounded-lg shadow-lg p-3 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span className="text-xs font-bold">SOS LOCATION</span>
                    </div>
                    <div className="text-xs text-muted-foreground">±5m Accuracy</div>
                  </div>
                </div>
                
                <CardContent className="p-4 border-t">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">{locationName}</div>
                      <div className="text-sm text-muted-foreground">
                        {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
                      </div>
                      <div className="text-xs text-muted-foreground">Srinagar, J&K</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                    >
                      Open in Maps
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Route to Unit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/50">
          <div className="flex items-center justify-center gap-4 w-full">
            {onMarkFalseAlarm && !['assigned', 'responding', 'resolved'].includes(alert.status) && (
              <Button
                variant="outline"
                onClick={() => onMarkFalseAlarm(alert)}
              >
                MARK FALSE ALARM
              </Button>
            )}
            
            {(alert.status === 'assigned' || alert.status === 'responding') ? (
               <Button
                 variant="default"
                 onClick={handleResolveClick}
                 disabled={isResolving}
                 className="bg-green-600 hover:bg-green-700"
               >
                 <CheckCircle className="w-5 h-5 mr-2" />
                 {isResolving ? "RESOLVING..." : "RESOLVE ALERT"}
               </Button>
            ) : alert.status !== 'resolved' && (
              <Button
                variant="destructive"
                onClick={() => {
                  setOptimisticEndTime(Date.now());
                  onRespond(alert);
                }}
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                RESPOND NOW
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
