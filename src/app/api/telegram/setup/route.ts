import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

  if (!token || !secret || !appUrl) {
    return NextResponse.json({ error: "Konfigurasi bot belum lengkap." }, { status: 500 });
  }

  if (request.headers.get("x-setup-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = `https://api.telegram.org/bot${token}`;

  const webhook = await fetch(`${api}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: `${appUrl}/api/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"]
    })
  });

  const webhookResult = await webhook.json();

  if (!webhook.ok || !webhookResult.ok) {
    return NextResponse.json({ step: "setWebhook", result: webhookResult }, { status: 502 });
  }

  const menu = await fetch(`${api}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: { type: "commands" }
    })
  });

  const menuResult = await menu.json();

  return NextResponse.json({
    webhook: webhookResult,
    menuButton: menuResult
  }, { status: menu.ok && menuResult.ok ? 200 : 502 });
}
