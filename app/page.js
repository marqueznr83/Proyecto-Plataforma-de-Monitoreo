"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import KPICards from "@/components/KPICards";
import EnergyFlowDiagram from "@/components/EnergyFlowDiagram";
import GenerationChart from "@/components/GenerationChart";
import TelemetryDetails from "@/components/TelemetryDetails";
import ConfigModal from "@/components/ConfigModal";
import { Zap, GitBranch } from "lucide-react";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState("75433vd880684dfp20nav03t8zb10xp1");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Custom Alarm & Inverter Configuration State
  const [alarmConfig, setAlarmConfig] = useState({
    minVac: 195,
    maxVac: 250,
    lowBat: 25,
    critBat: 15,
    noAC: false,
    hasSolar: false, // Inversor sin paneles solares por defecto (según especificación)
    testBatSOC: 50
  });

  // Telegram bot configuration
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0",
    chatId: "5326442"
  });

  // Load Telegram config from localStorage on mount
  useEffect(() => {
    const savedTg = localStorage.getItem("growatt_telegram_config");
    if (savedTg) {
      try {
        setTelegramConfig(JSON.parse(savedTg));
      } catch (e) {
        console.error("Error al cargar la configuración de Telegram", e);
      }
    }
  }, []);

  const handleUpdateTelegramConfig = (newCfg) => {
    setTelegramConfig(newCfg);
    localStorage.setItem("growatt_telegram_config", JSON.stringify(newCfg));
  };

  const fetchTelemetry = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const query = new URLSearchParams({
        token: token,
        demo: isDemoMode,
        hasSolar: alarmConfig.hasSolar,
        noAC: alarmConfig.noAC,
        minVac: alarmConfig.minVac,
        maxVac: alarmConfig.maxVac,
        lowBat: alarmConfig.lowBat,
        critBat: alarmConfig.critBat,
        batSOC: alarmConfig.testBatSOC
      });

      const res = await fetch(`/api/growatt?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Error al obtener la telemetría Growatt:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isDemoMode, alarmConfig]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Helper dictionary to get human-readable titles for resolved alarms
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

  // Helper function to send telegram messages via serverless route proxy
  const sendTelegramNotification = useCallback(async (alert, type) => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) return;

    let text = "";
    if (type === "active") {
      const severityTitle = alert.severity === "critical" ? "🔴 <b>ALERTA CRÍTICA DE INVERSOR</b>" : "⚠️ <b>ADVERTENCIA DE SISTEMA</b>";
      text = `${severityTitle}\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `<blockquote><b>Evento:</b> ${alert.title}\n` +
             `<b>Detalle:</b> ${alert.message}\n` +
             `<b>Código:</b> <code>${alert.code}</code>\n` +
             `<b>Hora:</b> ${alert.timestamp || new Date().toLocaleTimeString("es-ES")}</blockquote>\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `🔌 <i>Monitoreo Residencial Nelson Márquez</i>`;
    } else if (type === "resolved") {
      text = `🟢 <b>SISTEMA RESTABLECIDO</b>\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `<blockquote><b>Solucionado:</b> ${alert.title}\n` +
             `<b>Estado:</b> Operación normal y segura.\n` +
             `<b>Hora:</b> ${new Date().toLocaleTimeString("es-ES")}</blockquote>\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `🔌 <i>Monitoreo Residencial Nelson Márquez</i>`;
    }

    try {
      await fetch("/api/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          message: text
        })
      });
    } catch (err) {
      console.error("Fallo al enviar notificación a Telegram:", err);
    }
  }, [telegramConfig]);

  // Notifications logic with localStorage anti-spam filter
  useEffect(() => {
    if (!data || !data.alerts || !telegramConfig.botToken || !telegramConfig.chatId) return;

    const currentAlerts = data.alerts;
    
    let notifiedAlertIds = [];
    try {
      const savedNotified = localStorage.getItem("growatt_notified_alerts");
      if (savedNotified) {
        notifiedAlertIds = JSON.parse(savedNotified);
      }
    } catch (e) {
      console.error("Fallo al parsear alertas notificadas", e);
    }

    const newNotifiedIds = [...notifiedAlertIds];
    let hasChanges = false;

    // 1. Notify NEW alarms
    currentAlerts.forEach((alert) => {
      // Skip the simulated connection banner
      if (alert.id === "api_connection_warning") return;

      if (!notifiedAlertIds.includes(alert.id)) {
        sendTelegramNotification(alert, "active");
        newNotifiedIds.push(alert.id);
        hasChanges = true;
      }
    });

    // 2. Notify RESOLVED alarms (when they are no longer in the active list)
    notifiedAlertIds.forEach((alertId) => {
      const isStillActive = currentAlerts.some((a) => a.id === alertId);
      if (!isStillActive) {
        const title = getAlertTitleById(alertId);
        sendTelegramNotification({ id: alertId, title }, "resolved");
        
        const index = newNotifiedIds.indexOf(alertId);
        if (index > -1) {
          newNotifiedIds.splice(index, 1);
        }
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem("growatt_notified_alerts", JSON.stringify(newNotifiedIds));
    }
  }, [data?.alerts, telegramConfig, sendTelegramNotification]);

  return (
    <div className="min-h-screen flex flex-col selection:bg-amber-500 selection:text-black">
      
      {/* Top Navbar */}
      <Navbar
        data={data}
        onRefresh={fetchTelemetry}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsConfigOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Loading Skeleton */}
        {loading && !data ? (
          <div className="space-y-6 animate-pulse py-12">
            <div className="h-20 theme-card rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="h-28 theme-card rounded-xl" />
              <div className="h-28 theme-card rounded-xl" />
              <div className="h-28 theme-card rounded-xl" />
              <div className="h-28 theme-card rounded-xl" />
            </div>
            <div className="h-80 theme-card rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Top KPI Summary Cards (dynamically switches between UPS mode and Solar mode) */}
            <KPICards data={data} hasSolar={alarmConfig.hasSolar} />

            {/* Interactive Energy Flow Diagram (clean 3-node UPS view when no solar) */}
            <EnergyFlowDiagram data={data} hasSolar={alarmConfig.hasSolar} />

            {/* Historical Charts (Home Load & Battery trends in UPS mode) */}
            <GenerationChart hourlyData={data?.hourlyData || []} hasSolar={alarmConfig.hasSolar} />

            {/* Telemetry Diagnostics (Inverter AC, Battery BMS & Grid metrics) */}
            <TelemetryDetails data={data} hasSolar={alarmConfig.hasSolar} />
          </>
        )}

      </main>

      {/* Settings & Alarms Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        alarmConfig={alarmConfig}
        onUpdateAlarmConfig={(newCfg) => setAlarmConfig(newCfg)}
        telegramConfig={telegramConfig}
        onUpdateTelegramConfig={handleUpdateTelegramConfig}
      />

      {/* Footer */}
      <footer className="theme-footer py-6 px-4 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-subtle">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-500 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-primary">
              Monitoreo Inversor Growatt • Sr. Nelson
            </span>
            <span>•</span>
            <span>Última actualización: <strong className="text-amber-500 font-mono">{data?.lastUpdated || "--:--"}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="hover:text-amber-500 transition-colors flex items-center gap-1 font-medium"
            >
              <GitBranch className="w-4 h-4" />
              <span>Configurar Alarmas & Sistema</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
