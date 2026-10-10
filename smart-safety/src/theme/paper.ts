import { MD3DarkTheme as DefaultTheme } from "react-native-paper"

export const paperTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: "#F97316",
    secondary: "#EA580C",
    surface: "#141414",
    background: "#0A0A0A",
    error: "#EF4444",
  },
}
