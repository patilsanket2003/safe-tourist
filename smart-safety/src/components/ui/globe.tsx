"use client"

import createGlobe, { COBEOptions } from "cobe"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type ExtendedGlobeConfig = Omit<COBEOptions, "width" | "height"> & {
  width?: number
  height?: number
  onRender?: (state: Record<string, any>) => void
}

export const GLOBE_CONFIG: ExtendedGlobeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: ExtendedGlobeConfig
}) {
  let phi = 0
  let width = 0
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const [r, setR] = useState(0)
  const rRef = useRef(0)

  const updatePointerInteraction = (value: any) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: any) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      const newR = delta / 200
      rRef.current = newR
      setR(newR)
    }
  }

  const onRender = useCallback(
    (state: Record<string, any>) => {
      if (!pointerInteracting.current) phi += 0.005
      state.phi = phi + (rRef.current || r)
      const currentWidth = width || (canvasRef.current ? canvasRef.current.offsetWidth : 400)
      state.width = currentWidth * 2
      state.height = currentWidth * 2
      if (typeof config.onRender === "function") {
        config.onRender(state)
      }
    },
    [r, config],
  )

  const onResize = () => {
    if (canvasRef.current) {
      width = canvasRef.current.offsetWidth
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return

    window.addEventListener("resize", onResize)
    onResize()

    const initialWidth = width || canvasRef.current.offsetWidth || 500

    const { onRender: _ignore, ...cobeOptions } = config
    const opts: COBEOptions = {
      ...(cobeOptions as any),
      width: initialWidth * 2,
      height: initialWidth * 2,
    }

    let globe: any
    let animId: number
    try {
      globe = createGlobe(canvasRef.current, opts)

      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1"
      }

      // Smooth render loop for rotation and interaction
      const render = () => {
        const state: Record<string, any> = {
          phi: 0,
          width: 0,
          height: 0,
        }
        onRender(state)
        if (globe && typeof globe.update === "function") {
          globe.update({
            phi: state.phi,
            width: state.width,
            height: state.height,
          })
        }
        animId = requestAnimationFrame(render)
      }
      animId = requestAnimationFrame(render)
    } catch (e) {
      console.warn("Failed to create globe:", e)
    }

    return () => {
      window.removeEventListener("resize", onResize)
      if (animId) cancelAnimationFrame(animId)
      if (globe && typeof globe.destroy === "function") {
        globe.destroy()
      }
    }
  }, [config, onRender])

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className,
      )}
      style={{
        position: "absolute",
        inset: 0,
        margin: "0 auto",
        aspectRatio: "1 / 1",
        width: "100%",
        maxWidth: 600,
        pointerEvents: "auto",
      }}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
        )}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: "opacity 0.5s ease",
          contain: "layout paint size",
          cursor: "grab",
        }}
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(
            e.clientX - pointerInteractionMovement.current,
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches && e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}
export default Globe
