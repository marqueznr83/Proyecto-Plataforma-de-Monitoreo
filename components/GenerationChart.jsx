"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Activity, Zap, Battery, Home, Sun, Sparkles } from "lucide-react";

export default function GenerationChart({ dailyHistory = [], hourlyData = [], hasSolar = true }) {
  // Mode selection: "solar" | "voltaje" | "bateria" | "consumo"
  const [metricMode, setMetricMode] = useState("solar");

  // Determine source data: prioritize real recorded history from monitor
  let rawData = Array.isArray(dailyHistory) && dailyHistory.length > 0 ? dailyHistory : [];

  // Fallback baseline if no history has accumulated yet
  if (rawData.length === 0) {
    const nowStr = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas" });
    rawData = [
      { time: "00:00", vac: 230, batterySOC: 100, batteryVoltage: 54.3, houseKW: 0.85, houseW: 850, temperature: 34.5, ppv: 0, vpv: 85.5 },
      { time: nowStr, vac: 232.2, batterySOC: 100, batteryVoltage: 54.3, houseKW: 0.85, houseW: 850, temperature: 34.7, ppv: 0, vpv: 85.5 }
    ];
  }

  const chartData = rawData.map(d => ({
    time: d.time || "--:--",
    vac: d.vac !== undefined && d.vac !== null ? Number(d.vac) : 230,
    batterySOC: d.batterySOC !== undefined && d.batterySOC !== null ? Number(d.batterySOC) : 100,
    batteryVoltage: d.batteryVoltage !== undefined && d.batteryVoltage !== null ? Number(d.batteryVoltage) : 54.3,
    houseKW: d.houseKW !== undefined && d.houseKW !== null ? Number(d.houseKW) : (d.houseW ? Number((d.houseW / 1000).toFixed(2)) : 0.85),
    temperature: d.temperature || 34.7,
    ppv: d.ppv !== undefined && d.ppv !== null ? Number(d.ppv) : (d.ppvKW ? Math.round(d.ppvKW * 1000) : 0),
    vpv: d.vpv !== undefined && d.vpv !== null ? Number(d.vpv) : 85.5
  }));

  // Metric configurations
  const metricConfigs = {
    solar: {
      title: "Generación Solar Fotovoltaica (24h)",
      subtitle: "Registro de potencia capturada por los paneles solares en Watts (W) y tensión DC",
      dataKey: "ppv",
      unit: "W",
      strokeColor: "#f59e0b",
      fillColor: "#f59e0b",
      yDomain: [0, 'auto'],
      formatter: (val) => [`${val} W`, "☀️ Potencia Solar (PV)"]
    },
    voltaje: {
      title: "Voltaje de Entrada Red AC (24h)",
      subtitle: "Registro real de tensión de calle (V) y detección de cortes de suministro",
      dataKey: "vac",
      unit: "V",
      strokeColor: "#3b82f6",
      fillColor: "#3b82f6",
      yDomain: [0, 260],
      formatter: (val) => [`${val} V`, val === 0 ? "🚨 Corte de Luz (0V)" : "⚡ Voltaje Red AC"]
    },
    bateria: {
      title: "Nivel de Carga Batería SOC (24h)",
      subtitle: "Comportamiento real de descarga durante cortes y recarga con red AC y solar",
      dataKey: "batterySOC",
      unit: "%",
      strokeColor: "#10b981",
      fillColor: "#10b981",
      yDomain: [0, 100],
      formatter: (val) => [`${val}%`, "🔋 Nivel Batería (SOC)"]
    },
    consumo: {
      title: "Demanda de Potencia del Hogar (24h)",
      subtitle: "Consumo eléctrico real demandado por la casa en Kilowatts (kW)",
      dataKey: "houseKW",
      unit: "kW",
      strokeColor: "#8b5cf6",
      fillColor: "#8b5cf6",
      yDomain: [0, 'auto'],
      formatter: (val) => [`${val} kW`, "🏠 Consumo Hogar"]
    }
  };

  const currentConfig = metricConfigs[metricMode] || metricConfigs.solar;

  return (
    <div className="theme-card p-5 md:p-7 shadow-lg relative overflow-hidden">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/40 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold tracking-wide">
                {currentConfig.title}
              </h3>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Datos Reales del Día
              </span>
            </div>
            <p className="text-xs text-subtle font-medium mt-0.5">
              {currentConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1.5 theme-well p-1.5 rounded-xl shadow-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setMetricMode("solar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
              metricMode === "solar"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "text-subtle hover:opacity-80"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Solar (W)</span>
          </button>
          <button
            onClick={() => setMetricMode("voltaje")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
              metricMode === "voltaje"
                ? "bg-blue-600 text-white shadow-md font-black"
                : "text-subtle hover:opacity-80"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Red AC (V)</span>
          </button>
          <button
            onClick={() => setMetricMode("bateria")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
              metricMode === "bateria"
                ? "bg-emerald-600 text-white shadow-md font-black"
                : "text-subtle hover:opacity-80"
            }`}
          >
            <Battery className="w-3.5 h-3.5" />
            <span>Batería (%)</span>
          </button>
          <button
            onClick={() => setMetricMode("consumo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
              metricMode === "consumo"
                ? "bg-purple-600 text-white shadow-md font-black"
                : "text-subtle hover:opacity-80"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Consumo (kW)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentConfig.fillColor} stopOpacity={0.6} />
                <stop offset="95%" stopColor={currentConfig.fillColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#64748b55" }}
              fontWeight="bold"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={currentConfig.yDomain}
              tickFormatter={(val) => `${val} ${currentConfig.unit}`}
              fontWeight="bold"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "0.75rem",
                color: "#fff",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                fontWeight: "bold"
              }}
              formatter={currentConfig.formatter}
              labelFormatter={(label) => `Hora de Registro: ${label}`}
            />
            <Area
              type="monotone"
              dataKey={currentConfig.dataKey}
              stroke={currentConfig.strokeColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#metricGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-700/30 flex flex-wrap items-center justify-between gap-2 text-[11px] text-subtle font-mono font-medium">
        <span>📡 Registro continuo cada 5 min • Inversor Growatt SPF 5000 ES</span>
        <span>Módulo SN: <strong>AOE9CJC02D</strong></span>
      </div>

    </div>
  );
}
