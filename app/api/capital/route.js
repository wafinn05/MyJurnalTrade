import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/capital?month=5&year=2026
 * Mengambil data modal untuk bulan & tahun tertentu
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || now.getMonth() + 1);
    const year = parseInt(searchParams.get("year") || now.getFullYear());

    const capital = await prisma.capital.findUnique({
      where: {
        month_year: { month, year },
      },
    });

    return NextResponse.json({ capital });
  } catch (error) {
    console.error("GET /api/capital Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/capital
 * Menyimpan atau mengupdate modal untuk bulan & tahun tertentu
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, month, year } = body;

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { error: "Amount modal harus berupa angka" },
        { status: 400 }
      );
    }

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const capital = await prisma.capital.upsert({
      where: {
        month_year: { month: targetMonth, year: targetYear },
      },
      update: { amount: parseFloat(amount) },
      create: {
        amount: parseFloat(amount),
        month: targetMonth,
        year: targetYear,
      },
    });

    return NextResponse.json({ capital }, { status: 201 });
  } catch (error) {
    console.error("POST /api/capital Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
