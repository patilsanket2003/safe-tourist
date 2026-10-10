import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { useAppTheme } from "../context/ThemeContext";
import createGlobe, { COBEOptions } from "cobe";

const MARKERS = [
  { location: [14.5995, 120.9842] as [number, number], size: 0.04 }, // Manila
  { location: [19.076, 72.8777] as [number, number], size: 0.09 }, // Mumbai
  { location: [28.6139, 77.209] as [number, number], size: 0.08 }, // Delhi
  { location: [23.8103, 90.4125] as [number, number], size: 0.05 }, // Dhaka
  { location: [30.0444, 31.2357] as [number, number], size: 0.07 }, // Cairo
  { location: [39.9042, 116.4074] as [number, number], size: 0.08 }, // Beijing
  { location: [-23.5505, -46.6333] as [number, number], size: 0.09 }, // São Paulo
  { location: [19.4326, -99.1332] as [number, number], size: 0.08 }, // Mexico City
  { location: [40.7128, -74.006] as [number, number], size: 0.09 }, // New York
  { location: [51.5074, -0.1278] as [number, number], size: 0.07 }, // London
  { location: [35.6762, 139.6503] as [number, number], size: 0.06 }, // Tokyo
  { location: [41.0082, 28.9784] as [number, number], size: 0.06 }, // Istanbul
  { location: [1.3521, 103.8198] as [number, number], size: 0.05 }, // Singapore
];

