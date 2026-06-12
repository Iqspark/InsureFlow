import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4f46e5",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
          gap: "4px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "60px",
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          IF
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "18px",
            fontWeight: 400,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0px",
          }}
        >
          Portal
        </span>
      </div>
    ),
    size
  );
}
