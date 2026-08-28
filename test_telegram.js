/**
 * Script de Diagnóstico y Verificación Independiente de Telegram Bot
 * Uso: node test_telegram.js [BOT_TOKEN] [CHAT_ID]
 */

const BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0";
const CHAT_ID = process.argv[3] || process.env.TELEGRAM_CHAT_ID || "8003576551";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function runDiagnostics() {
  console.log("=================================================");
  console.log("🔍 DIAGNÓSTICO DE INTEGRACIÓN DE TELEGRAM BOT");
  console.log("=================================================");
  console.log(`Bot Token: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 4)}`);
  console.log(`Chat ID:   ${CHAT_ID}`);
  console.log("-------------------------------------------------");

  // 1. Validar Token con getMe
  try {
    console.log("1. Verificando credenciales del Bot con Telegram API (getMe)...");
    const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const meJson = await meRes.json();

    if (!meJson.ok) {
      console.error("❌ Error de autenticación del Bot:", meJson);
      return;
    }

    console.log(`✅ Bot autenticado correctamente:`);
    console.log(`   - Nombre: ${meJson.result.first_name}`);
    console.log(`   - Username: @${meJson.result.username}`);
    console.log(`   - ID: ${meJson.result.id}`);
  } catch (err) {
    console.error("❌ Fallo de red al conectar con Telegram:", err.message);
    return;
  }

  // 2. Probar envío de mensajes con caracteres especiales y HTML
  const chatIds = CHAT_ID.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  
  for (const cid of chatIds) {
    console.log(`\n2. Probando envío de alerta formateada a Chat ID: ${cid}...`);
    
    // Mensaje de prueba simulando una alerta real con caracteres especiales (<, >, &, blockquote)
    const outageDuration = "menos de 1 min";
    const voltageComparison = "(190V < 195V)";
    const plantName = escapeHtml("Planta Nelson Márquez");
    
    const testMessage = 
      `🚨 <b>PRUEBA DE ALERTA – ${plantName}</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<blockquote><b>Evento:</b> Diagnóstico de Notificaciones\n` +
      `<b>Detalle:</b> Verificación de envío con símbolos especiales: ${escapeHtml(voltageComparison)}\n` +
      `<b>Duración:</b> ${escapeHtml(outageDuration)}\n` +
      `<b>Hora:</b> ${new Date().toLocaleTimeString("es-ES", { timeZone: "America/Caracas" })}</blockquote>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔌 <i>Monitoreo Growatt Activo</i>`;

    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      let sendRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cid,
          text: testMessage,
          parse_mode: "HTML"
        })
      });

      let sendJson = await sendRes.json();

      // Fallback a texto plano si falla parseo HTML
      if (!sendRes.ok && sendJson?.description && sendJson.description.includes("can't parse entities")) {
        console.warn(`⚠️ Fallo de parseo HTML. Aplicando fallback a texto plano...`);
        const plainText = testMessage.replace(/<[^>]+>/g, "");
        sendRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cid,
            text: plainText
          })
        });
        sendJson = await sendRes.json();
      }

      if (sendRes.ok && sendJson.ok) {
        console.log(`✅ ¡Mensaje enviado exitosamente a ${cid}!`);
        console.log(`   - Message ID: ${sendJson.result.message_id}`);
        console.log(`   - Destinatario: ${sendJson.result.chat.first_name || ""} (${sendJson.result.chat.type})`);
      } else {
        console.error(`❌ Error al enviar mensaje a ${cid}:`, sendJson);
      }
    } catch (sendErr) {
      console.error(`❌ Excepción al enviar mensaje a ${cid}:`, sendErr.message);
    }
  }

  console.log("\n=================================================");
  console.log("🏁 Diagnóstico completado.");
  console.log("=================================================");
}

runDiagnostics();
