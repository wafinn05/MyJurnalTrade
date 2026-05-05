import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/stats?month=5&year=2026
 * Mengambil statistik lengkap untuk dashboard
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || now.getMonth() + 1);
    const year = parseInt(searchParams.get("year") || now.getFullYear());

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 1));

    const trades = await prisma.tradeLog.findMany({
      where: { date: { gte: startOfMonth, lt: endOfMonth } },
      orderBy: { date: "asc" },
    });

    const capital = await prisma.capital.findUnique({
      where: { month_year: { month, year } },
    });

    const netPnl = trades.reduce((sum, t) => sum + t.amount, 0);
    const pajak = netPnl > 0 ? netPnl * 0.1 : 0;

    const dailyPnl = {};
    trades.forEach((t) => {
      const dateKey = t.date.toISOString().split("T")[0];
      if (!dailyPnl[dateKey]) dailyPnl[dateKey] = { total: 0, trades: [] };
      dailyPnl[dateKey].total += t.amount;
      dailyPnl[dateKey].trades.push(t);
    });

    const tradingDays = Object.keys(dailyPnl).length;
    const winDays = Object.values(dailyPnl).filter((d) => d.total > 0).length;
    const lossDays = Object.values(dailyPnl).filter((d) => d.total < 0).length;
    const breakEvenDays = Object.values(dailyPnl).filter((d) => d.total === 0).length;
    const winrate = tradingDays > 0 ? (winDays / tradingDays) * 100 : 0;

    const capitalAmount = capital?.amount || 0;
    const growth = capitalAmount > 0 ? (netPnl / capitalAmount) * 100 : 0;

    const dailyTotals = Object.values(dailyPnl).map((d) => d.total);
    const maxProfit = dailyTotals.length > 0 ? Math.max(...dailyTotals) : 0;
    const maxLoss = dailyTotals.length > 0 ? Math.min(...dailyTotals) : 0;
    const avgDailyPnl = tradingDays > 0 ? netPnl / tradingDays : 0;

    const sortedDates = Object.keys(dailyPnl).sort();
    let runningTotal = 0;
    const chartData = sortedDates.map((dateKey) => {
      runningTotal += dailyPnl[dateKey].total;
      return { date: dateKey, dailyPnl: dailyPnl[dateKey].total, cumulativePnl: runningTotal };
    });

    return NextResponse.json({
      capital: capitalAmount, netPnl, pajak, tradingDays,
      winDays, lossDays, breakEvenDays, winrate, growth,
      maxProfit, maxLoss, avgDailyPnl, chartData, month, year,
    });
  } catch (error) {
    console.error("GET /api/stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
