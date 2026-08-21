import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const chatIdsFilePath = path.join(process.cwd(), "chat_ids.json");

function saveChatIds(ids) {
  try {
    fs.writeFileSync(chatIdsFilePath, JSON.stringify(ids, null, 2), "utf8");
  } catch (e) {
    console.error("Could not write chat_ids.json (normal on Vercel):", e.message);
  }
}

// In-memory fallback list for serverless container hot starts
if (!global.vercelChatIds) {
  global.vercelChatIds = [];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0";
    const defaultChatId = process.env.TELEGRAM_CHAT_ID || "-1004366083322";

    // CASE 1: Incoming Telegram Webhook Update (e.g., user clicked /start)
    if (body.update_id && body.message && body.message.chat) {
      const chat = body.message.chat;
      const text = body.message.text ? body.message.text.trim() : "";
      const chatId = chat.id;

      if (text.startsWith("/start")) {
        let chatIds = [];
        try {
          if (fs.existsSync(chatIdsFilePath)) {
            chatIds = JSON.parse(fs.readFileSync(chatIdsFilePath, "utf8"));
          }
        } catch (e) {}

        if (!chatIds.includes(chatId)) {
          chatIds.push(chatId);
          saveChatIds(chatIds);
        }
        if (!global.vercelChatIds.includes(chatId)) {
          global.vercelChatIds.push(chatId);
        }

        // Send success notification to user
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔌 <b>¡Monitoreo Nelson Márquez Activado!</b>\n\nHola <b>${chat.first_name || "Usuario"}</b>, has iniciado tu conexión al bot de la Planta Nelson Márquez.\n\nRecibirás las notificaciones de corte de luz y nivel de batería directamente en este chat privado.`,
            parse_mode: "HTML"
          })
        });

        return NextResponse.json({ success: true, message: "Chat ID registered" });
      }

      return NextResponse.json({ success: true });
    }

    // CASE 2: Proxy message send request (original behavior)
    const { message, botToken: bodyToken, chatId: bodyChatId } = body;
    const activeToken = bodyToken || botToken;
    const activeChatId = bodyChatId || defaultChatId;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Falta el cuerpo del mensaje." },
        { status: 400 }
      );
    }

    const tgUrl = `https://api.telegram.org/bot${activeToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: activeChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tgRes.json();

    if (tgRes.ok && tgData.ok) {
      return NextResponse.json({ success: true, data: tgData.result });
    } else {
      return NextResponse.json(
        { success: false, error: tgData.description || "Error al enviar mensaje a Telegram." },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Error en el servidor proxy: " + err.message },
      { status: 500 }
    );
  }
}
