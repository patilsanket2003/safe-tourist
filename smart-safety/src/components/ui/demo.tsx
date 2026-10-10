import React from "react"
import { Globe } from "@/components/ui/globe"

export function GlobeDemo() {
  return (
    <div
      className="relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg border bg-background px-40 pb-40 pt-8 md:pb-60 md:shadow-xl"
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        maxWidth: 512,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 16,
        padding: "32px 16px 160px",
      }}
    >
      <span
        className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10"
        style={{
          pointerEvents: "none",
          whiteSpace: "pre-wrap",
          textAlign: "center",
          fontSize: "4rem",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          background: "linear-gradient(180deg, #38bdf8 0%, rgba(148, 163, 184, 0.4) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        UrbanShield
      </span>
      <Globe className="top-28" />
      <div
        className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]"
        style={{
          position: "absolute",
          inset: 0,
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

export default GlobeDemo
