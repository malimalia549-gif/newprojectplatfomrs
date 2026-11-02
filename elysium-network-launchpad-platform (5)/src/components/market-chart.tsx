"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, Filler, LineController, LineElement, LinearScale, CategoryScale, PointElement, Tooltip, type Plugin } from "chart.js";
import { fmtNum, fmtPrice, fmtUsd } from "@/lib/util";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

type Props = { data: number[]; symbol: string; height?: number };

const crosshair: Plugin<"line"> = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length || !chart.chartArea) return;
    const x = active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "#9bb886";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

function px(v: number) {
  if (!Number.isFinite(v) || v === 0) return "$0.00";
  if (v >= 100) return `$${fmtNum(v, 2)}`;
  if (v >= 1) return `$${fmtNum(v, 4)}`;
  if (v >= 0.001) return `$${v.toFixed(5)}`;
  return `$${fmtPrice(v)}`;
}

/** Live mark-history chart rendered with Chart.js (created once, updated in place, destroyed on unmount). */
export function MarketChart({ data, symbol, height = 216 }: Props) {
  const [range, setRange] = useState<"1m" | "4m" | "all">("all");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  const samples = useMemo(() => {
    if (range === "1m") return data.slice(-24);
    if (range === "4m") return data.slice(-92);
    return data;
  }, [range, data]);

  const latest = useRef(samples);
  latest.current = samples;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = new Chart<"line">(canvas, {
      type: "line",
      data: {
        labels: latest.current.map((_, i) => i),
        datasets: [
          {
            data: latest.current,
            borderColor: "#4f8341",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            backgroundColor: (ctx) => {
              const area = ctx.chart.chartArea;
              if (!area) return "transparent";
              const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, "#6a974433");
              g.addColorStop(1, "#6a974400");
              return g;
            },
            pointRadius: (ctx) => (ctx.dataIndex === ctx.dataset.data.length - 1 ? 3 : 0),
            pointHoverRadius: 4,
            pointBackgroundColor: "#1d472f",
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 400, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        layout: { padding: { top: 6 } },
        scales: {
          x: {
            grid: { color: "#eef2e8" },
            border: { display: false },
            ticks: {
              color: "#73866b",
              maxTicksLimit: 6,
              maxRotation: 0,
              font: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 9 },
              callback: (_v, i) => {
                const n = latest.current.length;
                const secs = Math.round((n - 1 - i) * 2.6);
                return i === n - 1 ? "now" : secs >= 60 ? `${Math.round(secs / 60)}m` : `${secs}s`;
              },
            },
          },
          y: {
            position: "right",
            grid: { color: "#e6eddf" },
            border: { display: false },
            ticks: {
              color: "#73866b",
              maxTicksLimit: 5,
              font: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 9 },
              callback: (v) => px(Number(v)).replace("$", ""),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#183225",
            titleColor: "#eaf3e4",
            bodyColor: "#eaf3e4",
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            titleFont: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 10 },
            bodyFont: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 10 },
            callbacks: {
              title: (items) => `Tick ${(items[0]?.dataIndex ?? 0) + 1} / ${latest.current.length}`,
              label: (item) => `${px(Number(item.parsed.y))} · mark`,
            },
          },
        },
      },
      plugins: [crosshair],
    });
    chartRef.current = chart;
    const raf = requestAnimationFrame(() => chart.resize());
    return () => {
      cancelAnimationFrame(raf);
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = samples.map((_, i) => i);
    chart.data.datasets[0].data = samples;
    chart.update();
  }, [samples]);

  const last = samples[samples.length - 1] ?? 0;
  const first = samples[0] ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <div className="price-chart">
      <div className="chart-legend mb-2">
        <span className="inline-flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#4f8341]" />
          {symbol} · mark history
        </span>
        <div className="chart-controls" role="group" aria-label="Chart range">
          {([["1m", "1m"], ["4m", "4m"], ["all", "All"]] as const).map(([id, label]) => (
            <button type="button" key={id} className="chart-control" data-active={range === id} onClick={() => setRange(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative w-full" style={{ height, position: "relative" }}>
        <canvas ref={canvasRef} role="img" aria-label={`${symbol} price history from ${fmtUsd(first)} to ${fmtUsd(last)}`} />
        {samples.length < 2 ? (
          <div className="absolute inset-0 grid place-items-center bg-[#ffffffcc] text-xs text-[#68755b]">Awaiting market prints</div>
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[#68755c]">
        <span>Live data · sampled at 2.6s intervals</span>
        <span className="font-mono">
          {px(last)} · <span className={change >= 0 ? "text-up" : "text-down"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span> · {samples.length} ticks
        </span>
      </div>
    </div>
  );
}
