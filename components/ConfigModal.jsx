"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Zap, BatteryCharging, Sun, Send, Bell, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";

export default function ConfigModal({
  isOpen,
  onClose,
  alarmConfig,
  onUpdateAlarmConfig,
  telegramConfig,
  onUpdateTelegramConfig
}) {
  // Alarm threshold state
  const [minVac, setMinVac] = useState(alarmConfig?.minVac || 195);
  const [maxVac, setMaxVac] = useState(alarmConfig?.maxVac || 250);
  const [lowBat, setLowBat] = useState(alarmConfig?.lowBat || 60);
  const [critBat, setCritBat] = useState(alarmConfig?.critBat || 30);
  const [noAC, setNoAC] = useState(alarmConfig?.noAC || false);
  const [hasSolar, setHasSolar] = useState(alarmConfig?.hasSolar || false);
  const [testBatSOC, setTestBatSOC] = useState(alarmConfig?.testBatSOC ?? 50);

  // Telegram state
  const [tgToken, setTgToken] = useState(telegramConfig?.botToken || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0");
  const [tgChatId, setTgChatId] = useState(telegramConfig?.chatId || "201650052");
  const [testStatus, setTestStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [testErrorMsg, setTestErrorMsg] = useState("");

  // Sync state when modal opens or configurations change
  useEffect(() => {
    if (isOpen) {
      if (alarmConfig) {
        setMinVac(alarmConfig.minVac || 195);
        setMaxVac(alarmConfig.maxVac || 250);
        setLowBat(alarmConfig.lowBat || 60);
        setCritBat(alarmConfig.critBat || 30);
        setNoAC(alarmConfig.noAC || false);
        setHasSolar(alarmConfig.hasSolar || false);
        setTestBatSOC(alarmConfig.testBatSOC ?? 50);
      }
      if (telegramConfig) {
        setTgToken(telegramConfig.botToken || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0");
        setTgChatId(telegramConfig.chatId || "201650052");
      }
      setTestStatus(null);
      setTestErrorMsg("");
    }
  }, [isOpen, alarmConfig, telegramConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateAlarmConfig({
      minVac,
      maxVac,
      lowBat,
      critBat,
      noAC,
      hasSolar,
      testBatSOC
    });
    onUpdateTelegramConfig({
      botToken: tgToken.trim(),
      chatId: tgChatId.trim()
    });
    onClose();
  };

  const handleSendTestMessage = async () => {
    if (!tgToken.trim()) {
      setTestStatus("error");
      setTestErrorMsg("Por favor verifica el Bot Token antes de probar.");
      return;
    }

    setTestStatus("loading");
    setTestErrorMsg("");

    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          botToken: tgToken.trim(),
          chatId: tgChatId && tgChatId.trim() ? tgChatId.trim() : undefined,
          message: "<b>🔔 MONITOREO GROWATT</b>\n" +
                   "━━━━━━━━━━━━━━━━━━\n" +
                   "<blockquote>¡Mensaje de prueba exitoso!\n\n" +
                   "Tu bot de Telegram está activo y las notificaciones automáticas están funcionando para la residencia de <b>Nelson Márquez</b>.</blockquote>\n" +
                   "━━━━━━━━━━━━━━━━━━\n" +
                   "🔌 <i>Monitoreo Residencial Nelson Márquez</i>"
        })
      });

      const json = await res.json();
      if (json.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestErrorMsg(json.error || "Error al conectar con Telegram.");
      }
    } catch (err) {
      setTestStatus("error");
      setTestErrorMsg("Error de conexión: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="theme-card w-full max-w-xl border-2 border-amber-500/50 overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/40 dark:border-slate-800 theme-nav">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide">Configuración y Umbrales de Alarmas</h3>
              <p className="text-xs text-subtle font-semibold">Personaliza límites de voltaje AC, batería BMS y notificaciones de Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-subtle hover:opacity-80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-5">
          
          {/* 1. Red AC Input & Outage Alarm */}
          <div className="p-4.5 rounded-xl theme-well border border-slate-700/40 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Alarma de Corte de Red AC</span>
              </div>
              <button
                type="button"
                onClick={() => setNoAC(!noAC)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black font-mono transition-all shadow-sm ${
                  noAC
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {noAC ? "🔴 SIMULANDO CORTE AC (0V - ALARMA RED)" : "🟢 ENTRADA AC NORMAL (230V)"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Voltaje Mínimo AC (Aviso 🟡):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={minVac}
                    onChange={(e) => setMinVac(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-amber-600 dark:text-amber-400"
                  />
                  <span className="font-bold text-subtle">V</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-600 dark:text-red-400 mb-1">
                  Voltaje Máximo AC (Crítico 🔴):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={maxVac}
                    onChange={(e) => setMaxVac(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-red-600 dark:text-red-400"
                  />
                  <span className="font-bold text-subtle">V</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Umbrales de Batería BMS */}
          <div className="p-4.5 rounded-xl theme-well border border-slate-700/40 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Umbrales de Batería (SOC %)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Batería Baja (Aviso 🟡):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lowBat}
                    onChange={(e) => setLowBat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-amber-600 dark:text-amber-400"
                  />
                  <span className="font-bold text-subtle">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-600 dark:text-red-400 mb-1">
                  Batería Crítica (Crítico 🔴):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={critBat}
                    onChange={(e) => setCritBat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold text-red-600 dark:text-red-400"
                  />
                  <span className="font-bold text-subtle">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Configuración de Telegram Bot */}
          <div className="p-4.5 rounded-xl theme-well border border-sky-500/30 dark:border-sky-500/20 space-y-3.5 shadow-sm bg-sky-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">Notificaciones de Telegram (Automáticas)</span>
              </div>
              <a
                href="https://t.me/tlgnelson_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-1 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20"
              >
                <span>Abrir @tlgnelson_bot</span>
              </a>
            </div>

            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
              <p className="font-semibold">
                ✨ <b>Suscripción abierta y automática:</b> Cualquier persona o grupo que abra el bot en Telegram y presione <b>Iniciar (/start)</b> o le envíe un mensaje, quedará <b>suscrito automáticamente</b> para recibir las alertas en tiempo real sin necesidad de autorizaciones o IDs manuales.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-subtle mb-1">
                  Telegram Bot Token:
                </label>
                <input
                  type="text"
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0"
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-subtle mb-1">
                  Chat ID específico (Opcional - dejar en blanco para difundir a todos los suscritos):
                </label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="Dejar vacío para enviar a todos los registrados"
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                />
                <span className="text-[10px] text-subtle block mt-1">
                  Si se deja vacío, las alertas se enviarán automáticamente a todos los usuarios que hayan iniciado el bot.
                </span>
              </div>

              {/* Interactive Test Button & Status */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={testStatus === "loading"}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  {testStatus === "loading" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 -rotate-45" />
                  )}
                  <span>{testStatus === "loading" ? "Enviando prueba..." : "Enviar Notificación de Prueba"}</span>
                </button>

                {testStatus === "success" && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Mensaje de prueba enviado con éxito!</span>
                  </div>
                )}
                {testStatus === "error" && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-xs">{testErrorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Paneles Solares Toggle */}
          <div className="p-4 rounded-xl theme-well border border-slate-700/40 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-extrabold">Configuración de Paneles Solares</span>
              </div>
              <span className="text-xs text-subtle font-semibold mt-0.5 block">
                {hasSolar
                  ? "Paneles solares habilitados en el diagrama."
                  : "Modo UPS / Sistema Híbrido Respaldo (Sin paneles solares conectados al inversor)."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasSolar(!hasSolar)}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono transition-all shrink-0 shadow-sm ${
                hasSolar
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
              }`}
            >
              {hasSolar ? "PANELES ACTIVOS" : "SIN PANELES (0 kW)"}
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-700/40 dark:border-slate-800 theme-nav flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-subtle hover:opacity-80 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            Aplicar y Confirmar Cambios
          </button>
        </div>

      </div>
    </div>
  );
}

