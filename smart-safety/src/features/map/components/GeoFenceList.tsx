
import React from "react"
import { View } from "react-native"
import { Button, Card, List, Snackbar } from "react-native-paper"
import { useApp } from "../../../context/AppContext"
import { t } from "../../../context/translations"

export default function GeoFenceList() {
  const { state } = useApp()
  const [snack, setSnack] = React.useState<{ visible: boolean; msg: string }>({ visible: false, msg: "" })

  const fire = (zone: string, action: "enter" | "exit") => {
    const msg = `${action === "enter" ? "Entered" : "Exited"} ${zone} (mock alert)`
    setSnack({ visible: true, msg })
  }

  return (
    <Card>
      <Card.Title title={t(state.language, "geofence")} />
      <Card.Content>
        <List.Section>
          {state.geofences.map((g) => (
            <List.Item
              key={g.id}
              title={`${g.name} — Risk: ${g.risk}`}
              right={() => (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Button onPress={() => fire(g.name, "enter")}>{t(state.language, "enter")}</Button>
                  <Button onPress={() => fire(g.name, "exit")}>{t(state.language, "exit")}</Button>
                </View>
              )}
            />
          ))}
        </List.Section>
      </Card.Content>
      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, msg: "" })} duration={2000}>
        {snack.msg}
      </Snackbar>
    </Card>
  )
}
