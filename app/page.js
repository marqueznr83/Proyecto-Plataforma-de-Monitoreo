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
    lowBat: 60,
    critBat: 30,
    noAC: false,
    hasSolar: false, // Inversor sin paneles solares por defecto (según especificación)
    testBatSOC: 50
  });

  // Telegram bot configuration
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: "8897443534:AAFrSoP7kbLJ3FBpoiblRhp9qgZC7I53N_0",
    chatId: "201650052"
  });

  // Load Telegram config from localStorage on mount
  useEffect(() => {
    const savedTg = localStorage.getItem("growatt_telegram_config");
    if (savedTg) {
      try {
        const parsed = JSON.parse(savedTg);
        // Replace outdated invalid default chat ID if present
        if (parsed.chatId === "-1004366083322") {
          parsed.chatId = "201650052";
        }
        setTelegramConfig(parsed);
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

      if (telegramConfig.botToken) {
        query.append("tgToken", telegramConfig.botToken);
      }
      if (telegramConfig.chatId) {
        query.append("tgChatId", telegramConfig.chatId);
      }

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
  }, [token, isDemoMode, alarmConfig, telegramConfig]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Helper to format UTC ISO string to local user time
  const formatLocalTime = (isoString) => {
    if (!isoString) return "--:--";
    try {
      if (!isoString.includes("T")) return isoString;
      const d = new Date(isoString);
      return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

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
            <span>Última actualización: <strong className="text-amber-500 font-mono">{formatLocalTime(data?.lastUpdated)}</strong></span>
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
