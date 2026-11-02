"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type Plugin,
} from "chart.js";
import { fmtPrice, fmtUsd } from "@/lib/util";

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip);

type Props = {
  line: number[];
  first: number;
  end: number;
  accent: string;
  priceUsd: number;
  height?: number;
};

/** Draws the dashed graduation boundary at the right edge of the plot. */
const graduationMarker: Plugin<"line"> = {
  id: "graduationMarker",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const x = scales.x?.getPixelForValue(800);
    if (x == null || !chartArea) return;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "#1d472f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1d472f";
    ctx.font = "700 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "right";
    ctx.fillText("GRADUATION", x - 5, chartArea.top + 9);
    ctx.restore();
  },
};

/**
 * Bonding-curve preview rendered with Chart.js.
 * Created once, updated in place when the target changes, destroyed on unmount.
 */
export function BondingCurveChart({ line, first, end, accent, priceUsd, height = 190 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const latest = useRef({ line, first, end, accent, priceUsd });
  latest.current = { line, first, end, accent, priceUsd };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const points = () =>
      latest.current.line.map((v, i) => ({ x: (i / Math.max(latest.current.line.length - 1, 1)) * 800, y: v }));

    const chart = new Chart<"line">(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Price (HYPE)",
            data: points(),
            parsing: false,
            borderColor: latest.current.accent,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            backgroundColor: (ctx) => {
              const { chart } = ctx;
              const area = chart.chartArea;
              if (!area) return "transparent";
              const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, `${latest.current.accent}55`);
              g.addColorStop(1, `${latest.current.accent}00`);
              return g;
            },
            pointRadius: (ctx) => (ctx.dataIndex === 0 || ctx.dataIndex === ctx.dataset.data.length - 1 ? 3.5 : 0),
            pointHoverRadius: 4,
            pointBackgroundColor: (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? "#1d472f" : "#ffffff"),
            pointBorderColor: (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? "#1d472f" : latest.current.accent),
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 550, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        layout: { padding: { top: 6, right: 4 } },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: 800,
            grid: { color: "#eef2e8" },
            border: { display: false },
            ticks: {
              color: "#73866b",
              font: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 9 },
              maxTicksLimit: 5,
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              callback: (v) => `${v}M`,
            },
          },
          y: {
            type: "linear",
            grid: { color: "#e6eddf" },
            border: { display: false, dash: [3, 4] },
            ticks: {
              color: "#73866b",
              font: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 9 },
              maxTicksLimit: 4,
              callback: (v) => fmtPrice(Number(v)),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#183225",
            titleColor: "#eaf3e4",
            bodyColor: "#eaf3e4",
            titleFont: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 10 },
            bodyFont: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 10 },
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            callbacks: {
              title: (items) => `${Math.round(Number(items[0]?.parsed.x ?? 0))}M tokens sold`,
              label: (item) => {
                const y = Number(item.parsed.y ?? 0);
                return `${fmtPrice(y)} HYPE · ${fmtUsd(y * latest.current.priceUsd)}`;
              },
            },
          },
        },
      },
      plugins: [graduationMarker],
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets[0].data = line.map((v, i) => ({ x: (i / Math.max(line.length - 1, 1)) * 800, y: v }));
    chart.data.datasets[0].borderColor = accent;
    chart.update();
  }, [line, first, end, accent, priceUsd]);

  return (
    <div className="ls-chart-canvas" style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label={`Bonding curve from ${fmtPrice(first)} to ${fmtPrice(end)} HYPE at graduation`} />
    </div>
  );
}
