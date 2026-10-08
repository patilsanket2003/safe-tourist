
import { useEffect, useMemo, useState } from "react"
import { View, ScrollView } from "react-native"
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper"
import { Platform, Dimensions, useWindowDimensions } from "react-native"
import { useApp } from "../../../context/AppContext"
import { t } from "../../../context/translations"
import { getAlerts } from "../../../utils/api";

type Incident = { id: string; title: string; status: "Open" | "Resolved"; area: string; time: string }

const mockTourists = [
  { id: "u1", name: "Alex Traveler", lat: 28.61, lng: 77.21 },
  { id: "u2", name: "Priya", lat: 28.62, lng: 77.2 },
  { id: "u3", name: "Rahul", lat: 28.63, lng: 77.19 },
]

export default function AuthorityDashboardScreen() {
  const { state } = useApp()
  const [filter, setFilter] = useState<"All" | "Open" | "Resolved">("All")
  const [selected, setSelected] = useState<(typeof mockTourists)[0] | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { width } = useWindowDimensions();
  const isLaptop = Platform.OS === 'web' && width >= 1024;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const handleLogin = () => {
    if (username === "admin" && password === "SmartTourist@2024") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid credentials");
    }
  };

  if (!isLaptop) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text variant="titleLarge" style={{ color: 'red', textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ textAlign: 'center', marginTop: 10 }}>
          The Authority Dashboard is only accessible from a laptop or desktop device.
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Card style={{ width: 400, padding: 20 }}>
          <Text variant="titleLarge" style={{ textAlign: 'center', marginBottom: 20 }}>Authority Login</Text>
          <TextInput 
            label="Username" 
            value={username} 
            onChangeText={setUsername} 
            mode="outlined" 
            style={{ marginBottom: 15 }} 
          />
          <TextInput 
            label="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            mode="outlined" 
            style={{ marginBottom: 15 }} 
          />
          {authError ? <Text style={{ color: 'red', marginBottom: 10 }}>{authError}</Text> : null}
          <Button mode="contained" onPress={handleLogin}>Login</Button>
        </Card>
      </View>
    );
  }

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!state.token) return;
      setLoading(true);
      try {
        const response = await getAlerts(state.token);
        const formattedIncidents = response.alerts.map((alert: any) => ({
          id: alert._id || alert.id,
          title: alert.sosReason.reason,
          status: alert.status === 'new' ? 'Open' : 'Resolved',
          area: alert.location.locationName,
          time: new Date(alert.timestamp).toLocaleTimeString(),
        }));
        setIncidents(formattedIncidents);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [state.token]);

  const filteredIncidents = useMemo(() => {
    if (filter === "All") return incidents
    return incidents.filter((i) => i.status === filter)
  }, [filter, incidents])

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.Content title={t(state.language, "authority")} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        <Card>
          <Card.Title title="Tourists (Mock)" />
          <Card.Content>
            <List.Section>
              {mockTourists.map((tour) => (
                <List.Item
                  key={tour.id}
                  title={`${tour.name} — (${tour.lat.toFixed(2)}, ${tour.lng.toFixed(2)})`}
                  right={() => <IconButton icon="information-outline" onPress={() => setSelected(tour)} />}
                />
              ))}
            </List.Section>
          </Card.Content>
        </Card>

        <Card>
          <Card.Title
            title="Incidents / Alerts "
            right={() => (
              <SegmentedButtons
                value={filter}
                onValueChange={(v: any) => setFilter(v)}
                buttons={[
                  { value: "All", label: t(state.language, "all") },
                  { value: "Open", label: t(state.language, "open") },
                  { value: "Resolved", label: t(state.language, "resolved") },
                ]}
              />
            )}
          />
          <Card.Content>
            {loading ? <Text>Loading...</Text> : <List.Section>
              {filteredIncidents.map((inc) => (
                <List.Item
                  key={inc.id}
                  title={`${inc.title} — ${inc.area}`}
                  description={`Time: ${inc.time} | Status: ${inc.status}`}
                  left={(props) => <List.Icon {...props} icon={inc.status === "Open" ? "alert" : "check"} />}
                  right={() => <Chip>{inc.status}</Chip>}
                />
              ))}
            </List.Section>}
          </Card.Content>
        </Card>

        <Card>
          <Card.Title title="Safety Analytics (Mock)" />
          <Card.Content>
            {/* Simple bar view instead of real charts */}
            <Text>Alerts by Area</Text>
            <View style={{ height: 8 }} />
            {["Market", "Station", "Fort"].map((area, idx) => {
              const width = [80, 50, 30][idx]
              return (
                <View key={area} style={{ marginBottom: 8 }}>
                  <Text>{area}</Text>
                  <View style={{ height: 10, backgroundColor: "#eee", borderRadius: 5 }}>
                    <View style={{ width: `${width}%`, height: 10, backgroundColor: "#0077CC", borderRadius: 5 }} />
                  </View>
                </View>
              )
            })}
          </Card.Content>
        </Card>

        <Card>
          <Card.Title title="Reporting (Mock)" />
          <Card.Content>
            <Text>- Daily Summary: 12 alerts, 9 resolved, 3 open</Text>
            <Text>- Top Risk Areas: Market, Station</Text>
            <Text>- Response Avg Time: 7m</Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={!!selected} onDismiss={() => setSelected(null)}>
          <Dialog.Title>Tourist Detail</Dialog.Title>
          <Dialog.Content>
            <Text>{selected?.name}</Text>
            <Text>
              Location: {selected?.lat.toFixed(3)}, {selected?.lng.toFixed(3)} (mock)
            </Text>
            <Text>Sharing: {state.shareLocation ? "Yes" : "No"}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}