export default function InteractiveAuthBackground() {
  const { isDark } = useAppTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [rotationOffset, setRotationOffset] = useState(0);
  const rotationOffsetRef = useRef(0);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      const newR = delta / 180;
      rotationOffsetRef.current = newR;
      setRotationOffset(newR);
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;

    let phi = 0;
    let width = 0;
    let animId: number = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth || Math.min(window.innerWidth, 800);
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    const canvasWidth = width || canvasRef.current.offsetWidth || Math.min(window.innerWidth, 800);

    const globeConfig: COBEOptions = {
      width: canvasWidth * 2,
      height: canvasWidth * 2,
      devicePixelRatio: 2,
      phi: 0,
      theta: 0.25,
      dark: isDark ? 1 : 0,
      diffuse: isDark ? 1.5 : 0.45,
      mapSamples: 16000,
      mapBrightness: isDark ? 3.5 : 1.25,
      baseColor: isDark ? [0.14, 0.14, 0.16] : [0.94, 0.94, 0.96],
      markerColor: [0.98, 0.42, 0.09], // Vibrant industrial orange #F97316
      glowColor: isDark ? [0.98, 0.42, 0.09] : [0.98, 0.55, 0.2],
      markers: MARKERS,
    };

    let globe: any;
    try {
      globe = createGlobe(canvasRef.current, globeConfig);
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }

      // 60FPS fluid rotation and interactive feedback loop
      const renderLoop = () => {
        if (!pointerInteracting.current) {
          phi += 0.004;
        }
        const curWidth = width || (canvasRef.current ? canvasRef.current.offsetWidth : canvasWidth);
        if (globe && typeof globe.update === "function") {
          globe.update({
            phi: phi + rotationOffsetRef.current,
            width: curWidth * 2,
            height: curWidth * 2,
          });
        }
        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);
    } catch (err) {
      console.warn("Failed to initialize cobe globe:", err);
    }

    // Global pointer listeners so dragging anywhere on background rotates the globe
    const onWindowPointerUp = () => {
      updatePointerInteraction(null);
    };

    const onWindowMouseMove = (e: MouseEvent) => {
      if (pointerInteracting.current !== null) {
        updateMovement(e.clientX);
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (pointerInteracting.current !== null && e.touches[0]) {
        updateMovement(e.touches[0].clientX);
      }
    };

    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    window.addEventListener("mousemove", onWindowMouseMove, { passive: true });
    window.addEventListener("touchmove", onWindowTouchMove, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("touchmove", onWindowTouchMove);
      if (animId) cancelAnimationFrame(animId);
      if (globe && typeof globe.destroy === "function") {
        globe.destroy();
      }
    };
  }, [isDark]);

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.container,
          {
            backgroundColor: isDark ? "#0A0A0A" : "#F4F4F5",
          },
        ]}
      >
        {/* Subtle Tech Grid Lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: isDark
              ? "linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)"
              : "linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 85%)",
          }}
        />

        {/* Radial ambient glow backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: isDark
              ? "radial-gradient(circle at 50% 45%, rgba(249, 115, 22, 0.09) 0%, rgba(10, 10, 10, 0.96) 75%)"
              : "radial-gradient(circle at 50% 45%, rgba(249, 115, 22, 0.12) 0%, rgba(244, 244, 245, 0.9) 75%)",
          }}
        />

        {/* Brand Text Watermark in Background */}
        <div
          style={{
            position: "absolute",
            top: "6%",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <span
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: isDark
                ? "linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(249, 115, 22, 0.12) 60%, rgba(10, 10, 10, 0.02) 100%)"
                : "linear-gradient(180deg, rgba(15, 23, 42, 0.20) 0%, rgba(249, 115, 22, 0.10) 60%, rgba(255, 255, 255, 0.02) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: isDark ? "drop-shadow(0 2px 20px rgba(249, 115, 22, 0.08))" : "none",
              userSelect: "none",
            }}
          >
            URBAN SHIELD
          </span>
        </div>

        {/* Dynamic Canvas Container with Interactive Globe & Animated Walking Pedestrian */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(95vw, 650px)",
            aspectRatio: "1 / 1",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 0,
          }}
          onPointerDown={(e) =>
            updatePointerInteraction(
              e.clientX - pointerInteractionMovement.current
            )
          }
        >
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              opacity: 0,
              transition: "opacity 0.6s ease-out",
              contain: "layout paint size",
              cursor: "grab",
            }}
            onPointerDown={(e) =>
              updatePointerInteraction(
                e.clientX - pointerInteractionMovement.current
              )
            }
          />
          
          {/* Animated Walking Traveler with Mobile Phone Overlay */}
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              width: "100%",
              height: "160px",
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 800 160"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <linearGradient id="walkGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F97316" stopOpacity="0" />
                  <stop offset="50%" stopColor="#F97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                </linearGradient>
                <filter id="phoneLight" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Path line */}
              <path
                d="M 50 130 Q 400 120 750 130"
                stroke="rgba(249, 115, 22, 0.25)"
                strokeWidth="2"
                strokeDasharray="4 4"
                fill="none"
              />

              {/* Animated Walking Figure with Mobile Phone */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="-60 0"
                  to="820 0"
                  dur="14s"
                  repeatCount="indefinite"
                />

                {/* Pedestrian Shadow */}
                <ellipse cx="30" cy="132" rx="14" ry="4" fill="rgba(0,0,0,0.4)">
                  <animate
                    attributeName="rx"
                    values="12;16;12"
                    dur="0.6s"
                    repeatCount="indefinite"
                  />
                </ellipse>

                {/* Walking Human Silhouette */}
                <g fill={isDark ? "#E2E8F0" : "#0F172A"} stroke={isDark ? "#E2E8F0" : "#0F172A"}>
                  {/* Head */}
                  <circle cx="30" cy="74" r="6" />

                  {/* Body / Torso */}
                  <path d="M 30 80 L 30 102" strokeWidth="4" strokeLinecap="round" />

                  {/* Left Leg (Walking swing) */}
                  <path d="M 30 102 L 23 118 L 19 130" strokeWidth="3.5" strokeLinecap="round">
                    <animate
                      attributeName="d"
                      values="M 30 102 L 23 118 L 19 130; M 30 102 L 35 116 L 39 130; M 30 102 L 23 118 L 19 130"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Right Leg (Walking swing opposite) */}
                  <path d="M 30 102 L 37 118 L 41 130" strokeWidth="3.5" strokeLinecap="round">
                    <animate
                      attributeName="d"
                      values="M 30 102 L 37 118 L 41 130; M 30 102 L 22 116 L 17 130; M 30 102 L 37 118 L 41 130"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Left Arm (Holding Mobile Phone up) */}
                  <path d="M 30 84 L 38 92 L 40 88" strokeWidth="3" strokeLinecap="round" stroke="#F97316" />

                  {/* Right Arm (Natural Walking swing) */}
                  <path d="M 30 84 L 20 95" strokeWidth="3" strokeLinecap="round">
                    <animate
                      attributeName="d"
                      values="M 30 84 L 20 95; M 30 84 L 26 97; M 30 84 L 20 95"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Smartphone Device in hand */}
                  <rect
                    x="39"
                    y="83"
                    width="4"
                    height="8"
                    rx="1"
                    fill="#F97316"
                    stroke="#F97316"
                    filter="url(#phoneLight)"
                  />
                  {/* Phone Screen Glow Rays */}
                  <polygon points="43,85 58,80 58,92" fill="url(#walkGlow)" />
                </g>
              </g>
            </svg>
          </div>

          {/* DRAG TO SPIN Tech Monospace Tag */}
          <div
            style={{
              position: "absolute",
              bottom: "4%",
              fontFamily: "monospace, monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.4)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            ● DRAG TO SPIN &bull; ACTIVE PEDESTRIAN SHIELD
          </div>
        </div>

        {/* Bottom subtle radial vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: isDark
              ? "radial-gradient(circle at 50% 100%, rgba(10, 10, 10, 0.6) 0%, transparent 70%)"
              : "radial-gradient(circle at 50% 100%, rgba(226, 232, 240, 0.6) 0%, transparent 70%)",
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: isDark ? "#0A0A0A" : "#F4F4F5" },
      ]}
    >
      <Text
        style={[
          styles.nativeBrandText,
          { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)" },
        ]}
      >
        URBAN SHIELD
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  nativeBrandText: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
});
