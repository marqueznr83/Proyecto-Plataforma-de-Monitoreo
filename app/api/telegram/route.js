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

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

async function getKvChatIds() {
  if (!kvUrl || !kvToken) return [];
  try {
    const res = await fetch(`${kvUrl}/get/chat_ids`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const json = await res.json();
    if (json && json.result) {
      return typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    }
  } catch (e) {
    console.error("KV read error:", e.message);
  }
  return [];
}

async function saveKvChatIds(ids) {
  if (!kvUrl || !kvToken) return;
  try {
    await fetch(`${kvUrl}/set/chat_ids`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
      body: JSON.stringify(ids)
    });
  } catch (e) {
    console.error("KV write error:", e.message);
  }
}

// In-memory fallback list for serverless container hot starts
if (!global.vercelChatIds) {
  global.vercelChatIds = [];
}

// GET: Bot diagnostics & Webhook status check
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const botToken = (searchParams.get("token") || process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0").trim();

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();

    const whRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const whData = await whRes.json();

    let localChatIds = [];
    try {
      if (fs.existsSync(chatIdsFilePath)) {
        localChatIds = JSON.parse(fs.readFileSync(chatIdsFilePath, "utf8"));
      }
    } catch (e) {}

    const kvChatIds = await getKvChatIds();

    return NextResponse.json({
      success: meData.ok,
      bot: meData.result || null,
      webhook: whData.result || null,
      registeredChatIds: {
        env: process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(/[,\s]+/) : [],
        localFile: localChatIds,
        kv: kvChatIds
      }
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Error al conectar con Telegram API: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0").trim();
    const defaultChatId = (process.env.TELEGRAM_CHAT_ID || "8003576551").trim();

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

        // Load existing IDs from Vercel KV
        const kvIds = await getKvChatIds();
        for (const kid of kvIds) {
          const sId = String(kid).trim();
          if (sId && !chatIds.includes(sId)) {
            chatIds.push(sId);
          }
        }

        const sChatId = String(chatId).trim();
        if (sChatId && !chatIds.includes(sChatId)) {
          chatIds.push(sChatId);
          saveChatIds(chatIds);
          await saveKvChatIds(chatIds);
        }
        if (sChatId && !global.vercelChatIds.includes(sChatId)) {
          global.vercelChatIds.push(sChatId);
        }

        // Send success notification to user
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔌 <b>¡Monitoreo Nelson Márquez Activado!</b>\n\nHola <b>${chat.first_name || "Usuario"}</b>, has vinculado exitosamente tu chat al sistema de alertas de la Planta Nelson Márquez.\n\nRecibirás las notificaciones de cortes de red y estado de baterías directamente aquí.`,
            parse_mode: "HTML"
          })
        });

        return NextResponse.json({ success: true, message: "Chat ID registrado exitosamente", chatId: sChatId });
      }

      return NextResponse.json({ success: true });
    }

    // CASE 2: Proxy message send request (e.g., modal test button)
    const { message, botToken: bodyToken, chatId: bodyChatId } = body;
    const activeToken = (bodyToken || botToken).trim();
    const targetChatIds = (bodyChatId || defaultChatId).toString().split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Falta el cuerpo del mensaje." },
        { status: 400 }
      );
    }

    if (targetChatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún Chat ID válido." },
        { status: 400 }
      );
    }

    const results = [];
    let anySuccess = false;

    for (const chatId of targetChatIds) {
      const tgUrl = `https://api.telegram.org/bot${activeToken}/sendMessage`;
      let tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      let tgData = await tgRes.json();

      // Fallback: If Telegram rejected HTML entities, strip tags and send as plain text
      if (!tgRes.ok && tgData?.description && tgData.description.includes("can't parse entities")) {
        console.warn(`[Telegram Proxy] Fallo de parseo HTML para ${chatId}. Reintentando en texto plano...`);
        const plainText = message.replace(/<[^>]+>/g, "");
        tgRes = await fetch(tgUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText
          }),
        });
        tgData = await tgRes.json();
      }

      if (tgRes.ok && tgData.ok) {
        anySuccess = true;
        results.push({ chatId, success: true, messageId: tgData.result.message_id });
      } else {
        results.push({
          chatId,
          success: false,
          errorCode: tgData.error_code || tgRes.status,
          error: tgData.description || "Error desconocido al enviar a Telegram"
        });
      }
    }

    if (anySuccess) {
      return NextResponse.json({ success: true, results });
    } else {
      const firstError = results[0]?.error || "Error al enviar mensaje a Telegram.";
      return NextResponse.json(
        { success: false, error: firstError, details: results },
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
