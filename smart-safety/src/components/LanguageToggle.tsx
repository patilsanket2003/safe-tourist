import { SegmentedButtons } from "react-native-paper"
import { useApp } from "../context/AppContext"

export default function LanguageToggle() {
  const { state, setLanguage } = useApp()
  return (
    <SegmentedButtons
      value={state.language}
      onValueChange={(val: any) => setLanguage(val)}
      buttons={[
        { value: "en", label: "EN" },
        { value: "hi", label: "हिं" },
      ]}
    />
  )
}
