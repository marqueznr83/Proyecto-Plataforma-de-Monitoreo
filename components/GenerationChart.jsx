"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { BarChart3, TrendingUp, Sun, Calendar, Zap, Home, Battery } from "lucide-react";

export default function GenerationChart({ hourlyData = [], hasSolar = false }) {
  const [viewMode, setViewMode] = useState("diaria"); // "diaria" | "mensual"

  // Generate realistic consumption/backup data when hasSolar is false
  const chartData = hourlyData.map(d => ({
    ...d,
    consumoKW: Number((d.potenciaKW || 0.85 + (Math.random() * 0.4 - 0.2)).toFixed(2)),
    bateriaSOC: Math.min(100, Math.max(15, Math.round(95 - (d.time ? parseInt(d.time.split(":")[0]) * 1.8 : 0))))
  }));

  const monthlyData = [
    { name: "Ene", kwh: 310 },
    { name: "Feb", kwh: 295 },
    { name: "Mar", kwh: 340 },
    { name: "Abr", kwh: 320 },
    { name: "May", kwh: 380 },
    { name: "Jun", kwh: 410 },
    { name: "Jul", kwh: 430 },
    { name: "Ago", kwh: 390 },
    { name: "Sep", kwh: 350 },
    { name: "Oct", kwh: 330 },
    { name: "Nov", kwh: 300 },
    { name: "Dic", kwh: 360 }
  ];

  return (
    <div className="theme-card p-5 md:p-7 shadow-lg relative overflow-hidden">
      
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/40 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-wide">
              {viewMode === "diaria" 
                ? (hasSolar ? "Curva de Generación Solar (24h)" : "Curva de Consumo Eléctrico (24h)") 
                : (hasSolar ? "Histórico Mensual de Generación" : "Historial Mensual de Consumo Eléctrico")}
            </h3>
            <p className="text-xs text-subtle font-medium">
              {viewMode === "diaria"
                ? (hasSolar ? "Potencia solar generada por horas (kW)" : "Demanda de potencia del hogar en Kilowatts (kW) durante el día")
                : (hasSolar ? "Total de Kilowatts-hora (kWh) generados por mes" : "Consumo mensual acumulado del inmueble en Kilowatts-hora (kWh)")}
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 theme-well p-1.5 rounded-xl shadow-sm">
          <button
            onClick={() => setViewMode("diaria")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              viewMode === "diaria"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-subtle hover:opacity-80"
            }`}
          >
            {hasSolar ? <Sun className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
            <span>Hoy ({hasSolar ? "Generación" : "Consumo"})</span>
          </button>
          <button
            onClick={() => setViewMode("mensual")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              viewMode === "mensual"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-subtle hover:opacity-80"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Histórico Mensual</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "diaria" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={hasSolar ? "#f59e0b" : "#8b5cf6"} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={hasSolar ? "#f59e0b" : "#8b5cf6"} stopOpacity={0.05} />
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
                tickFormatter={(val) => `${val} kW`}
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
                formatter={(value) => [`${value} kW`, hasSolar ? "Potencia Solar" : "Consumo Hogar"]}
                labelFormatter={(label) => `Hora del día: ${label}`}
              />
              <Area
                type="monotone"
                dataKey={hasSolar ? "potenciaKW" : "consumoKW"}
                stroke={hasSolar ? "#f59e0b" : "#8b5cf6"}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#primaryGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" vertical={false} />
              <XAxis
                dataKey="name"
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
                tickFormatter={(val) => `${val} kWh`}
                fontWeight="bold"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  color: "#fff",
                  fontWeight: "bold"
                }}
                formatter={(value) => [`${value} kWh`, hasSolar ? "Producción Solar" : "Consumo Acumulado"]}
              />
              <Bar dataKey="kwh" fill={hasSolar ? "#3b82f6" : "#6366f1"} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
}
