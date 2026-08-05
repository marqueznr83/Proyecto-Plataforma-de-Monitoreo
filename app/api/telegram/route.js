import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, botToken: bodyToken, chatId: bodyChatId } = body;

    // Fall back to environment variables or hardcoded user credentials if not supplied in request body
    const botToken = bodyToken || process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0";
    const chatId = bodyChatId || process.env.TELEGRAM_CHAT_ID || "-1004366083322";

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Falta el cuerpo del mensaje." },
        { status: 400 }
      );
    }

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: "Configuración incompleta de Telegram (Falta Token o Chat ID)." },
        { status: 400 }
      );
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
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
