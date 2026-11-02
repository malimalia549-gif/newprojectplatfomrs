"use client";

import { useEffect, useRef } from "react";
import { ArcElement, Chart, DoughnutController, Tooltip, type Plugin } from "chart.js";
import { fmtUsd } from "@/lib/util";

Chart.register(DoughnutController, ArcElement, Tooltip);

export type DonutSegment = { label: string; value: number; color: string };

type Props = {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  height?: number;
  money?: boolean;
};

/** Doughnut with a live center readout; legend rendered as readable HTML rows. */
export function DonutChart({ segments, centerLabel, centerValue, height = 168, money = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);
  const latest = useRef({ segments, centerLabel, centerValue });
  latest.current = { segments, centerLabel, centerValue };

  const centerText: Plugin<"doughnut"> = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#7f9276";
      ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(latest.current.centerLabel.toUpperCase(), x, y - 8);
      ctx.fillStyle = "#183225";
      ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(latest.current.centerValue, x, y + 10);
      ctx.restore();
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = new Chart<"doughnut">(canvas, {
      type: "doughnut",
      data: {
        labels: latest.current.segments.map((s) => s.label),
        datasets: [
          {
            data: latest.current.segments.map((s) => s.value),
            backgroundColor: latest.current.segments.map((s) => s.color),
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        animation: reduce ? false : { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#183225",
            titleColor: "#eaf3e4",
            bodyColor: "#eaf3e4",
            padding: 10,
            cornerRadius: 6,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            callbacks: {
              label: (item) => {
                const total = (item.dataset.data as number[]).reduce((a, b) => a + b, 0) || 1;
                const v = Number(item.parsed);
                return ` ${money ? fmtUsd(v) : v.toLocaleString()} · ${((v / total) * 100).toFixed(1)}%`;
              },
            },
          },
        },
      },
      plugins: [centerText],
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = segments.map((s) => s.label);
    chart.data.datasets[0].data = segments.map((s) => s.value);
    chart.data.datasets[0].backgroundColor = segments.map((s) => s.color);
    chart.update();
  }, [segments, centerLabel, centerValue]);

  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <div className="donut-wrap">
      <div className="donut-canvas" style={{ height }}>
        <canvas ref={canvasRef} role="img" aria-label={`${centerLabel}: ${centerValue}`} />
      </div>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <b className="font-mono">{money ? fmtUsd(s.value) : s.value.toLocaleString()}</b>
            <em className="font-mono">{((s.value / total) * 100).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
