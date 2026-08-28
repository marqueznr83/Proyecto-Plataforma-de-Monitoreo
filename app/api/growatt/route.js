import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Keep cache in memory for serverless container warm cycles
let globalNotifiedAlerts = [];
let acOutageStartTime = null;

// Server-side cache for Growatt OpenAPI telemetry to avoid extra requests on F5/reloads
let lastGrowattTelemetry = null;
let lastTelemetryTime = 0;
let lastOfflineTime = 0;

const chatIdsFilePath = path.join(process.cwd(), "chat_ids.json");

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getRegisteredChatIds(overrideChatId = null) {
  let ids = [];
  
  // 1. Explicit override passed from request query/body
  if (overrideChatId) {
    const overrideList = String(overrideChatId).split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const id of overrideList) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  // 2. Read from environment variable (comma or space separated)
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envChatId) {
    const envList = envChatId.split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const id of envList) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  
  // 3. Load from local file if exists (for local testing persistent storage)
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

  // 4. Load from Vercel KV if available
  if (kvUrl && kvToken) {
    try {
      const kvRes = await fetch(`${kvUrl}/get/chat_ids`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const kvJson = await kvRes.json();
      if (kvJson && kvJson.result) {
        const kvIds = typeof kvJson.result === "string" ? JSON.parse(kvJson.result) : kvJson.result;
        if (Array.isArray(kvIds)) {
          for (const kvId of kvIds) {
            const sId = String(kvId).trim();
            if (sId && !ids.includes(sId)) {
              ids.push(sId);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error reading from Vercel KV:", e.message);
    }
  }

  // 5. Sync with global Vercel cache (best effort)
  if (global.vercelChatIds && Array.isArray(global.vercelChatIds)) {
    for (const id of global.vercelChatIds) {
      const sId = String(id).trim();
      if (sId && !ids.includes(sId)) {
        ids.push(sId);
      }
    }
  }

  // 6. Default fallback if empty (original user private Chat ID)
  if (ids.length === 0) {
    return ["8003576551"];
  }
  
  return ids;
}

async function sendTelegramMessage(text, options = {}) {
  const botToken = (options.botToken || process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0").trim();
  const chatIds = await getRegisteredChatIds(options.chatId);
  
  if (!botToken) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN no está configurado.");
    return { success: false, sentCount: 0, totalRecipients: 0, error: "Bot token no configurado" };
  }
  if (chatIds.length === 0) {
    console.warn("[Telegram] No hay Chat IDs registrados para recibir alertas.");
    return { success: false, sentCount: 0, totalRecipients: 0, error: "No hay chat IDs registrados" };
  }

  let sentCount = 0;
  const errors = [];

  for (const chatId of chatIds) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      });
      let json = await res.json();

      // Fallback: If Telegram fails because of HTML entity parse error (HTTP 400), strip HTML tags and retry in plain text
      if (!res.ok && json?.description && json.description.includes("can't parse entities")) {
        console.warn(`[Telegram] Fallo de parseo HTML para ${chatId} (${json.description}). Reintentando en texto plano...`);
        const plainText = text.replace(/<[^>]+>/g, "");
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText
          })
        });
        json = await res.json();
      }

      if (res.ok && json.ok) {
        sentCount++;
        console.log(`[Telegram] Alerta entregada exitosamente a Chat ID: ${chatId}`);
      } else {
        const errorDesc = `Error ${json?.error_code || res.status} al enviar a ${chatId}: ${json?.description || "Desconocido"}`;
        console.error(`[Telegram] ${errorDesc}`);
        errors.push(errorDesc);
      }
    } catch (err) {
      const errorDesc = `Excepción de red al enviar a ${chatId}: ${err.message}`;
      console.error(`[Telegram] ${errorDesc}`);
      errors.push(errorDesc);
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    totalRecipients: chatIds.length,
    errors
  };
}

const getAlertTitleById = (alertId) => {
  switch (alertId) {
    case "ac_outage": return "Corte de Entrada Red AC (Falta Suministro)";
    case "ac_low_vac": return "Bajo Voltaje de Red AC (Inestabilidad)";
    case "ac_high_vac": return "Sobrevoltaje en Red AC (Peligro)";
    case "bat_critical": return "Voltaje de Batería Crítico (Descargada)";
    case "bat_low": return "Batería en Nivel Bajo (Advertencia)";
    default: return "Alerta General de Inversor";
  }
};

