import { useState, useEffect } from "react";

export default function RegisterScreen({ navigation, route }: any) {
  // Redirect to BasicInfo screen
  useEffect(() => {
    const role = route?.params?.role;
    navigation.replace("BasicInfo", { role });
  }, [navigation, route]);

  return null;
}

