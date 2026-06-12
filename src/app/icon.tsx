import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "14px",
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          IF
        </span>
      </div>
    ),
    size
  );
}
