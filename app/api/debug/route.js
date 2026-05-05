import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 500 });
    }
    
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    
    return NextResponse.json({ webhookInfo: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
