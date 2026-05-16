"use client";

interface ProgressBarProps {
  value: number; // 0–100
}

export default function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="w-full h-1 bg-indigo-100">
      <div
        className="h-full bg-indigo-500 transition-all duration-700 ease-out"
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
  );
}
