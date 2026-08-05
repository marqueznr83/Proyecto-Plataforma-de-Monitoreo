"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, X, Bell, BellOff, CheckCircle2 } from "lucide-react";

export default function AlarmSystem({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const activeAlerts = alerts.filter((a) => !dismissed.includes(a.id));

  if (activeAlerts.length === 0) {
    return (
      <div className="theme-card p-3.5 px-5 mb-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
            Sistema Seguro: No hay alarmas de voltaje o batería activas en este momento.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
          Normal
        </span>
      </div>
    );
  }

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-3.5 mb-6">
      
      {/* Alarms Header summary */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${criticalCount > 0 ? "bg-red-500" : "bg-amber-500"}`} />
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${criticalCount > 0 ? "bg-red-500" : "bg-amber-500"}`} />
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
            Alarmas y Alertas Activas ({activeAlerts.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-red-600/20 dark:bg-red-500/25 border border-red-500/50 text-red-700 dark:text-red-300 font-extrabold font-mono text-[11px] animate-pulse shadow-sm">
              🔴 {criticalCount} CRÍTICAS
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 dark:bg-amber-500/25 border border-amber-500/50 text-amber-800 dark:text-amber-300 font-extrabold font-mono text-[11px] shadow-sm">
              🟡 {warningCount} ADVERTENCIA
            </span>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-md theme-well text-subtle hover:opacity-80 transition-colors"
            title={soundEnabled ? "Sonido activado" : "Activar sonido de alarma"}
          >
            {soundEnabled ? <Bell className="w-4 h-4 text-amber-500 animate-bounce" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Alert Cards */}
      {activeAlerts.map((alert) => {
        const isCritical = alert.severity === "critical";

        return (
          <div
            key={alert.id}
            className={`p-4 sm:p-5 rounded-xl border transition-all flex items-start justify-between gap-4 shadow-md ${
              isCritical
                ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-500/70 text-red-950 dark:text-red-100 alarm-critical-pulse"
                : "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/70 text-amber-950 dark:text-amber-100 alarm-warning-pulse"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  isCritical
                    ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                    : "bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400"
                }`}
              >
                {isCritical ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className={`text-sm sm:text-base font-extrabold tracking-wide ${isCritical ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
                    {alert.title}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white border border-slate-700">
                    {alert.code}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isCritical ? "bg-red-600 text-white" : "bg-amber-500 text-slate-950"}`}>
                    {isCritical ? "CRÍTICO (ROJO)" : "ADVERTENCIA (AMARILLO)"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium opacity-90 mt-1.5 leading-relaxed">
                  {alert.message}
                </p>
                <span className="text-[11px] font-mono opacity-70 mt-2 block font-semibold">
                  Hora de activación: {alert.timestamp}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDismissed([...dismissed, alert.id])}
              className="p-1.5 rounded-lg text-subtle hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Descartar aviso temporalmente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

    </div>
  );
}
