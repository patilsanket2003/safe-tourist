
import { useState } from "react"
import { View } from "react-native"
import { Button, IconButton, List, Modal, Portal, TextInput, Text } from "react-native-paper"
import { useApp } from "../../../context/AppContext"
import { t } from "../../../context/translations"

export default function EmergencyContacts({ compact = false }: { compact?: boolean }) {
  const { state, addContact, updateContact, removeContact } = useApp()
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const openNew = () => {
    setEditingId(null)
    setName("")
    setPhone("")
    setVisible(true)
  }
  const openEdit = (id: string, n: string, p: string) => {
    setEditingId(id)
    setName(n)
    setPhone(p)
    setVisible(true)
  }
  const save = () => {
    if (editingId) updateContact(editingId, { name, phone })
    else addContact({ name, phone })
    setVisible(false)
  }

  return (
    <View style={{ padding: compact ? 8 : 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 8 : 16 }}>
        <Text style={{ fontSize: compact ? 16 : 20, fontWeight: 'bold' }}>{t(state.language, "emergencyContacts")}</Text>
        {!compact && <Button onPress={openNew}>{t(state.language, "add")}</Button>}
      </View>

      {compact ? (
        <View style={{ gap: 8 }}>
          {state.contacts.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f3f3', padding: 12, borderRadius: 12 }}>
              <View>
                <Text style={{ fontWeight: '600' }}>{c.name}</Text>
                <Text>{c.phone}</Text>
              </View>
              <IconButton icon="phone" onPress={() => {/* ideally initiate phone call */}} />
            </View>
          ))}
        </View>
      ) : (
        <List.Section>
          {state.contacts.map((c) => (
            <List.Item
              key={c.id}
              title={`${c.name} (${c.phone})`}
              right={() => (
                <View style={{ flexDirection: "row" }}>
                  <IconButton icon="pencil" onPress={() => openEdit(c.id, c.name, c.phone)} />
                  <IconButton icon="delete" onPress={() => removeContact(c.id)} />
                </View>
              )}
            />
          ))}
        </List.Section>
      )}

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", padding: 16, margin: 16, borderRadius: 8 }}
        >
          <TextInput label="Name" value={name} onChangeText={setName} style={{ marginBottom: 8 }} />
          <TextInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ marginBottom: 8 }}
          />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Button onPress={() => setVisible(false)}>{t(state.language, "cancel")}</Button>
            <Button mode="contained" onPress={save}>
              {t(state.language, "save")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  )
}
