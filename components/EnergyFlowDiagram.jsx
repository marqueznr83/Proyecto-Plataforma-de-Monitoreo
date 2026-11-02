"use client";

import { Sun, Home, Cpu, BatteryCharging, Zap, ShieldAlert } from "lucide-react";

export default function EnergyFlowDiagram({ data, hasSolar = true }) {
  const isOffline = data?.isOffline || false;
  const isNoAC = !isOffline && (data?.vac === 0 || data?.gridAC?.vac === 0);

  const solarWatts = data?.ppv || 0;
  const solarKW = isOffline ? "N/D" : (data?.ppvKW !== undefined ? data.ppvKW : Number((solarWatts / 1000).toFixed(2)));
  const vpv = data?.vpv !== undefined && data?.vpv !== null ? Number(data.vpv).toFixed(1) : "85.5";
  const eTotal = data?.eTotal !== undefined ? data.eTotal : 103.4;
  const eToday = data?.eToday !== undefined ? data.eToday : 0;

  const houseKW = isOffline ? "N/D" : (data?.houseKW !== undefined ? data.houseKW : 0.85);
  const pacKW = isOffline ? "N/D" : (data?.pacKW !== undefined ? data.pacKW : (isNoAC ? houseKW : 0.85));

  const batterySOC = data?.batterySOC !== null && data?.batterySOC !== undefined 
    ? data.batterySOC 
    : (data?.battery?.soc !== null && data?.battery?.soc !== undefined ? data.battery.soc : 100);
  
  const batteryVoltage = data?.batteryVoltage !== null && data?.batteryVoltage !== undefined 
    ? Number(data.batteryVoltage).toFixed(1) 
    : (data?.battery?.voltage !== null && data?.battery?.voltage !== undefined ? Number(data.battery.voltage).toFixed(1) : "54.3");

  const batteryPower = data?.batteryPower !== undefined ? data.batteryPower : (data?.battery?.power || 0);
  const batteryKW = Number((batteryPower / 1000).toFixed(2));

  // Determine battery charge/discharge style
  let batClass = "bg-emerald-500";
  if (batterySOC <= 20) batClass = "bg-red-500 animate-pulse";
  else if (batterySOC <= 30) batClass = "bg-amber-500";

  const isBatCritical = batterySOC <= 20;
  const isBatLow = batterySOC <= 30;

  return (
    <div className="theme-card p-5 md:p-7 shadow-lg relative overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/40 dark:border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-wide">
            Flujo de Conversión Solar & Respaldo
          </h2>
          <p className="text-xs text-subtle font-medium mt-0.5">
            Monitoreo en vivo de Paneles Fotovoltaicos, Inversor Growatt SPF 5000, Red AC y Batería
          </p>
        </div>

        {/* Global Alert Badge */}
        <div className="flex items-center gap-2 text-xs font-mono font-bold">
          {isOffline ? (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-black animate-pulse flex items-center gap-1.5 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>⚠️ MÓDULO WI-FI DESCONECTADO</span>
            </span>
          ) : isNoAC ? (
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/50 font-black animate-pulse flex items-center gap-1.5 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>🔴 MODO RESPALDO (CORTE RED AC)</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Red AC Online ({data?.vac || 230}V)</span>
            </span>
          )}
        </div>
      </div>

      {/* Nodes Flow Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative my-4">
        {/* 1. SOLAR PANELS */}
        <div className="theme-well p-5 flex flex-col items-center text-center border-2 border-amber-500/40 shadow-sm relative group hover:scale-[1.02] transition-transform">
          <div className="p-3.5 rounded-2xl mb-2 bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
            <Sun className="w-8 h-8 animate-spin-slow" />
          </div>
          <span className="text-xs font-extrabold text-subtle uppercase tracking-wider">Paneles Solares</span>
          <div className="text-2xl font-black my-1 font-mono text-amber-500">
            {solarWatts > 0 ? `${solarWatts}` : `${solarKW}`} <span className="text-xs font-bold text-subtle">{solarWatts > 0 ? "W" : "kW"}</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-amber-500 pt-2 border-t border-slate-700/30 w-full">
            ⚡ {vpv} V DC • Total: {eTotal} kWh
          </div>
        </div>

        {/* Flow Line 1: Solar to Inverter */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-mono font-extrabold text-amber-500 mt-1.5">
            DC ({vpv}V) ➔
          </span>
        </div>

        {/* 2. INVERTER */}
        <div className="theme-card p-5 flex flex-col items-center text-center border-2 border-amber-500/60 shadow-xl relative scale-105 z-10">
          <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
            Growatt SPF 5000 ES
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-500 my-2 border border-amber-500/30">
            <Cpu className="w-9 h-9" />
          </div>
          <span className="text-xs font-bold">Conversión y Control</span>
          <div className="text-xl font-extrabold font-mono my-1 text-primary">
            {pacKW} <span className="text-xs font-semibold text-subtle">kW AC</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-semibold pt-2 border-t border-slate-700/30 w-full justify-center text-subtle">
            <span>Temp: <strong className="text-amber-500">{Number(data?.temperature || 34.7).toFixed(1)}°C</strong></span>
            <span>•</span>
            <span className={isNoAC ? "text-red-500 font-extrabold" : "text-emerald-500 font-extrabold"}>
              {isNoAC ? "Batería Respaldo" : "Bypass + Carga"}
            </span>
          </div>
        </div>

        {/* Flow Line 2: Inverter to Home */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
            <div className={`absolute inset-0 rounded-full animate-pulse ${isNoAC ? "bg-amber-500" : "bg-emerald-500"}`} />
          </div>
          <span className={`text-xs font-mono font-extrabold mt-1.5 ${isNoAC ? "text-amber-500" : "text-emerald-500"}`}>
            {isNoAC ? "⚡ UPS ➔" : "AC Out ➔"}
          </span>
        </div>

        {/* 3. HOME LOAD */}
        <div className="theme-well p-5 flex flex-col items-center text-center border-2 border-purple-500/40 shadow-sm relative group hover:scale-[1.02] transition-transform">
          <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 mb-2.5 border border-purple-500/30 shadow-sm">
            <Home className="w-8 h-8" />
          </div>
          <span className="text-xs font-extrabold text-subtle uppercase tracking-wider">Consumo del Hogar</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 my-1 font-mono">
            {houseKW} <span className="text-xs font-bold text-subtle">kW</span>
          </div>
          <div className="text-[11px] font-mono font-extrabold pt-2 border-t border-slate-700/30 w-full text-purple-600 dark:text-purple-400">
            {isNoAC ? "🛡️ Respaldo Solar + Batería" : "🏠 Consumo Normal"}
          </div>
        </div>
      </div>

      {/* Secondary Status & Battery Telemetry Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-700/40 dark:border-slate-800">
        
        {/* RED AC STATUS BOX */}
        <div className={`theme-well p-4 flex items-center justify-between border-2 transition-all shadow-sm ${
          isOffline
            ? "border-amber-500/40"
            : isNoAC
            ? "border-red-500/70 bg-red-500/10 alarm-critical-pulse"
            : "border-blue-500/40"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isOffline
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : isNoAC
                ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                : "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
            }`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-extrabold block">Estado Red AC (Grid In)</span>
              <span className={`text-xs font-bold ${isOffline ? "text-amber-500" : isNoAC ? "text-red-600 dark:text-red-400 animate-pulse" : "text-blue-600 dark:text-blue-400"}`}>
                {isOffline ? "⚠️ CONEXIÓN PERDIDA CON SERVIDOR" : isNoAC ? "🔴 ALARMA: SIN VOLTAJE AC DE ENTRADA" : "🟢 Suministro Eléctrico Estable"}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg sm:text-xl font-mono font-black ${isOffline ? "text-amber-500" : isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
              {isOffline ? "N/D" : isNoAC ? "0 V (Falta AC)" : `${data?.vac || 230} V`}
            </div>
            <span className="text-xs font-mono font-semibold text-subtle block">
              {isOffline ? "Sin Telemetría" : isNoAC ? "Modo Inversor UPS" : `Frecuencia: ${data?.fac || 60} Hz`}
            </span>
          </div>
        </div>

        {/* BATTERY BMS STATUS */}
        <div className={`theme-well p-4 flex items-center justify-between border-2 transition-all shadow-sm ${
          isOffline
            ? "border-amber-500/40"
            : isBatCritical
            ? "border-red-500/80 bg-red-500/15 alarm-critical-pulse"
            : isBatLow
            ? "border-amber-500/80 bg-amber-500/15 alarm-warning-pulse"
            : "border-emerald-500/40"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isOffline
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : isBatCritical
                ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                : isBatLow
                ? "bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            }`}>
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold">Batería Híbrida (BMS)</span>
                {isOffline && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                    SIN CONEXIÓN
                  </span>
                )}
                {isBatCritical && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">
                    ⚠️ ALARMA CRÍTICA (ROJO)
                  </span>
                )}
                {isBatLow && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                    ⚠️ VOLTAJE BAJO (AMARILLO)
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold block mt-0.5 ${
                isOffline ? "text-amber-500" : isBatCritical ? "text-red-600 dark:text-red-400 font-extrabold" : isBatLow ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {isOffline ? "Sin Datos de Carga/Descarga" : batteryKW > 0 ? `⚡ Cargando (+${batteryKW} kW)` : batteryKW < 0 ? `⚡ Descargando (${batteryKW} kW)` : "🔋 Nivel Óptimo (100%)"}
              </span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className={`text-lg sm:text-xl font-mono font-black ${
              isOffline ? "text-amber-500" : isBatCritical ? "text-red-600 dark:text-red-400" : isBatLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {isOffline ? "N/D" : `${batterySOC}%`} {!isOffline && <span className="text-xs font-bold text-subtle">({batteryVoltage}V)</span>}
            </div>
            {!isOffline && (
              <div className="w-28 h-2.5 bg-slate-300 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-slate-400/30 dark:border-slate-700 inline-block">
                <div
                  className={batClass}
                  style={{ width: `${Math.min(100, Math.max(0, batterySOC))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
