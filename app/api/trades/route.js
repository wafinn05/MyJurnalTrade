import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/trades?month=5&year=2026
 * Mengambil semua trade log untuk bulan & tahun tertentu
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
      where: {
        date: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("GET /api/trades Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/trades
 * Menambahkan trade log baru dari dashboard
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, note } = body;

    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { error: "Amount harus berupa angka" },
        { status: 400 }
      );
    }

    const trade = await prisma.tradeLog.create({
      data: {
        amount: parseFloat(amount),
        date: new Date(),
        note: note || null,
        source: "dashboard",
      },
    });

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    console.error("POST /api/trades Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/trades?id=xxx
 * Menghapus trade log berdasarkan ID
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID trade diperlukan" },
        { status: 400 }
      );
    }

    await prisma.tradeLog.delete({ where: { id } });

    return NextResponse.json({ message: "Trade berhasil dihapus" });
  } catch (error) {
    console.error("DELETE /api/trades Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
