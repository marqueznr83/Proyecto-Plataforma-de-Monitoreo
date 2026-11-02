"use client";

import { Sun, Calendar, TrendingUp, Leaf, Zap, Battery, Home, Cpu, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function KPICards({ data, hasSolar = true }) {
  const isOffline = data?.isOffline || false;
  const isNoAC = !isOffline && (data?.vac === 0 || data?.gridAC?.vac === 0);
  const batSOC = data?.batterySOC !== null && data?.batterySOC !== undefined 
    ? data.batterySOC 
    : (data?.battery?.soc !== null && data?.battery?.soc !== undefined ? data.battery.soc : 100);
  
  const batVolts = data?.batteryVoltage !== null && data?.batteryVoltage !== undefined 
    ? Number(data.batteryVoltage).toFixed(1) 
    : (data?.battery?.voltage !== null && data?.battery?.voltage !== undefined ? Number(data.battery.voltage).toFixed(1) : "54.3");

  const vpv = data?.vpv !== undefined && data?.vpv !== null 
    ? Number(data.vpv).toFixed(1) 
    : (data?.string1?.vpv !== undefined ? Number(data.string1.vpv).toFixed(1) : "85.5");

  const ppv = data?.ppv !== undefined && data?.ppv !== null ? data.ppv : 0;
  const ppvKW = data?.ppvKW !== undefined && data?.ppvKW !== null ? data.ppvKW : Number((ppv / 1000).toFixed(2));
  const eToday = data?.eToday !== undefined && data?.eToday !== null ? data.eToday : 0;
  const eTotal = data?.eTotal !== undefined && data?.eTotal !== null ? data.eTotal : 103.4;

  const houseKW = data?.houseKW !== undefined ? data.houseKW : 0.85;
  const houseWatts = Math.round(houseKW * 1000);

  // 4 Main KPI Cards combining Solar, AC Grid, Battery and House Load
  const cards = [
    {
      title: "Generación Solar (PV)",
      value: isOffline ? "N/D" : (ppvKW > 0 ? `${ppvKW}` : `${ppv}`),
      unit: isOffline ? "" : (ppvKW > 0 ? "kW" : "W"),
      subtitle: isOffline 
        ? "Sin telemetría solar" 
        : `Tensión: ${vpv} V • Total: ${eTotal} kWh`,
      icon: Sun,
      badgeColor: isOffline
        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
        : "bg-amber-500/20 border-amber-500/50 text-amber-500 font-bold shadow-sm",
      textColor: isOffline ? "text-amber-500" : "text-amber-500",
    },
    {
      title: "Estado Red Eléctrica (AC IN)",
      value: isOffline ? "N/D" : isNoAC ? "CORTE AC" : `${data?.vac || 230}`,
      unit: isOffline ? "" : isNoAC ? "" : "V",
      subtitle: isOffline ? "Módulo fuera de línea" : isNoAC ? "⚠️ Corte de luz activo" : `Frecuencia normal: ${data?.fac || 60} Hz`,
      icon: Zap,
      badgeColor: isOffline
        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
        : isNoAC 
        ? "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-extrabold animate-pulse" 
        : "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold",
      textColor: isOffline ? "text-amber-500" : isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Nivel de Batería (SOC)",
      value: isOffline ? "N/D" : `${batSOC}`,
      unit: isOffline ? "" : "%",
      subtitle: isOffline ? "Sin telemetría en vivo" : `Voltaje BMS: ${batVolts}V (${batSOC < 20 ? "⚠️ Crítico" : "Óptimo"})`,
      icon: Battery,
      badgeColor: isOffline
        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
        : batSOC <= 20 
        ? "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-extrabold animate-pulse"
        : batSOC <= 30
        ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold"
        : "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold",
      textColor: isOffline
        ? "text-amber-500"
        : batSOC <= 20 
        ? "text-red-600 dark:text-red-400" 
        : batSOC <= 30 
        ? "text-amber-600 dark:text-amber-400" 
        : "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Consumo del Hogar en Vivo",
      value: isOffline ? "N/D" : `${houseKW}`,
      unit: isOffline ? "" : "kW",
      subtitle: isOffline ? "Sin datos de potencia" : `Potencia demandada (${houseWatts} W)`,
      icon: Home,
      badgeColor: isOffline
        ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold"
        : "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold",
      textColor: isOffline ? "text-amber-500" : "text-purple-600 dark:text-purple-400",
    }
  ];

  return (
    <div className="space-y-3">
      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="theme-card theme-card-hover p-5 relative group overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-subtle uppercase tracking-wider block mb-1">
                    {card.title}
                  </span>
                  <div className="flex items-baseline gap-1.5 my-1.5">
                    <span className={`${card.textColor} text-2xl lg:text-3xl font-black font-mono tracking-tight`}>
                      {card.value}
                    </span>
                    <span className="text-xs font-extrabold text-subtle">
                      {card.unit}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-subtle mt-1 flex items-center gap-1">
                    {card.subtitle}
                  </p>
                </div>
                
                <div className={`${card.badgeColor} p-3 rounded-xl border shadow-sm shrink-0 transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Solar Panel Telemetry Pill Bar (Shows accumulated stats & environmental impact) */}
      <div className="theme-card px-4 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-extrabold text-amber-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
            Paneles Fotovoltaicos Conectados
          </span>
          <span className="text-subtle font-bold hidden sm:inline">•</span>
          <span className="text-subtle font-mono font-bold hidden sm:inline">
            Tensión Strings: <strong className="text-amber-500 font-extrabold">{vpv} V DC</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-mono text-[11px]">
          <div>
            <span className="text-subtle font-sans font-semibold">Generación Hoy: </span>
            <strong className="text-emerald-500 font-extrabold">{eToday} kWh</strong>
          </div>
          <span className="text-slate-600 dark:text-slate-700">|</span>
          <div>
            <span className="text-subtle font-sans font-semibold">Total Histórico: </span>
            <strong className="text-primary font-black">{eTotal} kWh</strong>
          </div>
          <span className="text-slate-600 dark:text-slate-700 hidden md:inline">|</span>
          <div className="hidden md:block">
            <span className="text-subtle font-sans font-semibold">CO₂ Ahorrado: </span>
            <strong className="text-teal-500 font-extrabold">{data?.co2SavedKg || (Number(eTotal * 0.997).toFixed(1))} kg</strong>
          </div>
          <span className="text-slate-600 dark:text-slate-700 hidden lg:inline">|</span>
          <div className="hidden lg:block">
            <span className="text-subtle font-sans font-semibold">Temp Inversor: </span>
            <strong className="text-amber-500 font-extrabold">{Number(data?.temperature || 34.7).toFixed(1)}°C</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
