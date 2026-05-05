"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function formatShortIDR(value) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return String(value);
}

export default function PnLChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.5 }}
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
          Belum ada data grafik untuk bulan ini
        </p>
      </div>
    );
  }

  const labels = data.map((d) => {
    const date = new Date(d.date + "T00:00:00Z");
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  });

  const dailyPnl = data.map((d) => Number(d.dailyPnl) || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: "PnL Harian",
        data: dailyPnl,
        backgroundColor: dailyPnl.map((v) =>
          v >= 0 ? "rgba(34, 197, 94, 0.55)" : "rgba(239, 68, 68, 0.55)"
        ),
        borderColor: dailyPnl.map((v) =>
          v >= 0 ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)"
        ),
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
        barPercentage: 0.65,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: "#94a3b8",
          font: { size: 11 },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 22, 41, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            const formatted = new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(value);
            return ` PnL Harian: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.03)" },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          maxRotation: 0,
        },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.03)" },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          callback: (value) => formatShortIDR(value),
        },
        border: { display: false },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
