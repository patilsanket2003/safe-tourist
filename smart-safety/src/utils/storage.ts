import AsyncStorage from '@react-native-async-storage/async-storage'

export async function readJSON<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw) as T
  } catch (e) {
    console.warn(`readJSON failed for ${key}`, e)
    return defaultValue
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`writeJSON failed for ${key}`, e)
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch (e) {
    console.warn(`remove failed for ${key}`, e)
  }
}

export async function pushToList<T>(key: string, item: T, maxItems = 2000): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key)
    const arr: T[] = raw ? JSON.parse(raw) : []
    arr.unshift(item)
    if (arr.length > maxItems) arr.length = maxItems
    await AsyncStorage.setItem(key, JSON.stringify(arr))
  } catch (e) {
    console.warn(`pushToList failed for ${key}`, e)
  }
}

export default { readJSON, writeJSON, remove, pushToList }
