"use client";

import { useState, useEffect, useCallback, Component } from "react";
import dynamic from "next/dynamic";

const PnLChart = dynamic(() => import("./components/PnLChart"), {
  ssr: false,
  loading: () => <div style={{ color: "#64748b", padding: "20px", textAlign: "center" }}>Memuat grafik...</div>,
});

// ===== Error Boundary =====
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "#ef4444", background: "#1e293b", borderRadius: "8px" }}>
          <strong>Komponen gagal dimuat.</strong>
          <pre style={{ fontSize: "11px", marginTop: "8px", color: "#94a3b8" }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ===== SVG Icon Components =====
const Icons = {
  chart: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  wallet: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  ),
  trendUp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  ),
  trendDown: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
  ),
  percent: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
  ),
  target: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  calendar: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  growth: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  ),
  building: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="10" y2="6"/><line x1="14" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/></svg>
  ),
  history: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  inbox: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
  ),
  dollarSign: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
};

function formatIDR(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ===== Toast Component =====
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}



// ===== Stat Card =====
function StatCard({ label, value, icon, iconClass, valueClass, sub, cardClass }) {
  return (
    <div className={`stat-card ${cardClass || "neutral"} animate-in`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${iconClass || "blue"}`}>{icon}</div>
      </div>
      <div className={`stat-card-value ${valueClass || ""}`}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

// ===== Trade History =====
function TradeHistory({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{Icons.inbox}</div>
        <p className="empty-state-text">
          Belum ada data trading bulan ini. Kirim angka ke Bot Telegram untuk mulai mencatat.
        </p>
      </div>
    );
  }

  return (
    <ul className="trade-list">
      {trades.map((trade) => {
        const isProfit = trade.amount >= 0;
        const date = new Date(trade.date);
        return (
          <li key={trade.id} className="trade-item">
            <div className="trade-item-left">
              <div className={`trade-indicator ${isProfit ? "profit" : "loss"}`}></div>
              <div>
                <div className="trade-date">
                  {date.toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="trade-time">
                  {date.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {trade.note && <div className="trade-note">{trade.note}</div>}
              </div>
            </div>
            <div className="trade-item-right">
              <span className="trade-source">{trade.source}</span>
              <span className={`trade-amount ${isProfit ? "profit" : "loss"}`}>
                {isProfit ? "+" : ""}
                {formatIDR(trade.amount)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ===== MAIN DASHBOARD =====
export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [capital, setCapital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tradesRes, capitalRes] = await Promise.all([
        fetch(`/api/stats?month=${month}&year=${year}`),
        fetch(`/api/trades?month=${month}&year=${year}`),
        fetch(`/api/capital?month=${month}&year=${year}`),
      ]);

      const statsData = await statsRes.json();
      const tradesData = await tradesRes.json();
      const capitalData = await capitalRes.json();

      setStats(statsData);
      setTrades(tradesData.trades || []);
      setCapital(capitalData.capital);
    } catch (error) {
      console.error("Fetch Error:", error);
      addToast("Gagal memuat data", "error");
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);



  if (loading && !stats) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  const netPnl = stats?.netPnl || 0;
  const isProfit = netPnl >= 0;

  return (
    <div className="app-container">
      <Toast toasts={toasts} />

      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">{Icons.chart}</div>
          <div>
            <h1 className="header-title">Trading Dashboard</h1>
            <p className="header-subtitle">Jurnal Trading Harian</p>
          </div>
        </div>
        <div className="header-controls">
          <div className="month-selector">
            <span className="month-selector-icon">{Icons.calendar}</span>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ===== STAT CARDS ===== */}
      <div className="stats-grid">
        <StatCard
          label="Modal"
          value={capital ? formatIDR(capital.amount) : "Belum Diset"}
          icon={Icons.wallet}
          iconClass="blue"
          cardClass="neutral"
          sub={`${monthNames[month - 1]} ${year}`}
        />
        <StatCard
          label="Net PnL"
          value={formatIDR(netPnl)}
          icon={isProfit ? Icons.trendUp : Icons.trendDown}
          iconClass={isProfit ? "green" : "red"}
          valueClass={isProfit ? "profit" : "loss"}
          cardClass={isProfit ? "profit" : "loss"}
          sub={`Setelah pajak: ${formatIDR(netPnl - (stats?.pajak || 0))}`}
        />
        <StatCard
          label="Pajak (10%)"
          value={formatIDR(stats?.pajak || 0)}
          icon={Icons.building}
          iconClass="amber"
          cardClass="amber"
          sub="Dari total profit"
        />
        <StatCard
          label="Winrate Harian"
          value={`${(Number(stats?.winrate) || 0).toFixed(1)}%`}
          icon={Icons.target}
          iconClass="green"
          cardClass="profit"
          sub={`${stats?.winDays || 0}W / ${stats?.lossDays || 0}L`}
        />
        <StatCard
          label="Hari Trading"
          value={stats?.tradingDays || 0}
          icon={Icons.calendar}
          iconClass="purple"
          cardClass="purple"
          sub="Hari aktif bulan ini"
        />
        <StatCard
          label="Pertumbuhan Modal"
          value={`${(Number(stats?.growth) || 0).toFixed(2)}%`}
          icon={Icons.growth}
          iconClass={Number(stats?.growth) >= 0 ? "cyan" : "red"}
          valueClass={Number(stats?.growth) >= 0 ? "profit" : "loss"}
          cardClass={Number(stats?.growth) >= 0 ? "cyan" : "loss"}
          sub={`Rata-rata harian: ${formatIDR(Number(stats?.avgDailyPnl) || 0)}`}
        />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-grid">
        {/* Chart */}
        <div className="card animate-in">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">{Icons.chart}</span>
              Grafik PnL Harian
            </h2>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ErrorBoundary>
                <PnLChart data={stats?.chartData || []} />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Trade History */}
        <div className="card animate-in">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">{Icons.history}</span>
              Riwayat Trading
            </h2>
            <span className="card-badge">
              {trades.length} entri
            </span>
          </div>
          <TradeHistory trades={trades} />
        </div>
      </div>
    </div>
  );
}
