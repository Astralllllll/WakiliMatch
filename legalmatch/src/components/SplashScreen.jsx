import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

const NAVY = "#0F2744";
const BG = "#F8FAFC";
const TEXT_MUTED = "#64748B";

const DISPLAY_MS = 2000;
const FADE_MS = 400;

export default function SplashScreen({ onFinish }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS);
    const finishTimer = setTimeout(() => onFinish?.(), DISPLAY_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <img
        src={logo}
        alt="WakiliMatch"
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "44px",
          objectFit: "cover",
          boxShadow: "0 12px 36px rgba(15, 39, 68, 0.18)",
        }}
      />
      <p style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: NAVY, letterSpacing: ".01em" }}>
        WakiliMatch
      </p>
      <p style={{ margin: 0, fontSize: "12px", color: TEXT_MUTED }}>
        Connecting clients with the right lawyer
      </p>
    </div>
  );
}
