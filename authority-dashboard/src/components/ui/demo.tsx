import React from "react"
import RotatingEarth from "@/components/ui/wireframe-dotted-globe"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

export default function DemoOne() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-8 p-4">
      <RotatingEarth />
      <LiquidButton size="xl">
        Liquid Glass
      </LiquidButton>
    </div>
  )
}
