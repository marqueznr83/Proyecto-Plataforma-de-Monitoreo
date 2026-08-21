"use client";

import { useState, useEffect, useRef } from "react";
import { Sun, RefreshCw, Settings, Zap, Bell, AlertTriangle, ShieldAlert, CheckCircle2, Trash2, Send } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar({ data, onRefresh, isRefreshing, onOpenSettings }) {
  const [countdown, setCountdown] = useState(300);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset dismissed alert list if the backend reports no alerts (so future alarms of the same type can trigger again)
  const alerts = data?.alerts || [];
  useEffect(() => {
    if (alerts.length === 0) {
      setDismissedAlerts([]);
    }
  }, [alerts]);

  const handleManualRefresh = () => {
    setCountdown(300);
    onRefresh();
  };

  const handleDismissAlert = (id) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  const handleClearAllAlerts = () => {
    setDismissedAlerts(alerts.map((a) => a.id));
  };

  // Filter visible alerts (excluding those manually dismissed by user)
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  const hasCritical = visibleAlerts.some((a) => a.severity === "critical");
  const hasWarning = visibleAlerts.some((a) => a.severity === "warning");

  // Status Colors (Green = Online, Red = Critical Alarm, Yellow = Warning)
  let badgeStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
  let pulseDot = "bg-emerald-500";
  if (hasCritical) {
    badgeStyle = "bg-red-500/20 border-red-500/60 text-red-600 dark:text-red-300 font-bold animate-pulse";
    pulseDot = "bg-red-500";
  } else if (hasWarning) {
    badgeStyle = "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300 font-bold";
    pulseDot = "bg-amber-500";
  }

  const hasSolar = data?.hasSolar ?? false;

  return (
    <header className="sticky top-0 z-40 w-full theme-nav px-4 lg:px-8 py-3 transition-all border-b border-slate-700/20 dark:border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Brand & Plant Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-sm">
              {hasSolar ? (
                <Sun className="w-6 h-6 animate-spin-slow text-amber-500" />
              ) : (
                <Zap className="w-6 h-6 text-amber-500" />
              )}
              <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${pulseDot} animate-ping`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-wide">
                  {data?.plantName || "Residencial Sr. Nelson"}
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-extrabold">
                  GROWATT
                </span>
                {!hasSolar && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-subtle border border-slate-700/20 font-bold">
                    Respaldo / UPS (Sin Paneles)
                  </span>
                )}
              </div>
              <p className="text-xs text-subtle flex items-center gap-1.5 mt-0.5">
                <span>{data?.inverterModel || "Growatt Inverter UPS"}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">SN: {data?.serialNumber || "AOE9CJC058"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs shadow-sm ${badgeStyle}`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseDot} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pulseDot}`} />
            </span>
            <span className="font-extrabold tracking-wider">{visibleAlerts.length > 0 ? (hasCritical ? "CRÍTICO (ROJO)" : "ADVERTENCIA (AMARILLO)") : "ONLINE"}</span>
            <span className="text-[11px] opacity-90 hidden md:inline">
              ({visibleAlerts.length > 0 ? `${visibleAlerts.length} alarmas sin leer` : "Operación Óptima"})
            </span>
          </div>

          {/* Bell Notifications Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-2 rounded-lg theme-well hover:opacity-80 transition-all border border-slate-700/20 shadow-sm relative active:scale-95 flex items-center justify-center ${
                visibleAlerts.length > 0
                  ? hasCritical
                    ? "text-red-500 border-red-500/40"
                    : "text-amber-500 border-amber-500/40"
                  : "text-subtle"
              }`}
              title="Notificaciones de Alarma"
            >
              <Bell className={`w-5 h-5 ${visibleAlerts.length > 0 ? "animate-bounce" : ""}`} />
              {visibleAlerts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white animate-pulse shadow-sm">
                  {visibleAlerts.length}
                </span>
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 theme-card border-2 border-slate-700/40 dark:border-slate-800 shadow-2xl rounded-xl p-4.5 z-50 animate-fade-in text-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/30 dark:border-slate-800">
                  <span className="font-extrabold text-sm tracking-wide">Alertas del Sistema</span>
                  <div className="flex items-center gap-2">
                    {visibleAlerts.length > 0 && (
                      <button
                        onClick={handleClearAllAlerts}
                        className="text-[10px] font-extrabold text-red-500 dark:text-red-400 hover:opacity-80 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20"
                        title="Borrar todas las alarmas vistas"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Borrar todas</span>
                      </button>
                    )}
                    <span className="font-mono font-bold text-subtle text-[11px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {visibleAlerts.length} activas
                    </span>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                  {visibleAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Sistema Seguro</span>
                        <span className="text-[11px] text-subtle">No hay alarmas activas o todas han sido marcadas como leídas.</span>
                      </div>
                    </div>
                  ) : (
                    visibleAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border flex flex-col space-y-1.5 shadow-sm text-left relative group ${
                          alert.severity === "critical"
                            ? "bg-red-500/10 border-l-4 border-l-red-600 border-red-500/20"
                            : "bg-amber-500/10 border-l-4 border-l-amber-500 border-amber-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between pr-6">
                          <span className={`font-black text-xs uppercase tracking-wide ${
                            alert.severity === "critical" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {alert.title}
                          </span>
                          <span className="text-[10px] font-mono text-subtle font-bold">
                            {(() => {
                              if (!alert.timestamp) return "";
                              try {
                                if (!alert.timestamp.includes("T")) return alert.timestamp;
                                return new Date(alert.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                              } catch (e) {
                                return alert.timestamp;
                              }
                            })()}
                          </span>
                        </div>
                        
                        {/* Dismiss alert button (Top Right cross) */}
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="absolute top-2 right-2 p-1 text-subtle hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-all text-xs font-bold"
                          title="Borrar alarma vista"
                        >
                          ✕
                        </button>

                        <p className="text-[11px] font-semibold text-primary/90 leading-normal pr-3">
                          {alert.message}
                        </p>
                        <span className="text-[10px] font-mono font-bold text-subtle block pt-1 border-t border-slate-700/10">
                          Código: {alert.code}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Auto Refresh & Counter */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg theme-well hover:opacity-80 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-slate-700/20"
            title="Actualizar datos ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="font-mono text-amber-500 font-extrabold">{countdown}s</span>
          </button>

          {/* Telegram Bot Button */}
          <a
            href="https://t.me/tlgnelson_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0088cc] hover:bg-[#0077b3] text-white transition-all shadow-sm active:scale-95 border border-sky-500/20"
            title="Iniciar o Vincular Bot de Telegram"
          >
            <Send className="w-3.5 h-3.5 -rotate-45" />
            <span>@tlgnelson_bot</span>
          </a>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-sm active:scale-95"
            title="Configuración de Alarmas y Umbrales"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alarmas & Config</span>
          </button>
        </div>

      </div>
    </header>
  );
}
