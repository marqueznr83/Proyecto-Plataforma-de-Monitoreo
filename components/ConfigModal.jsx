"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Sliders, Zap, BatteryCharging, Sun, Send, Bell, CheckCircle2, AlertCircle } from "lucide-react";

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
  const [lowBat, setLowBat] = useState(alarmConfig?.lowBat || 25);
  const [critBat, setCritBat] = useState(alarmConfig?.critBat || 15);
  const [noAC, setNoAC] = useState(alarmConfig?.noAC || false);
  const [hasSolar, setHasSolar] = useState(alarmConfig?.hasSolar || false);
  const [testBatSOC, setTestBatSOC] = useState(alarmConfig?.testBatSOC ?? 50);

  // Telegram state
  const [tgToken, setTgToken] = useState(telegramConfig?.botToken || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0");
  const [tgChatId, setTgChatId] = useState(telegramConfig?.chatId || "-1004366083322");
  const [testStatus, setTestStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [testErrorMsg, setTestErrorMsg] = useState("");

  // Sync state when modal opens or configurations change
  useEffect(() => {
    if (isOpen) {
      if (alarmConfig) {
        setMinVac(alarmConfig.minVac || 195);
        setMaxVac(alarmConfig.maxVac || 250);
        setLowBat(alarmConfig.lowBat || 25);
        setCritBat(alarmConfig.critBat || 15);
        setNoAC(alarmConfig.noAC || false);
        setHasSolar(alarmConfig.hasSolar || false);
        setTestBatSOC(alarmConfig.testBatSOC ?? 50);
      }
      if (telegramConfig) {
        setTgToken(telegramConfig.botToken || "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0");
        setTgChatId(telegramConfig.chatId || "-1004366083322");
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
      botToken: tgToken,
      chatId: tgChatId
    });
    onClose();
  };

  const handleSendTestMessage = async () => {
    if (!tgToken || !tgChatId) {
      setTestStatus("error");
      setTestErrorMsg("Por favor completa el Bot Token y Chat ID antes de probar.");
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
          botToken: tgToken,
          chatId: tgChatId,
          message: "<b>🔔 MONITOREO GROWATT</b>\n" +
                   "━━━━━━━━━━━━━━━━━━\n" +
                   "<blockquote>¡Mensaje de prueba exitoso!\n\n" +
                   "Tu bot de Telegram está correctamente vinculado al canal de notificaciones de la residencia de <b>Nelson Márquez</b>.</blockquote>\n" +
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
      setTestErrorMsg("Error de conexión local: " + err.message);
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

          {/* 2. Battery SOC & Voltage Thresholds */}
          <div className="p-4.5 rounded-xl theme-well border border-slate-700/40 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Alarmas de Batería (BMS Comunicado)</span>
              </div>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-black bg-purple-500/15 px-2.5 py-1 rounded-md">
                Simulación SOC actual: {testBatSOC}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Batería Baja (Aviso 🟡):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={lowBat}
                    onChange={(e) => setLowBat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono font-extrabold"
                  />
                  <span className="font-bold text-subtle">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-600 dark:text-red-400 mb-1">
                  Batería Crítica (Alarma 🔴):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={critBat}
                    onChange={(e) => setCritBat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-red-500/40 text-red-600 dark:text-red-400 font-mono font-extrabold"
                  />
                  <span className="font-bold text-subtle">%</span>
                </div>
              </div>
            </div>

            {/* Slider for testing battery levels */}
            <div>
              <label className="block text-xs font-extrabold text-subtle mb-1.5">
                Deslizador de Prueba (Mover para probar colores Rojo 🔴 y Amarillo 🟡):
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={testBatSOC}
                onChange={(e) => setTestBatSOC(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-300 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[11px] font-mono font-bold mt-1">
                <span className="text-red-600 dark:text-red-400">≤ 15% (CRÍTICA 🔴)</span>
                <span className="text-amber-600 dark:text-amber-400">16-25% (BAJA 🟡)</span>
                <span className="text-emerald-600 dark:text-emerald-400">&gt; 25% (ÓPTIMO 🟢)</span>
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
