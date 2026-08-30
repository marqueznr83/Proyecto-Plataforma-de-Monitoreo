import fs from "fs";
import path from "path";

const chatIdsFilePath = path.join(process.cwd(), "chat_ids.json");
const telemetryFilePath = path.join(process.cwd(), "telemetry_latest.json");

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

let globalNotifiedAlerts = [];
let acOutageStartTime = null;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getRegisteredChatIds() {
  let ids = [];
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envChatId) {
    const envList = envChatId.split(/[,\s]+/).map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const id of envList) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
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
  } catch (e) {}

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
    } catch (e) {}
  }

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

async function sendTelegramMessage(text) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0").trim();
  const chatIds = await getRegisteredChatIds();

  if (!botToken || chatIds.length === 0) return;

  for (const chatId of chatIds) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      });
      let json = await res.json();
      if (!res.ok && json?.description && json.description.includes("can't parse entities")) {
        const plainText = text.replace(/<[^>]+>/g, "");
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText
          })
        });
      }
      console.log(`[BackgroundMonitor] Notificación enviada a Telegram Chat ID: ${chatId}`);
    } catch (err) {
      console.error(`[BackgroundMonitor] Error al enviar a ${chatId}:`, err.message);
    }
  }
}

async function fetchGrowattOpenAPI(token, apiPath, queryParams = {}, method = "GET", bodyParams = null) {
  if (global.growattRateLimitUntil && Date.now() < global.growattRateLimitUntil) {
    const remainingSec = Math.round((global.growattRateLimitUntil - Date.now()) / 1000);
    throw new Error(`error_frequently_access (Enfriamiento activo: reintentando en ${remainingSec}s)`);
  }

  const domains = [
    "https://openapi.growatt.com",
    "https://openapi-us.growatt.com",
    "https://openapi-cn.growatt.com"
  ];
  let lastError = null;

  for (const domain of domains) {
    try {
      const url = new URL(`${domain}${apiPath}`);
      Object.keys(queryParams).forEach(k => url.searchParams.append(k, queryParams[k]));
      const options = {
        method: method,
        headers: {
          "token": token,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      };
      if (bodyParams) {
        const formBody = [];
        for (const property in bodyParams) {
          formBody.push(encodeURIComponent(property) + "=" + encodeURIComponent(bodyParams[property]));
        }
        options.body = formBody.join("&");
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      let res;
      try {
        res = await fetch(url.toString(), { ...options, cache: "no-store", signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) continue;
      const json = await res.json();
      if (json && json.error_code === 0) {
        return json.data || json;
      } else {
        lastError = json;
        if (json && json.error_code === 10012) {
          global.growattRateLimitUntil = Date.now() + 10 * 60 * 1000;
          console.warn("[BackgroundMonitor] Bloqueo 10012 detectado. Pausando 10 min para permitir que Growatt libere la API.");
          break;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Failed to connect to Growatt OpenAPI");
}

let cachedDeviceSN = "AOE9CJC02D";
let cachedPlantName = "Residencial Sr. Nelson";
let cachedModel = "Growatt Inverter UPS";

const historyFilePath = path.join(process.cwd(), "daily_history.json");

export function recordDailyTelemetry(point) {
  if (!point) return [];
  const now = Date.now();
  let history = [];

  if (global.dailyHistory && Array.isArray(global.dailyHistory)) {
    history = [...global.dailyHistory];
  } else {
    try {
      if (fs.existsSync(historyFilePath)) {
        const fileContent = JSON.parse(fs.readFileSync(historyFilePath, "utf8"));
        if (Array.isArray(fileContent)) history = fileContent;
      }
    } catch (e) {}
  }

  // Retain points from the last 24 hours (86,400,000 ms)
  history = history.filter(p => p && p.timestamp && (now - p.timestamp < 86400000));

  const last = history[history.length - 1];
  if (!last || (now - last.timestamp >= 120000)) {
    const timeStr = new Date(now).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Caracas"
    });
    history.push({
      time: timeStr,
      timestamp: now,
      vac: point.vac !== null && point.vac !== undefined ? Number(Number(point.vac).toFixed(1)) : 230,
      batterySOC: point.batterySOC !== null && point.batterySOC !== undefined ? Math.round(Number(point.batterySOC)) : 100,
      batteryVoltage: point.batteryVoltage !== null && point.batteryVoltage !== undefined ? Number(Number(point.batteryVoltage).toFixed(1)) : 53.3,
      houseKW: point.houseKW !== null && point.houseKW !== undefined ? Number(point.houseKW) : (Number((Number(point.houseLoad || 800) / 1000).toFixed(2))),
      houseW: point.houseLoad !== null && point.houseLoad !== undefined ? Math.round(Number(point.houseLoad)) : 800,
      temperature: point.temperature !== null && point.temperature !== undefined ? Number(Number(point.temperature).toFixed(1)) : 38.5
    });
  }

  global.dailyHistory = history;
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), "utf8");
  } catch (e) {}

  return history;
}

export function getDailyHistory() {
  if (global.dailyHistory && Array.isArray(global.dailyHistory) && global.dailyHistory.length > 0) {
    return global.dailyHistory;
  }
  try {
    if (fs.existsSync(historyFilePath)) {
      const fileContent = JSON.parse(fs.readFileSync(historyFilePath, "utf8"));
      if (Array.isArray(fileContent)) {
        global.dailyHistory = fileContent;
        return fileContent;
      }
    }
  } catch (e) {}
  return [];
}

export async function runTelemetryCheck() {
  const token = (process.env.GROWATT_API_TOKEN || "75433vd880684dfp20nav03t8zb10xp1").trim();
  const now = new Date();

  try {
    let batterySOC = 100;
    let batteryVoltage = 53.3;
    let temperature = 38.5;
    let vac = 230;
    let fac = 60.0;
    let pac = 0;
    let houseLoad = 800;
    let successFetch = false;

    // Direct single query for storage/inverter live data (1 single API call per cycle!)
    try {
      const storageData = await fetchGrowattOpenAPI(token, "/v1/device/storage/storage_last_data", {}, "POST", {
        storage_sn: cachedDeviceSN
      });
      if (storageData) {
        batterySOC = storageData.capacity !== undefined ? storageData.capacity : (storageData.soc || 100);
        batteryVoltage = storageData.vBat !== undefined ? Number(Number(storageData.vBat).toFixed(1)) : 53.3;
        temperature = storageData.invTemperature !== undefined ? Number(Number(storageData.invTemperature).toFixed(1)) : (storageData.temperature ? Number(Number(storageData.temperature).toFixed(1)) : 38.5);
        vac = storageData.vGrid !== undefined ? Number(Number(storageData.vGrid).toFixed(1)) : (storageData.vac1 ? Number(Number(storageData.vac1).toFixed(1)) : 230);
        fac = storageData.freqGrid !== undefined ? Number(Number(storageData.freqGrid).toFixed(2)) : 60.0;
        pac = storageData.outPutPower || 0;
        houseLoad = storageData.pLocal || storageData.loadPower || storageData.outPutPower || 800;
        successFetch = true;
      }
    } catch (storageErr) {
      // If storage endpoint failed with non-rate-limit error, try inverter endpoint
      if (storageErr.message && !storageErr.message.includes("error_frequently_access")) {
        try {
          const invData = await fetchGrowattOpenAPI(token, "/v1/device/inverter/inverter_last_data", {}, "POST", {
            inverter_sn: cachedDeviceSN
          });
          if (invData) {
            vac = invData.vac1 !== undefined ? Number(Number(invData.vac1).toFixed(1)) : 230;
            fac = invData.fac !== undefined ? Number(Number(invData.fac).toFixed(2)) : 60.0;
            pac = invData.pac || 0;
            temperature = invData.temp ? Number(Number(invData.temp).toFixed(1)) : 38.5;
            successFetch = true;
          }
        } catch (invErr) {
          throw invErr;
        }
      } else {
        throw storageErr;
      }
    }

    if (!successFetch) return;

    const telemetryData = {
      plantName: cachedPlantName,
      inverterModel: cachedModel,
      serialNumber: cachedDeviceSN,
      status: vac === 0 ? "CORTE DE LUZ" : "NORMAL",
      isOffline: false,
      vac,
      fac,
      pac,
      batterySOC,
      batteryVoltage,
      houseLoad,
      temperature,
      cachedAt: Date.now(),
      lastUpdated: now.toISOString()
    };

    // Record real point into 24h history log
    recordDailyTelemetry(telemetryData);
    telemetryData.dailyHistory = getDailyHistory();

    // Cache latest telemetry
    global.lastGrowattTelemetry = telemetryData;
    global.lastGrowattTelemetryTime = Date.now();
    try {
      fs.writeFileSync(telemetryFilePath, JSON.stringify(telemetryData, null, 2), "utf8");
    } catch (e) {}

    // Evaluate Alarms
    const currentAlerts = [];
    if (vac === 0) {
      currentAlerts.push({
        id: "ac_outage",
        severity: "critical",
        title: "🚨 CORTE DE LUZ: SIN ENTRADA RED AC"
      });
    } else if (vac < 195) {
      currentAlerts.push({
        id: "ac_low_vac",
        severity: "warning",
        title: "⚠️ BAJO VOLTAJE DE RED AC"
      });
    } else if (vac > 250) {
      currentAlerts.push({
        id: "ac_high_vac",
        severity: "critical",
        title: "🚨 SOBREVOLTAJE EN RED AC"
      });
    }

    if (batterySOC <= 30) {
      currentAlerts.push({
        id: "bat_critical",
        severity: "critical",
        title: `🔴 BATERÍA CRÍTICA (${batterySOC}%)`
      });
    } else if (batterySOC <= 60) {
      currentAlerts.push({
        id: "bat_low",
        severity: "warning",
        title: `🟠 BATERÍA BAJA (${batterySOC}%)`
      });
    }

    const stateFilePath = path.join(process.cwd(), "growatt_state.json");
    try {
      if (fs.existsSync(stateFilePath)) {
        const fileState = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
        if (fileState) {
          if (Array.isArray(fileState.notifiedAlerts)) globalNotifiedAlerts = fileState.notifiedAlerts;
          if (fileState.acOutageStartTime !== undefined) acOutageStartTime = fileState.acOutageStartTime;
        }
      }
    } catch (e) {}

    // Process alerts dispatch
    const plantName = escapeHtml(telemetryData.plantName);
    const newNotified = [...globalNotifiedAlerts];

    // 1. Send New Alerts
    for (const alert of currentAlerts) {
      if (!globalNotifiedAlerts.includes(alert.id)) {
        let msg = "";
        if (alert.id === "ac_outage") {
          acOutageStartTime = Date.now();
          msg = `🚨 <b>CORTE DE LUZ – ${plantName}</b>\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `• Red Comercial: Sin suministro (0 V)\n` +
                `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
                `• Consumo Casa: ${Math.round(houseLoad)} W\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `Respaldo por batería activo.`;
        } else if (alert.id === "bat_critical") {
          msg = `🔴 <b>BATERÍA CRÍTICA (${batterySOC}%) – ${plantName}</b>\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `• Voltaje: ${batteryVoltage} V\n` +
                `• Consumo: ${Math.round(houseLoad)} W\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `¡Alerta! Nivel de batería críticamente bajo.`;
        } else if (alert.id === "bat_low") {
          msg = `🟠 <b>BATERÍA BAJA (${batterySOC}%) – ${plantName}</b>\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `• Voltaje: ${batteryVoltage} V\n` +
                `• Consumo: ${Math.round(houseLoad)} W\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `Se sugiere moderar el consumo.`;
        } else if (alert.id === "ac_low_vac") {
          msg = `⚠️ <b>BAJO VOLTAJE EN RED AC – ${plantName}</b>\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `• Voltaje de Red: ${vac} V (Umbral: &lt;195 V)\n` +
                `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
                `━━━━━━━━━━━━━━━━━━`;
        } else if (alert.id === "ac_high_vac") {
          msg = `🚨 <b>SOBREVOLTAJE EN RED AC – ${plantName}</b>\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `• Voltaje de Red: ${vac} V (Peligro: &gt;250 V)\n` +
                `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
                `━━━━━━━━━━━━━━━━━━`;
        }

        if (msg) {
          await sendTelegramMessage(msg);
          newNotified.push(alert.id);
        }
      }
    }

    // 2. Send Resolved Alerts
    for (const alertId of globalNotifiedAlerts) {
      const stillActive = currentAlerts.some(a => a.id === alertId);
      if (!stillActive) {
        if (alertId === "ac_outage") {
          let durationStr = "menos de 1 min";
          if (acOutageStartTime) {
            const diffMin = Math.round((Date.now() - acOutageStartTime) / 60000);
            durationStr = diffMin >= 60 ? `${Math.floor(diffMin / 60)}h ${diffMin % 60} min` : (diffMin > 0 ? `${diffMin} min` : "menos de 1 min");
            acOutageStartTime = null;
          }
          const restoreMsg = `✅ <b>LUZ RESTABLECIDA – ${plantName}</b>\n` +
                             `━━━━━━━━━━━━━━━━━━\n` +
                             `• Red Comercial: ${vac} V • ${fac} Hz\n` +
                             `• Duración del Corte: ${durationStr}\n` +
                             `• Batería: ${batterySOC}% (${batteryVoltage} V)\n` +
                             `━━━━━━━━━━━━━━━━━━`;
          await sendTelegramMessage(restoreMsg);
        } else if (alertId === "bat_critical") {
          const batMsg = `🔋 <b>BATERÍA SUPERÓ EL LÍMITE CRÍTICO (${batterySOC}%) – ${plantName}</b>\n` +
                         `━━━━━━━━━━━━━━━━━━\n` +
                         `• Voltaje: ${batteryVoltage} V\n` +
                         `• Red Comercial: ${vac} V\n` +
                         `━━━━━━━━━━━━━━━━━━`;
          await sendTelegramMessage(batMsg);
        }

        const idx = newNotified.indexOf(alertId);
        if (idx > -1) newNotified.splice(idx, 1);
      }
    }

    globalNotifiedAlerts = newNotified;
    try {
      fs.writeFileSync(stateFilePath, JSON.stringify({
        notifiedAlerts: newNotified,
        acOutageStartTime: acOutageStartTime
      }, null, 2), "utf8");
    } catch (e) {}

    console.log(`[BackgroundMonitor] Chequeo 24/7 completado con éxito a las ${now.toLocaleTimeString("es-ES")}. Red: ${vac}V, Batería: ${batterySOC}%`);
  } catch (err) {
    console.error("[BackgroundMonitor] Error durante chequeo de telemetría:", err.message);
  }
}

export function startBackgroundMonitoring() {
  if (global.isBackgroundMonitoringActive) {
    return;
  }
  global.isBackgroundMonitoringActive = true;
  console.log("🚀 [BackgroundMonitor] Servicio de monitoreo continuo 24/7 iniciado.");

  // Run immediate first check
  setTimeout(() => {
    runTelemetryCheck().catch(() => {});
  }, 3000);

  // Run recurring loop every 5 minutes (300,000 ms)
  setInterval(() => {
    runTelemetryCheck().catch(() => {});
  }, 300000);
}
