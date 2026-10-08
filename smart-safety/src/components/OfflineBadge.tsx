import { View, ActivityIndicator } from "react-native"
import { HelperText, Switch, Text } from "react-native-paper"
import { useApp } from "../context/AppContext"
import { t } from "../context/translations"

export default function OfflineBadge() {
  const { state, setOffline, netInfoAvailable } = useApp()

  // netInfoAvailable may be null while AppContext detects it; show spinner until resolved
  if (netInfoAvailable === null) {
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size={18} />
          <Text variant="labelLarge">{t(state.language, "offlineMode")}</Text>
        </View>
        {state.offline && <HelperText type="info">{t(state.language, "offlineInfo")}</HelperText>}
      </View>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch value={state.offline} onValueChange={setOffline} disabled={!!netInfoAvailable} />
        <Text variant="labelLarge">{t(state.language, "offlineMode")}</Text>
      </View>
      {state.offline && <HelperText type="info">{t(state.language, "offlineInfo")}</HelperText>}
    </View>
  )
}