async function handleBackendNotifications(data, options = {}) {
  const currentAlerts = data.alerts || [];
  const isOffline = data.isOffline || false;
  
  // Load state from Vercel KV or fall back to memory
  let notifiedAlerts = [...globalNotifiedAlerts];
  let outageStartTime = acOutageStartTime;

  if (kvUrl && kvToken) {
    try {
      const kvRes = await fetch(`${kvUrl}/get/growatt_state`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const kvJson = await kvRes.json();
      if (kvJson && kvJson.result) {
        const state = typeof kvJson.result === "string" ? JSON.parse(kvJson.result) : kvJson.result;
        if (state) {
          if (Array.isArray(state.notifiedAlerts)) notifiedAlerts = state.notifiedAlerts;
          if (state.acOutageStartTime !== undefined) outageStartTime = state.acOutageStartTime;
        }
      }
    } catch (e) {
      console.error("Error reading state from Vercel KV:", e.message);
    }
  }

  const newNotifiedIds = [...notifiedAlerts];
  let hasChanges = false;

  const plantName = escapeHtml(data.plantName || "Planta Nelson Márquez");
  const batterySOC = data.batterySOC !== null && data.batterySOC !== undefined ? data.batterySOC : 50;
  const batteryVoltage = data.batteryVoltage !== null && data.batteryVoltage !== undefined ? data.batteryVoltage : 48.0;
  const houseLoadWatts = data.houseLoad !== undefined && data.houseLoad !== null ? Math.round(data.houseLoad) : 800;
  const vac = data.vac !== undefined && data.vac !== null ? data.vac : 230;

  // 1. Notify NEW alarms
  for (const alert of currentAlerts) {
    // Ignore internal tracking and warning events from triggering unwanted alerts
    if (alert.id === "api_connection_warning" || alert.id === "bat_not_optimal") continue;

    if (!notifiedAlerts.includes(alert.id)) {
      let text = "";
      
      if (alert.id === "wifi_offline") {
        const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString("es-ES", { timeZone: "America/Caracas" }) : new Date().toLocaleTimeString("es-ES", { timeZone: "America/Caracas" });
        text = `⚠️ <b>MÓDULO WI-FI FUERA DE LÍNEA – ${plantName}</b>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `<blockquote><b>Detalle:</b> Se ha perdido la conexión con los servidores de Growatt.\n` +
               `<b>Hora:</b> ${timeStr}</blockquote>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `El monitoreo en vivo está pausado hasta restablecer la señal.`;
      } else if (alert.id === "ac_outage") {
        if (!outageStartTime) {
          outageStartTime = Date.now();
          hasChanges = true;
        }
        text = `🚨 <b>CORTE DE LUZ – ${plantName}</b>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `• Red Comercial: Sin suministro (0 V)\n` +
               `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
               `• Consumo Casa: ${houseLoadWatts} W\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `Respaldo por batería activo.`;
      } else if (alert.id === "bat_low") {
        text = `🟠 <b>BATERÍA BAJA (${batterySOC}%) – ${plantName}</b>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `• Voltaje: ${batteryVoltage} V\n` +
               `• Consumo: ${houseLoadWatts} W\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `Se sugiere moderar el consumo.`;
      } else if (alert.id === "bat_critical") {
        text = `🔴 <b>BATERÍA CRÍTICA (${batterySOC}%) – ${plantName}</b>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `• Voltaje: ${batteryVoltage} V\n` +
               `• Consumo: ${houseLoadWatts} W\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `¡Alerta! Nivel de batería críticamente bajo.`;
      } else {
        const severityTitle = alert.severity === "critical" ? "🔴 <b>ALERTA CRÍTICA DE INVERSOR</b>" : "⚠️ <b>ADVERTENCIA DE SISTEMA</b>";
        const localTimeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString("es-ES", { timeZone: "America/Caracas" }) : new Date().toLocaleTimeString("es-ES", { timeZone: "America/Caracas" });
        text = `${severityTitle}\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `<blockquote><b>Evento:</b> ${escapeHtml(alert.title)}\n` +
               `<b>Detalle:</b> ${escapeHtml(alert.message)}\n` +
               `<b>Código:</b> <code>${escapeHtml(alert.code)}</code>\n` +
               `<b>Hora:</b> ${localTimeStr}</blockquote>\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `🔌 <i>Monitoreo ${plantName}</i>`;
      }
      
      const sendResult = await sendTelegramMessage(text, options);
      // Only mark as notified if the message was successfully dispatched or if no recipients were registered
      if (sendResult.success || sendResult.totalRecipients === 0) {
        newNotifiedIds.push(alert.id);
        hasChanges = true;
      } else {
        console.warn(`[Telegram] No se pudo notificar la alerta ${alert.id}. Se reintentará en el siguiente ciclo.`);
      }
    }
  }

  // 2. Notify RESOLVED alarms (Only when online, except wifi_offline)
  if (!isOffline) {
    for (const alertId of notifiedAlerts) {
      if (alertId === "wifi_offline") {
        const isStillActive = currentAlerts.some((a) => a.id === alertId);
        if (!isStillActive) {
          const localTimeStr = new Date().toLocaleTimeString("es-ES", { timeZone: "America/Caracas" });
          const text = `🟢 <b>MÓDULO RECONECTADO – ${plantName}</b>\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `<blockquote><b>Estado:</b> Conexión restablecida con el inversor.\n` +
                       `<b>Hora:</b> ${localTimeStr}</blockquote>\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `🔌 <i>Monitoreo ${plantName}</i>`;
          await sendTelegramMessage(text, options);
          const index = newNotifiedIds.indexOf(alertId);
          if (index > -1) {
            newNotifiedIds.splice(index, 1);
          }
          hasChanges = true;
        }
        continue;
      }

      const isStillActive = currentAlerts.some((a) => a.id === alertId);
      if (!isStillActive) {
        let text = "";
        
        if (alertId === "ac_outage") {
          let durationStr = "Desconocida";
          if (outageStartTime) {
            const diffMs = Date.now() - outageStartTime;
            const diffMin = Math.round(diffMs / 60000);
            if (diffMin >= 60) {
              const hours = Math.floor(diffMin / 60);
              const mins = diffMin % 60;
              durationStr = `${hours}h ${mins} min`;
            } else {
              durationStr = diffMin > 0 ? `${diffMin} min` : "menos de 1 min";
            }
            outageStartTime = null;
            hasChanges = true;
          }
          text = `✅ <b>LUZ RESTABLECIDA – ${plantName}</b>\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `• Red Comercial: ${vac} V\n` +
                 `• Duración del Corte: ${durationStr}\n` +
                 `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
                 `━━━━━━━━━━━━━━━━━━`;
        } else if (alertId === "bat_low") {
          // Resolve silently (no Telegram alert sent) - we only notify at 80%
          const index = newNotifiedIds.indexOf(alertId);
          if (index > -1) {
            newNotifiedIds.splice(index, 1);
          }
          hasChanges = true;
          continue;
        } else if (alertId === "bat_not_optimal") {
          text = `🟢 <b>BATERÍA EN NIVEL ÓPTIMO (${batterySOC}%) – ${plantName}</b>\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `• Voltaje: ${batteryVoltage} V\n` +
                 `• Consumo: ${houseLoadWatts} W\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `La batería ha cargado por encima del nivel óptimo del 80%.`;
        } else if (alertId === "bat_critical") {
          text = `🔋 <b>BATERÍA SUPERÓ EL LÍMITE CRÍTICO (${batterySOC}%) – ${plantName}</b>\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `• Voltaje: ${batteryVoltage} V\n` +
                 `• Consumo: ${houseLoadWatts} W\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `La batería ha subido por encima del umbral crítico del 30%.`;
        } else {
          const title = escapeHtml(getAlertTitleById(alertId));
          const localTimeStr = new Date().toLocaleTimeString("es-ES", { timeZone: "America/Caracas" });
          text = `🟢 <b>SISTEMA RESTABLECIDO</b>\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `<blockquote><b>Solucionado:</b> ${title}\n` +
                 `<b>Estado:</b> Operación normal y segura.\n` +
                 `<b>Hora:</b> ${localTimeStr}</blockquote>\n` +
                 `━━━━━━━━━━━━━━━━━━\n` +
                 `🔌 <i>Monitoreo ${plantName}</i>`;
        }
        
        await sendTelegramMessage(text, options);
        const index = newNotifiedIds.indexOf(alertId);
        if (index > -1) {
          newNotifiedIds.splice(index, 1);
        }
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    globalNotifiedAlerts = newNotifiedIds;
    acOutageStartTime = outageStartTime;

    // Persist state to Vercel KV
    if (kvUrl && kvToken) {
      try {
        await fetch(`${kvUrl}/set/growatt_state`, {
          method: "POST",
          headers: { Authorization: `Bearer ${kvToken}` },
          body: JSON.stringify({
            notifiedAlerts: newNotifiedIds,
            acOutageStartTime: outageStartTime
          })
        });
      } catch (e) {
        console.error("Error saving state to Vercel KV:", e.message);
      }
    }
  }
}

// Growatt API route proxy & smart telemetry engine (OpenAPI v1 Integration & Fallback Simulator)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || process.env.GROWATT_API_TOKEN || "75433vd880684dfp20nav03t8zb10xp1";
  const isDemoMode = searchParams.get("demo") === "true";
  
  // Custom Telegram options from query params if supplied
  const tgOptions = {
    botToken: searchParams.get("tgToken") || undefined,
    chatId: searchParams.get("tgChatId") || undefined
  };

  // Set up Telegram webhook dynamically when hosted on Vercel
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0").trim();
    const webhookUrl = `https://${host}/api/telegram`;
    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const infoJson = await infoRes.json();
      if (infoJson?.ok && infoJson?.result?.url !== webhookUrl) {
        console.log(`Setting Telegram Webhook dynamically to: ${webhookUrl}`);
        const allowedUpdates = JSON.stringify(["message", "edited_message", "channel_post", "my_chat_member", "chat_member", "callback_query"]);
        await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=${encodeURIComponent(allowedUpdates)}`);
      }
    } catch (err) {
      console.error("Error managing dynamic Telegram webhook:", err.message);
    }
  }
  
  // Custom Alarm & System Configuration from query params
  const config = {
    isDemoMode: isDemoMode,
    hasSolar: searchParams.get("hasSolar") === "true", 
    simulateACOutage: searchParams.get("noAC") === "true",
    minGridVac: Number(searchParams.get("minVac")) || 195,
    maxGridVac: Number(searchParams.get("maxVac")) || 250,
    lowBatSOC: Number(searchParams.get("lowBat")) || 60,
    criticalBatSOC: Number(searchParams.get("critBat")) || 30,
    customBatSOC: searchParams.get("batSOC") !== null ? Number(searchParams.get("batSOC")) : null
  };

  // If not in demo mode, attempt to connect to the real Growatt OpenAPI
  if (!isDemoMode && token && token !== "demo") {
    const nowMs = Date.now();
    // 1. Return cached offline state if within 5 minutes to prevent hammering Growatt when down
    if (nowMs - lastOfflineTime < 300000) {
      return NextResponse.json({
        source: "growatt_openapi_offline_cached",
        success: true,
        data: {
          plantName: "Residencial Sr. Nelson",
          inverterModel: "Growatt Inverter UPS",
          serialNumber: "AOE9CJC058",
          status: "MÓDULO DESCONECTADO",
          statusMessage: "Conexión con el inversor perdida (Caché)",
          isOffline: true,
          alerts: [
            {
              id: "wifi_offline",
              severity: "warning",
              title: "⚠️ MÓDULO WI-FI FUERA DE LÍNEA",
              message: "Conexión en pausa para evitar exceso de peticiones. Reintentando pronto.",
              code: "API_CONN_ERR_CACHED",
              timestamp: new Date().toISOString()
            }
          ],
          batterySOC: null,
          batteryVoltage: null,
          houseLoad: null,
          vac: null,
          fac: null,
          pac: null,
          temperature: null,
          hasWarningAlert: true,
          hasCriticalAlert: false
        }
      });
    }

    // 2. Return cached telemetry if requested within 5 minutes (300,000 ms)
    if (lastGrowattTelemetry && (nowMs - lastTelemetryTime < 300000)) {
      return NextResponse.json({
        source: "growatt_openapi_cached",
        success: true,
        data: lastGrowattTelemetry
      });
    }

    try {
      const realTelemetry = await getRealGrowattTelemetry(token, config);
      if (realTelemetry) {
        // Save to cache on successful load
        lastGrowattTelemetry = realTelemetry;
        lastTelemetryTime = nowMs;

        // Trigger server-side alerts check & telegram notifier
        await handleBackendNotifications(realTelemetry, tgOptions);
        
        return NextResponse.json({
          source: "growatt_openapi_realtime",
          success: true,
          data: realTelemetry
        });
      }
    } catch (apiError) {
      console.warn("Growatt OpenAPI fetch failed or permission denied, using offline state. Error details:", apiError);
      
      // Update offline cache timestamp to throttle subsequent F5 requests
      lastOfflineTime = nowMs;
      
      const offlineData = {
        plantName: "Residencial Sr. Nelson",
        inverterModel: "Growatt Inverter UPS",
        serialNumber: "AOE9CJC058",
        status: "MÓDULO DESCONECTADO",
        statusMessage: "Conexión con el inversor perdida",
        isOffline: true,
        alerts: [
          {
            id: "wifi_offline",
            severity: "warning",
            title: "⚠️ MÓDULO WI-FI FUERA DE LÍNEA",
            message: `No se pudo conectar a los servidores de Growatt (${apiError?.error_msg || apiError?.message || "Código 10012: Bloqueo por acceso frecuente"}).`,
            code: "API_CONN_ERR",
            timestamp: new Date().toISOString()
          }
        ],
        batterySOC: null,
        batteryVoltage: null,
        houseLoad: null,
        vac: null,
        fac: null,
        pac: null,
        temperature: null,
        hasWarningAlert: true,
        hasCriticalAlert: false
      };

      // Trigger server-side alerts check & telegram notifier ONLY for wifi_offline!
      await handleBackendNotifications(offlineData, tgOptions);

      return NextResponse.json({
        source: "growatt_openapi_offline",
        success: true,
        data: offlineData
      });
    }
  }

  // Default to live high-fidelity simulation
  const liveTelemetry = generateLiveTelemetry(token, config);
  // Trigger server-side alerts check & telegram notifier
  await handleBackendNotifications(liveTelemetry, tgOptions);
  
  return NextResponse.json({
    source: "telemetry_engine_v3",
    success: true,
    data: liveTelemetry
  });
}

// Regional OpenAPI endpoints lookup
async function fetchGrowattOpenAPI(token, path, queryParams = {}, method = "GET", bodyParams = null) {
  const domains = [
    "https://openapi.growatt.com",
    "https://openapi-us.growatt.com",
    "https://openapi-cn.growatt.com"
  ];
  
  let lastError = null;
  
  for (const domain of domains) {
    try {
      const url = new URL(`${domain}${path}`);
      Object.keys(queryParams).forEach(k => url.searchParams.append(k, queryParams[k]));
      
      const options = {
        method: method,
        headers: {
          "token": token,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      };

      if (bodyParams) {
        // Growatt OpenAPI expects application/x-www-form-urlencoded for form parameters
        const formBody = [];
        for (const property in bodyParams) {
          const encodedKey = encodeURIComponent(property);
          const encodedValue = encodeURIComponent(bodyParams[property]);
          formBody.push(encodedKey + "=" + encodedValue);
        }
        options.body = formBody.join("&");
      }
      
      // Setup AbortController for 4-second timeout to prevent serverless function hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let res;
      try {
        res = await fetch(url.toString(), { 
          ...options, 
          cache: "no-store",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!res.ok) continue;
      
      const json = await res.json();
      
      // error_code 0 means success in Growatt OpenAPI protocol
      if (json && json.error_code === 0) {
        return json.data || json;
      } else {
        lastError = json;
        console.error(`Growatt API error on ${domain} for path ${path}:`, json);
      }
    } catch (e) {
      lastError = e;
      console.error(`Growatt connection failed on ${domain} for path ${path}:`, e.name === "AbortError" ? "Timeout (exceeded 4s)" : e.message);
    }
  }
  
  throw lastError || new Error("Failed to connect to Growatt OpenAPI");
}

// Fetch and merge real plant, device and battery data from OpenAPI
async function getRealGrowattTelemetry(token, config) {
  const now = new Date();

  // 1. Get user plants
  const plantListRes = await fetchGrowattOpenAPI(token, "/v1/plant/list");
  const plants = plantListRes?.plants || plantListRes?.list || [];
  if (plants.length === 0) {
    throw new Error("No se encontraron plantas de energía en esta cuenta.");
  }
  
  const plant = plants[0];
  const plantId = plant.plant_id || plant.plantId;

  // 2. Get device list
  const deviceListRes = await fetchGrowattOpenAPI(token, "/v1/device/list", { plant_id: plantId });
  const devices = deviceListRes?.devices || deviceListRes?.list || [];
  if (devices.length === 0) {
    throw new Error("No se encontraron inversores o dispositivos de almacenamiento.");
  }

  // Find storage (battery hybrid type 2) or inverter (type 1)
  const storageDevice = devices.find(d => d.type === 2 || d.type === "storage" || d.model?.toLowerCase().includes("sph") || d.model?.toLowerCase().includes("spa"));
  const inverterDevice = devices.find(d => d.type === 1 || d.type === "inverter") || devices[0];

  let batterySOC = 100;
  let batteryVoltage = 53.3;
  let batteryPower = 0;
  let temperature = 38.5;
  let vac = 230;
  let fac = 60.0;
  let pac = 0;
  let houseLoad = 0;

  // 3. Query real-time metrics for storage if present
  if (storageDevice) {
    try {
      const storageData = await fetchGrowattOpenAPI(token, "/v1/device/storage/storage_last_data", {}, "POST", {
        storage_sn: storageDevice.device_sn || storageDevice.deviceSn
      });
      
      if (storageData) {
        // Extract real BMS and Grid metrics
        // capacity is the real Battery SOC, vBat is battery voltage
        batterySOC = storageData.capacity !== undefined ? storageData.capacity : (storageData.soc || storageData.batterySoc || 100);
        batteryVoltage = storageData.vBat !== undefined ? Number(Number(storageData.vBat).toFixed(1)) : (storageData.batteryVoltage || 53.3);
        
        // pBat is positive for discharging and negative for charging. We invert it for our UI standard (+ charge, - discharge)
        batteryPower = storageData.pBat !== undefined ? -storageData.pBat : 0;
        
        temperature = storageData.invTemperature || storageData.temperature || storageData.temp || 38.5;
        vac = storageData.vGrid !== undefined ? Number(Number(storageData.vGrid).toFixed(1)) : (storageData.vac1 ? Number(Number(storageData.vac1).toFixed(1)) : 230);
        fac = storageData.freqGrid !== undefined ? Number(Number(storageData.freqGrid).toFixed(2)) : (storageData.fGrid ? Number(Number(storageData.fGrid).toFixed(2)) : 60.0);
        pac = storageData.outPutPower || storageData.pAcOutPut || 0;
        
        // In bypass mode, house consumption load is outputPower / pAcOutPut or 0 if idle
        houseLoad = storageData.pLocal || storageData.loadPower || storageData.outPutPower || storageData.pAcOutPut || 0;
      }
    } catch (storageErr) {
      console.warn("Could not query detailed storage data, using base inverter metrics", storageErr);
    }
  } else if (inverterDevice) {
    // Basic inverter metrics fallback
    try {
      const inverterData = await fetchGrowattOpenAPI(token, "/v1/device/inverter/inverter_last_data", {}, "POST", {
        inverter_sn: inverterDevice.device_sn || inverterDevice.deviceSn
      });
      if (inverterData) {
        vac = inverterData.vac1 !== undefined ? Number(Number(inverterData.vac1).toFixed(1)) : 230;
        fac = inverterData.fac !== undefined ? Number(Number(inverterData.fac).toFixed(2)) : 60.0;
        pac = inverterData.pac || 0;
        temperature = inverterData.temp || 38.5;
      }
    } catch (invErr) {
      console.warn("Could not query inverter data", invErr);
    }
  }

  // Parse simulated/forced override if requested for debugging
  if (config.simulateACOutage) {
    vac = 0;
    fac = 0;
  }
  // Only override real battery values with the testing slider if Demo Mode is ACTIVE
  if (config.isDemoMode && config.customBatSOC !== null) {
    batterySOC = config.customBatSOC;
    batteryVoltage = Number((45.0 + (batterySOC / 100) * 8.1).toFixed(1));
  }

  // 4. Construct live alerts based on real metrics & custom user thresholds
  const alerts = [];
  if (vac === 0) {
    alerts.push({
      id: "ac_outage",
      severity: "critical",
      title: "🚨 CORTE DE ENERGÍA: SIN ENTRADA RED AC",
      message: "El inversor no detecta tensión de red eléctrica. Operando en modo Respaldo Ininterrumpido desde Batería (UPS).",
      code: "E01_NO_AC",
      timestamp: now.toISOString()
    });
  } else if (vac < config.minGridVac) {
    alerts.push({
      id: "ac_low_vac",
      severity: "warning",
      title: "⚠️ BAJO VOLTAJE DE RED AC",
      message: `Voltaje de red eléctrica por debajo del umbral de advertencia (${vac}V < ${config.minGridVac}V).`,
      code: "W02_LOW_VAC",
      timestamp: now.toISOString()
    });
  } else if (vac > config.maxGridVac) {
    alerts.push({
      id: "ac_high_vac",
      severity: "critical",
      title: "🚨 SOBREVOLTAJE EN RED AC",
      message: `Voltaje de red eléctrica peligroso (${vac}V > ${config.maxGridVac}V). Activada protección en inversor.`,
      code: "E03_HIGH_VAC",
      timestamp: now.toISOString()
    });
  }

  if (batterySOC <= config.criticalBatSOC) {
    alerts.push({
      id: "bat_critical",
      severity: "critical",
      title: "🚨 VOLTAJE DE BATERÍA CRÍTICO (ROJO)",
      message: `Carga y voltaje de batería crítico: ${batterySOC}% (${batteryVoltage}V). Límite: ${config.criticalBatSOC}%.`,
      code: "E10_BAT_CRITICAL",
      timestamp: now.toISOString()
    });
  } else if (batterySOC <= config.lowBatSOC) {
    alerts.push({
      id: "bat_low",
      severity: "warning",
      title: "⚠️ BATERÍA EN NIVEL BAJO (AMARILLO)",
      message: `Estado de carga de batería bajo: ${batterySOC}% (${batteryVoltage}V). Límite aviso: ${config.lowBatSOC}%.`,
      code: "W11_BAT_LOW",
      timestamp: now.toISOString()
    });
  }

  if (batterySOC < 80) {
    alerts.push({
      id: "bat_not_optimal",
      severity: "info",
      title: "Batería por debajo del nivel óptimo (80%)",
      message: `Carga de batería por debajo del 80%: ${batterySOC}% (${batteryVoltage}V).`,
      code: "I12_BAT_NOT_OPTIMAL",
      timestamp: now.toISOString()
    });
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  let status = "ONLINE";
  let statusMessage = "Operación Óptima";
  if (hasCritical) {
    status = "CRÍTICO (ROJO)";
    statusMessage = "Alarma Activa";
  } else if (hasWarning) {
    status = "ADVERTENCIA (AMARILLO)";
    statusMessage = "Revisar Parámetros";
  } else if (vac === 0) {
    status = "MODO RESPALDO";
    statusMessage = "Operando con Baterías";
  }

  // Construct Hourly Curves (consumption & battery charge history)
  const hourlyData = [];
  for (let h = 5; h <= 21; h++) {
    hourlyData.push({
      time: `${h.toString().padStart(2, '0')}:00`,
      potenciaKW: 0
    });
  }

  return {
    plantName: plant.plant_name || plant.plantName || "Residencial Sr. Nelson",
    inverterModel: storageDevice?.model || inverterDevice?.model || "Growatt Inverter UPS",
    serialNumber: storageDevice?.device_sn || inverterDevice?.device_sn || "GW-REAL-2026",
    tokenPreview: `${token.substring(0, 6)}...${token.substring(token.length - 4)}`,
    status,
    statusMessage,
    alerts,
    hasCriticalAlert: hasCritical,
    hasWarningAlert: hasWarning,
    hasSolar: config.hasSolar,
    ppv: 0,
    ppvKW: 0,
    pac: pac,
    pacKW: Number((pac / 1000).toFixed(2)),
    eToday: 0,
    eTotal: 0,
    eMonth: 0,
    houseLoad: houseLoad,
    houseKW: Number((houseLoad / 1000).toFixed(2)),
    gridPower: -houseLoad, // Net importing
    vac,
    fac,
    gridAC: {
      vac,
      iac: Number((pac / Math.max(1, vac)).toFixed(2)),
      fac
    },
    batterySOC,
    batteryVoltage,
    batteryPower,
    battery: {
      soc: batterySOC,
      voltage: batteryVoltage,
      power: batteryPower
    },
    temperature: Math.round(temperature),
    efficiency: 98.2,
    co2SavedKg: 0,
    treesSaved: 0,
    hourlyData,
    lastUpdated: now.toISOString()
  };
}

// Local telemetry generator fallback function
function generateLiveTelemetry(token, config) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  let currentPpv = 0;
  if (config.hasSolar) {
    if (hour >= 6 && hour <= 19) {
      const dayProgress = (hour - 6) / 13;
      const solarFactor = Math.sin(dayProgress * Math.PI);
      const basePpv = Math.max(0, Math.round(6000 * Math.pow(solarFactor, 1.4)));
      const jitter = (Math.random() - 0.5) * 80;
      currentPpv = Math.max(0, Math.round(basePpv + jitter));
    }
  }

  let vac = config.simulateACOutage ? 0 : Math.round(229 + (Math.random() * 2 - 1));
  const fac = vac > 0 ? Number((60.0 + (Math.random() * 0.04 - 0.02)).toFixed(2)) : 0;
  
  let batterySOC = config.customBatSOC !== null && !isNaN(config.customBatSOC)
    ? config.customBatSOC 
    : Math.round(55 + Math.sin(hour / 3) * 20);
  batterySOC = Math.max(0, Math.min(100, batterySOC));

  const batteryVoltage = Number((45.0 + (batterySOC / 100) * 8.1).toFixed(1));

  const houseLoad = Math.round(820 + Math.random() * 180);
  const houseKW = Number((houseLoad / 1000).toFixed(2));

  let pac = 0;
  let batteryPower = 0;
  let gridPower = 0;

  if (vac > 0) {
    if (currentPpv > houseLoad) {
      pac = Math.round(currentPpv * 0.975);
      batteryPower = Math.min(pac - houseLoad, 2000);
      gridPower = pac - houseLoad - batteryPower;
    } else {
      pac = houseLoad;
      if (batterySOC > config.lowBatSOC && config.hasSolar) {
        batteryPower = -Math.min(houseLoad, 1500);
        gridPower = -(houseLoad - Math.abs(batteryPower));
      } else {
        batteryPower = batterySOC < 95 ? 1200 : 0; 
        gridPower = -(houseLoad + batteryPower);
      }
    }
  } else {
    if (batterySOC > 5) {
      batteryPower = -houseLoad;
      pac = houseLoad;
    } else {
      pac = 0;
    }
    gridPower = 0;
  }

  const pacKW = Number((pac / 1000).toFixed(2));
  const eToday = config.hasSolar ? Number((14.2 + (currentPpv / 1000) * 2).toFixed(2)) : 0;

  const ppv1 = Math.round(currentPpv * 0.6);
  const ppv2 = Math.round(currentPpv * 0.4);
  const vpv1 = ppv1 > 0 ? 362 : 0;
  const ipv1 = vpv1 > 0 ? Number((ppv1 / vpv1).toFixed(2)) : 0;
  const vpv2 = ppv2 > 0 ? 344 : 0;
  const ipv2 = vpv2 > 0 ? Number((ppv2 / vpv2).toFixed(2)) : 0;

  const alerts = [];
  if (vac === 0) {
    alerts.push({
      id: "ac_outage",
      severity: "critical",
      title: "🚨 CORTE DE ENERGÍA: SIN ENTRADA RED AC",
      message: "El inversor no detecta tensión de red eléctrica. Operando en modo Respaldo Ininterrumpido desde Batería (UPS).",
      code: "E01_NO_AC",
      timestamp: now.toISOString()
    });
  } else if (vac < config.minGridVac) {
    alerts.push({
      id: "ac_low_vac",
      severity: "warning",
      title: "⚠️ BAJO VOLTAJE DE RED AC",
      message: `Voltaje de red eléctrica por debajo del umbral de advertencia (${vac}V < ${config.minGridVac}V).`,
      code: "W02_LOW_VAC",
      timestamp: now.toISOString()
    });
  } else if (vac > config.maxGridVac) {
    alerts.push({
      id: "ac_high_vac",
      severity: "critical",
      title: "🚨 SOBREVOLTAJE EN RED AC",
      message: `Voltaje de red eléctrica peligroso (${vac}V > ${config.maxGridVac}V). Activada protección en inversor.`,
      code: "E03_HIGH_VAC",
      timestamp: now.toISOString()
    });
  }

  if (batterySOC <= config.criticalBatSOC) {
    alerts.push({
      id: "bat_critical",
      severity: "critical",
      title: "🚨 VOLTAJE DE BATERÍA CRÍTICO (ROJO)",
      message: `Nivel de carga y voltaje en estado crítico: ${batterySOC}% (${batteryVoltage}V). Límite configurado: ${config.criticalBatSOC}%.`,
      code: "E10_BAT_CRITICAL",
      timestamp: now.toISOString()
    });
  } else if (batterySOC <= config.lowBatSOC) {
    alerts.push({
      id: "bat_low",
      severity: "warning",
      title: "⚠️ BATERÍA EN NIVEL BAJO (AMARILLO)",
      message: `Estado de carga de batería en nivel bajo: ${batterySOC}% (${batteryVoltage}V). Límite de advertencia: ${config.lowBatSOC}%.`,
      code: "W11_BAT_LOW",
      timestamp: now.toISOString()
    });
  }

  if (batterySOC < 80) {
    alerts.push({
      id: "bat_not_optimal",
      severity: "info",
      title: "Batería por debajo del nivel óptimo (80%)",
      message: `Carga de batería por debajo del 80%: ${batterySOC}% (${batteryVoltage}V).`,
      code: "I12_BAT_NOT_OPTIMAL",
      timestamp: now.toISOString()
    });
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  let status = "ONLINE";
  let statusMessage = "Operación Óptima";

  if (hasCritical) {
    status = "CRÍTICO (ROJO)";
    statusMessage = "Alarma de Alta Prioridad";
  } else if (hasWarning) {
    status = "ADVERTENCIA (AMARILLO)";
    statusMessage = "Revisar Parámetros";
  } else if (vac === 0) {
    status = "MODO RESPALDO";
    statusMessage = "Alimentando desde Baterías";
  }

  const hourlyData = [];
  for (let h = 5; h <= 21; h++) {
    const hProgress = (h - 6) / 13;
    let hFactor = config.hasSolar && h >= 6 && h <= 19 ? Math.sin(hProgress * Math.PI) : 0;
    hourlyData.push({
      time: `${h.toString().padStart(2, '0')}:00`,
      potenciaKW: Number((Math.max(0, 5.8 * Math.pow(hFactor, 1.4))).toFixed(2)),
    });
  }

  return {
    plantName: "Residencial Sr. Nelson",
    inverterModel: "Growatt Inverter UPS",
    serialNumber: "GW-HIBRIDO-2026",
    tokenPreview: token ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : "Demo",
    status,
    statusMessage,
    alerts,
    hasCriticalAlert: hasCritical,
    hasWarningAlert: hasWarning,
    hasSolar: config.hasSolar,
    ppv: currentPpv,
    ppvKW: Number((currentPpv / 1000).toFixed(2)),
    pac: pac,
    pacKW: pacKW,
    eToday: eToday,
    eTotal: config.hasSolar ? 4865.2 : 0,
    eMonth: config.hasSolar ? 684.2 : 0,
    houseLoad: houseLoad,
    houseKW: houseKW,
    gridPower: gridPower,
    vac: vac,
    fac: fac,
    gridAC: {
      vac: vac,
      iac: Number((pac > 0 ? (pac / Math.max(1, vac)).toFixed(2) : 0)),
      fac: fac
    },
    batterySOC: batterySOC,
    batteryVoltage: batteryVoltage,
    batteryPower: batteryPower,
    battery: {
      soc: batterySOC,
      voltage: batteryVoltage,
      power: batteryPower
    },
    hasBattery: true,
    string1: { vpv: vpv1, ipv: ipv1, ppv: ppv1 },
    string2: { vpv: vpv2, ipv: ipv2, ppv: ppv2 },
    temperature: Math.round(37 + (pacKW / 6) * 6),
    efficiency: vac > 0 ? 98.4 : 95.8,
    co2SavedKg: Number((eToday * 0.709).toFixed(2)),
    treesSaved: Number((eToday * 0.709 / 20).toFixed(1)),
    hourlyData: hourlyData,
    lastUpdated: now.toISOString()
  };
}
