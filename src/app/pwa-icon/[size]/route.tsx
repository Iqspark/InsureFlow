import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const sizeNum = Math.min(Math.max(parseInt(size) || 192, 16), 1024);
  const fontSize = Math.round(sizeNum * 0.28);
  const subFontSize = Math.round(sizeNum * 0.1);
  const radius = Math.round(sizeNum * 0.18);

  return new ImageResponse(
    (
      <div
        style={{
          width: sizeNum,
          height: sizeNum,
          background: "#4f46e5",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          gap: Math.round(sizeNum * 0.02),
        }}
      >
        <span
          style={{
            color: "white",
            fontSize,
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
            color: "rgba(255,255,255,0.65)",
            fontSize: subFontSize,
            fontWeight: 400,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Portal
        </span>
      </div>
    ),
    { width: sizeNum, height: sizeNum }
  );
}
