import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CHANNEL = "@foxxynime";

async function telegram(token: string, method: string, data: any) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return response.json();
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

  if (!token || !secret || !appUrl) {
    return NextResponse.json(
      { error: "Konfigurasi belum lengkap" },
      { status: 500 }
    );
  }

  if (
    request.headers.get("x-telegram-bot-api-secret-token") !== secret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  const api = (method: string, data: any) =>
    telegram(token, method, data);

  // START COMMAND
  const message = update.message;
  const chatId = message?.chat?.id;
  const messageText = message?.text || "";

  if (
    chatId &&
    /^\/start(?:@\w+)?(?:\s|$)/i.test(messageText)
  ) {
    const startUserId = message?.from?.id;

    if (startUserId) {
      const startMember = await api("getChatMember", {
        chat_id: CHANNEL,
        user_id: startUserId,
      });

      const startIsMember =
        startMember.ok &&
        ["creator", "administrator", "member"].includes(
          startMember.result?.status
        );

      if (!startIsMember) {
        await api("setChatMenuButton", {
          chat_id: chatId,
          menu_button: { type: "commands" },
        });
      }
    }

    await api("sendMessage", {
      chat_id: chatId,
      text:
        "Selamat datang di FoxxyNime! 🍿\n\n" +
        "Sebelum menggunakan Mini App, silakan bergabung ke channel resmi FoxxyNime terlebih dahulu.\n\n" +
        "Setelah bergabung, tekan tombol Verifikasi.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📢 Ikuti Saluran",
              url: "https://t.me/foxxynime",
            },
          ],
          [
            {
              text: "🔐 Verifikasi",
              callback_data: "verify_channel",
            },
          ],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  }

  // VERIFY BUTTON
  const callback = update.callback_query;

  if (callback?.data === "verify_channel") {
    const userId = callback.from?.id;
    const callbackId = callback.id;
    const callbackMessage = callback.message;
    const callbackChatId = callbackMessage?.chat?.id;
    const messageId = callbackMessage?.message_id;

    if (!userId || !callbackChatId || !messageId) {
      return NextResponse.json({ ok: true });
    }

    const memberResult = await api("getChatMember", {
      chat_id: CHANNEL,
      user_id: userId,
    });

    if (!memberResult.ok) {
      await api("answerCallbackQuery", {
        callback_query_id: callbackId,
        text: "Gagal memeriksa channel. Coba lagi nanti.",
        show_alert: true,
      });

      return NextResponse.json({ ok: true });
    }

    const status = memberResult.result?.status;
    const isMember = ["creator", "administrator", "member"].includes(status);

    if (!isMember) {
      await api("setChatMenuButton", {
        chat_id: callbackChatId,
        menu_button: { type: "commands" },
      });

      await api("answerCallbackQuery", {
        callback_query_id: callbackId,
        text: "Kamu belum bergabung ke channel FoxxyNime!",
        show_alert: true,
      });

      await api("editMessageText", {
        chat_id: callbackChatId,
        message_id: messageId,
        text:
          "❌ Verifikasi belum berhasil.\n\n" +
          "Silakan bergabung ke channel resmi FoxxyNime, lalu tekan Verifikasi kembali.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📢 Ikuti Saluran",
                url: "https://t.me/foxxynime",
              },
            ],
            [
              {
                text: "🔐 Verifikasi",
                callback_data: "verify_channel",
              },
            ],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    await api("setChatMenuButton", {
      chat_id: callbackChatId,
      menu_button: {
        type: "web_app",
        text: "FoxxyNime",
        web_app: { url: appUrl },
      },
    });

    await api("answerCallbackQuery", {
      callback_query_id: callbackId,
      text: "Verifikasi berhasil! Selamat datang 🎉",
    });

    await api("editMessageText", {
      chat_id: callbackChatId,
      message_id: messageId,
      text:
        "✅ VERIFIKASI BERHASIL!\n\n" +
        "Kamu sudah menjadi anggota channel resmi FoxxyNime.\n\n" +
        "Sekarang kamu bisa membuka Mini App FoxxyNime. 🍿",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Buka FoxxyNime",
              web_app: { url: appUrl },
            },
          ],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
