import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const chatIdsFilePath = path.join(process.cwd(), "chat_ids.json");
const telemetryFilePath = path.join(process.cwd(), "telemetry_latest.json");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

async function getAllRegisteredChatIds(overrideChatId = null) {
  let ids = [];

  // 1. Explicit override passed
  if (overrideChatId) {
    const overrideList = String(overrideChatId).split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const id of overrideList) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  // 2. Read from environment variable
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envChatId) {
    const envList = envChatId.split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const id of envList) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  // 3. Load from local file
  try {
    if (fs.existsSync(chatIdsFilePath)) {
      const fileIds = JSON.parse(fs.readFileSync(chatIdsFilePath, "utf8"));
      if (Array.isArray(fileIds)) {
        for (const fileId of fileIds) {
          const sId = String(fileId).trim();
          if (sId && !ids.includes(sId)) {
            ids.push(sId);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading chat_ids.json:", e.message);
  }

  // 4. Load from Vercel KV
  const kvChatIds = await getKvChatIds();
  if (Array.isArray(kvChatIds)) {
    for (const kvId of kvChatIds) {
      const sId = String(kvId).trim();
      if (sId && !ids.includes(sId)) {
        ids.push(sId);
      }
    }
  }

  // 5. In-memory hot cache
  if (global.vercelChatIds && Array.isArray(global.vercelChatIds)) {
    for (const id of global.vercelChatIds) {
      const sId = String(id).trim();
      if (sId && !ids.includes(sId)) {
        ids.push(sId);
      }
    }
  }

  if (ids.length === 0) {
    return ["8003576551"];
  }

  return ids;
}

// Retrieve latest telemetry from memory, file, KV, or fallback
async function getLatestTelemetry() {
  // 1. From global in-memory cache
  if (global.lastGrowattTelemetry) {
    return global.lastGrowattTelemetry;
  }

  // 2. From local file if exists
  try {
    if (fs.existsSync(telemetryFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(telemetryFilePath, "utf8"));
      if (fileData) return fileData;
    }
  } catch (e) {}

  // 3. From Vercel KV
  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/get/growatt_telemetry_latest`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const json = await res.json();
      if (json && json.result) {
        return typeof json.result === "string" ? JSON.parse(json.result) : json.result;
      }
    } catch (e) {}
  }

  // 4. Default baseline state if not yet refreshed
  return {
    plantName: "Residencial Sr. Nelson",
    inverterModel: "Growatt Inverter UPS",
    serialNumber: "AOE9CJC058",
    status: "NORMAL",
    isOffline: false,
    vac: 230.0,
    fac: 60.0,
    pac: 0,
    batterySOC: 100,
    batteryVoltage: 53.3,
    houseLoad: 800,
    temperature: 38.5,
    lastUpdated: new Date().toISOString()
  };
}

function formatStatusReport(data) {
  const isOffline = data?.isOffline || false;
  const plantName = escapeHtml(data?.plantName || "Residencial Sr. Nelson");
  const model = escapeHtml(data?.inverterModel || "Growatt Inverter UPS");
  const sn = escapeHtml(data?.serialNumber || "AOE9CJC058");

  if (isOffline) {
    return (
      `⚡ <b>ESTADO GENERAL DEL SISTEMA</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏠 <b>Planta:</b> ${plantName}\n` +
      `📡 <b>Conexión Inversor:</b> 🔴 <b>DESCONECTADO (Offline)</b>\n` +
      `⚠️ <b>Detalle:</b> Módulo Wi-Fi sin enlace con servidores Growatt.\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔌 <b>Red Eléctrica (AC):</b> ⚠️ Sin telemetría en vivo\n` +
      `🔋 <b>Batería:</b> ⚠️ Sin telemetría en vivo\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🕒 <i>El sistema reintentará la conexión automáticamente en el siguiente ciclo.</i>`
    );
  }

  const vac = data?.vac !== null && data?.vac !== undefined ? Number(data.vac) : 230;
  const fac = data?.fac !== null && data?.fac !== undefined ? Number(data.fac) : 60;
  const soc = data?.batterySOC !== null && data?.batterySOC !== undefined ? Math.round(data.batterySOC) : 100;
  const vbat = data?.batteryVoltage !== null && data?.batteryVoltage !== undefined ? Number(data.batteryVoltage).toFixed(1) : "53.3";
  const load = data?.houseLoad !== null && data?.houseLoad !== undefined ? Math.round(data.houseLoad) : 800;
  const temp = data?.temperature !== null && data?.temperature !== undefined ? Number(data.temperature).toFixed(1) : "38.5";

  // 1. Estado de la Red AC
  let gridStatus = "";
  if (vac === 0) {
    gridStatus = `🚨 <b>SIN SUMINISTRO (CORTE DE LUZ • 0 V)</b>`;
  } else if (vac < 195) {
    gridStatus = `⚠️ <b>Bajo Voltaje (${vac} V • ${fac} Hz)</b>`;
  } else if (vac > 250) {
    gridStatus = `🚨 <b>Sobrevoltaje (${vac} V • ${fac} Hz)</b>`;
  } else {
    gridStatus = `🟢 <b>Conectada y Estable (${vac} V • ${fac} Hz)</b>`;
  }

  // 2. Estado de la Batería
  let batIcon = "🔋";
  let batLabel = "";
  if (soc <= 30) {
    batIcon = "🔴";
    batLabel = `<b>${soc}% (Nivel Crítico)</b>`;
  } else if (soc <= 60) {
    batIcon = "🟠";
    batLabel = `<b>${soc}% (Nivel Bajo)</b>`;
  } else {
    batIcon = "🟢";
    batLabel = `<b>${soc}% (Óptimo)</b>`;
  }

  // 3. Modo de Operación
  let modeDesc = "";
  if (vac === 0) {
    modeDesc = `🔋 <b>Respaldo UPS Activo (Suministrando desde Batería)</b>`;
  } else {
    modeDesc = `⚡ <b>Red Comercial Activa (Bypass / Cargando Batería)</b>`;
  }

  const timeStr = new Date().toLocaleTimeString("es-ES", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    `⚡ <b>ESTADO GENERAL DEL SISTEMA</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🏠 <b>Planta:</b> ${plantName}\n` +
    `📡 <b>Conexión Inversor:</b> 🟢 <b>En Línea (Online)</b>\n` +
    `📟 <b>Dispositivo:</b> ${model} (<code>${sn}</code>)\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔌 <b>Red Comercial (AC):</b>\n` +
    `   └ ${gridStatus}\n\n` +
    `${batIcon} <b>Porcentaje de Batería:</b> ${batLabel}\n` +
    `⚡ <b>Voltaje de Batería:</b> <code>${vbat} V</code>\n` +
    `🏠 <b>Consumo Actual Casa:</b> <code>${load} W</code>\n` +
    `🌡️ <b>Temperatura Inversor:</b> <code>${temp} °C</code>\n` +
    `🔄 <b>Modo de Operación:</b>\n` +
    `   └ ${modeDesc}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🕒 <i>Lectura: ${timeStr} (Hora Vzla)</i>`
  );
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

    const allRegistered = await getAllRegisteredChatIds();

    return NextResponse.json({
      success: meData.ok,
      bot: meData.result || null,
      webhook: whData.result || null,
      registeredCount: allRegistered.length,
      registeredChatIds: allRegistered
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

    // CASE 1: Incoming Telegram Webhook Update (User starts bot, sends message, adds bot to group, etc.)
    const message = body.message || body.channel_post || body.edited_message;
    const chat = message?.chat || body.my_chat_member?.chat || body.chat_member?.chat || body.callback_query?.message?.chat;

    if (body.update_id && chat && chat.id) {
      const chatId = String(chat.id).trim();
      const userName = chat.first_name || chat.title || "Usuario";
      const text = message?.text ? message.text.trim() : "";

      // 1. Load existing registered IDs
      let chatIds = [];
      try {
        if (fs.existsSync(chatIdsFilePath)) {
          chatIds = JSON.parse(fs.readFileSync(chatIdsFilePath, "utf8"));
        }
      } catch (e) {}

      const kvIds = await getKvChatIds();
      for (const kid of kvIds) {
        const sId = String(kid).trim();
        if (sId && !chatIds.includes(sId)) {
          chatIds.push(sId);
        }
      }

      // 2. Automatically register this Chat ID without any whitelist check
      let isNewSubscriber = false;
      if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        saveChatIds(chatIds);
        await saveKvChatIds(chatIds);
        isNewSubscriber = true;
      }
      if (!global.vercelChatIds.includes(chatId)) {
        global.vercelChatIds.push(chatId);
      }

      // 3. Process commands and messages
      if (text.startsWith("/start") || (isNewSubscriber && !text.startsWith("/estado") && !text.startsWith("/status"))) {
        const welcomeText =
          `🔌 <b>¡Monitoreo Growatt Activado!</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `Hola <b>${escapeHtml(userName)}</b>, has quedado <b>suscrito automáticamente</b> al sistema de notificaciones de la residencia de <b>Nelson Márquez</b>.\n\n` +
          `Recibirás alertas en tiempo real sobre:\n` +
          `• 🚨 <b>Cortes de luz</b> (Falla de Red Eléctrica AC)\n` +
          `• ✅ <b>Restablecimiento de energía</b> y duración del corte\n` +
          `• 🔋 <b>Nivel de baterías</b> (Advertencia de Batería Baja y Crítica)\n` +
          `• ⚠️ <b>Sobrevoltaje o anomalías</b> del inversor\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `💡 <i>Puedes escribir <b>/estado</b> en cualquier momento para consultar el voltaje, la red y la batería en vivo.</i>`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: "HTML"
          })
        });
      } else if (text.startsWith("/status") || text.startsWith("/estado")) {
        // Fetch freshest telemetry and reply with full status report
        const telemetry = await getLatestTelemetry();
        const statusReport = formatStatusReport(telemetry);

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: statusReport,
            parse_mode: "HTML"
          })
        });
      } else if (text.startsWith("/help") || text.startsWith("/ayuda")) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `ℹ️ <b>Ayuda - Monitoreo Growatt</b>\n\nEste bot envía alertas automáticas cuando ocurren eventos en el sistema eléctrico del inversor Growatt.\n\n<b>Comandos disponibles:</b>\n• /estado - Ver voltaje de red AC, conexión inversor, % y voltaje de batería en vivo\n• /start - Iniciar o verificar suscripción\n• /ayuda - Mostrar este mensaje de ayuda`,
            parse_mode: "HTML"
          })
        });
      } else if (text) {
        // If the user sends any other text, acknowledge and provide /estado shortcut
        const telemetry = await getLatestTelemetry();
        const statusReport = formatStatusReport(telemetry);

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: statusReport,
            parse_mode: "HTML"
          })
        });
      }

      return NextResponse.json({
        success: true,
        message: "Chat ID registrado y procesado exitosamente",
        chatId: chatId,
        totalSubscribers: chatIds.length
      });
    }

    // CASE 2: Proxy message send request (e.g., test notification from web dashboard)
    const { message: sendMsg, botToken: bodyToken, chatId: bodyChatId } = body;
    const activeToken = (bodyToken || botToken).trim();
    
    // If no specific chatId is provided in the test payload, broadcast to all registered chat IDs!
    let targetChatIds = [];
    if (bodyChatId && bodyChatId.trim()) {
      targetChatIds = bodyChatId.toString().split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      targetChatIds = await getAllRegisteredChatIds();
    }

    if (!sendMsg) {
      return NextResponse.json(
        { success: false, error: "Falta el cuerpo del mensaje." },
        { status: 400 }
      );
    }

    if (targetChatIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay destinatarios registrados." },
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
          text: sendMsg,
          parse_mode: "HTML",
        }),
      });

      let tgData = await tgRes.json();

      // Fallback: If Telegram rejected HTML entities, strip tags and send as plain text
      if (!tgRes.ok && tgData?.description && tgData.description.includes("can't parse entities")) {
        console.warn(`[Telegram Proxy] Fallo de parseo HTML para ${chatId}. Reintentando en texto plano...`);
        const plainText = sendMsg.replace(/<[^>]+>/g, "");
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
      return NextResponse.json({ success: true, results, totalSent: results.filter(r => r.success).length });
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
