import { useEffect, useState, useCallback } from 'react'
import { View, FlatList } from 'react-native'
import { List, Appbar, Text, Badge } from 'react-native-paper'
import transitionStore, { TransitionRecord } from '../store/transitionStore'
import { t } from '../../../context/translations'
import { useApp } from '../../../context/AppContext'
import { syncTransitions } from '../services/syncTransitions'
import { clearTransitions } from '../store/transitionStore'

export default function TransitionsScreen() {
  const { state } = useApp()
  const [items, setItems] = useState<TransitionRecord[]>([])
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    const data = await transitionStore.getTransitions()
    setItems(data)
    setUnsyncedCount(data.length)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await load() })()
    return () => { mounted = false }
  }, [load])

  useEffect(() => {
    // Refresh count when screen focus happens is handled by navigation; simple approach: poll on interval while mounted
    const iv = setInterval(() => load(), 5000)
    return () => clearInterval(iv)
  }, [load])

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.Content title={t(state.language, 'transitions') || 'Transitions'} subtitle={unsyncedCount > 0 ? `${unsyncedCount} unsynced` : ''} />
        <Appbar.Action icon={syncing ? 'cloud-sync' : 'cloud'} onPress={async () => { setSyncing(true); try { const r = await syncTransitions(); await load(); } finally { setSyncing(false) } }} />
        <Appbar.Action icon="delete" onPress={async () => { await clearTransitions(); await load() }} />
      </Appbar.Header>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.type.toUpperCase()} — ${item.fenceName || item.fenceId}`}
            description={`${new Date(item.at).toLocaleString()} ${item.coords ? `@ ${item.coords.latitude.toFixed(4)},${item.coords.longitude.toFixed(4)}` : ''}`}
          />
        )}
        ListEmptyComponent={() => <Text style={{ padding: 12, textAlign: 'center' }}>No transitions recorded</Text>}
      />
    </View>
  )
}
