"use client";

import * as React from "react";

/**
 * A tiny inline SVG sparkline for KPI cards. Renders a smooth line from
 * an array of numbers. Color adapts to the trend direction (up=emerald,
 * down=rose, flat=muted).
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) {
    return <span className={className} style={{ width, height, display: "inline-block" }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  // Smooth path via simple line segments
  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Area fill path
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Determine trend color
  const trend = data[data.length - 1] >= data[0] ? "up" : "down";
  const strokeColor = color ?? (trend === "up" ? "var(--emerald-foreground)" : "var(--rose-foreground)");
  const fillColor = color ?? (trend === "up" ? "var(--emerald-foreground)" : "var(--rose-foreground)");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <path d={areaD} fill={fillColor} opacity={0.12} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.5}
        fill={strokeColor}
      />
    </svg>
  );
}
