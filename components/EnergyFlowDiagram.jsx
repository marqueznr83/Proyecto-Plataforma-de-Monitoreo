"use client";

import { Sun, Cpu, Home, Zap, BatteryCharging, Activity, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

export default function EnergyFlowDiagram({ data, hasSolar = false }) {
  const solarKW = hasSolar ? (data?.ppvKW !== undefined ? data.ppvKW : 0) : 0;
  const pacKW = data?.pacKW !== undefined ? data.pacKW : (data?.houseKW !== undefined ? data.houseKW : 0.85);
  const houseKW = data?.houseKW !== undefined ? data.houseKW : Number(((data?.houseLoad !== undefined ? data.houseLoad : 850) / 1000).toFixed(2));
  const gridKW = Number(((data?.gridPower !== undefined ? data.gridPower : (hasSolar ? 0 : -houseKW * 1000)) / 1000).toFixed(2));
  const batterySOC = data?.battery?.soc !== undefined ? data.battery.soc : (data?.batterySOC || 50);
  const batteryVoltage = data?.battery?.voltage !== undefined ? data.battery.voltage : (data?.batteryVoltage || 48.0);
  const batteryKW = Number(((data?.battery?.power !== undefined ? data.battery.power : (data?.batteryPower || 0)) / 1000).toFixed(2));

  const isNoAC = data?.vac === 0 || data?.gridAC?.vac === 0;
  const isBatCritical = batterySOC <= 15;
  const isBatLow = batterySOC > 15 && batterySOC <= 25;

  return (
    <div className="theme-card p-5 md:p-7 relative overflow-hidden shadow-lg">
      
      {/* Header title */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3.5 border-b border-slate-700/40 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-wide">
              {hasSolar ? "Flujo de Conversión Solar & Respaldo" : "Flujo Energético del Sistema UPS / Respaldo"}
            </h2>
            <p className="text-xs text-subtle font-medium">
              {hasSolar ? "Monitoreo en vivo de Paneles, Red, Inversor y Batería" : "Monitoreo en vivo entre Red Eléctrica (AC), Inversor Growatt y Hogar"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 font-mono text-xs">
          {isNoAC ? (
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/50 font-black animate-pulse flex items-center gap-1.5 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>🔴 ALARMA: CORTE AC (MODO RESPALDO)</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Red AC Online ({data?.vac || 230}V)</span>
            </span>
          )}
        </div>
      </div>

      {/* Nodes Flow Layout - Adapted dynamically based on whether panels exist */}
      {hasSolar ? (
        /* --- SOLAR PANELS PRESENT LAYOUT --- */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative my-4">
          {/* 1. SOLAR PANELS */}
          <div className="theme-well p-5 flex flex-col items-center text-center border-amber-500/40 shadow-sm relative group hover:scale-[1.02] transition-transform">
            <div className="p-3 rounded-full mb-2 bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
              <Sun className="w-8 h-8 animate-spin-slow" />
            </div>
            <span className="text-xs font-extrabold text-subtle uppercase tracking-wider">Paneles Solares</span>
            <div className="text-2xl font-black my-1 font-mono text-amber-600 dark:text-amber-400">
              {solarKW} <span className="text-xs font-bold text-subtle">kW</span>
            </div>
            <div className="text-[11px] font-mono font-semibold text-subtle pt-2 border-t border-slate-700/30 w-full">
              PV1: {data?.string1?.ppv || 0}W • PV2: {data?.string2?.ppv || 0}W
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
              {solarKW > 0 && <div className="absolute inset-0 bg-amber-500 rounded-full animate-pulse" />}
            </div>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-1.5">DC ➔</span>
          </div>

          {/* 2. INVERTER */}
          <div className="theme-card p-5 flex flex-col items-center text-center border-2 border-amber-500/60 shadow-xl relative scale-105 z-10">
            <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
              Growatt Inverter
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-500 my-2 border border-amber-500/30">
              <Cpu className="w-9 h-9" />
            </div>
            <span className="text-xs font-bold">Conversión y Control</span>
            <div className="text-xl font-extrabold font-mono my-1 text-amber-600 dark:text-amber-400">
              {pacKW} <span className="text-xs font-semibold text-subtle">kW AC</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold pt-2 border-t border-slate-700/30 w-full justify-center">
              <span>Temp: <strong className="text-amber-600 dark:text-amber-400">{data?.temperature || 38.5}°C</strong></span>
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">AC ➔</span>
          </div>

          {/* 3. HOME LOAD */}
          <div className="theme-well p-5 flex flex-col items-center text-center border-emerald-500/40 shadow-sm relative group hover:scale-[1.02] transition-transform">
            <div className="p-3 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/30 shadow-sm">
              <Home className="w-8 h-8" />
            </div>
            <span className="text-xs font-extrabold text-subtle uppercase tracking-wider">Consumo Hogar</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 my-1 font-mono">
              {houseKW} <span className="text-xs font-bold text-subtle">kW</span>
            </div>
            <div className="text-[11px] font-mono font-semibold text-subtle pt-2 border-t border-slate-700/30 w-full">
              Alimentación Estable
            </div>
          </div>
        </div>
      ) : (
        /* --- NO SOLAR PANELS / UPS BACKUP SYSTEM LAYOUT --- */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative my-4">
          
          {/* 1. GRID INPUT (RED ELÉCTRICA) */}
          <div className={`theme-well p-5 flex flex-col items-center text-center border-2 transition-all ${
            isNoAC ? "border-red-500/80 bg-red-500/10 alarm-critical-pulse" : "border-blue-500/40"
          }`}>
            <div className={`p-3.5 rounded-2xl mb-2.5 border shadow-sm ${
              isNoAC ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50" : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40"
            }`}>
              <Zap className="w-8 h-8" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-subtle">
              Entrada Red Eléctrica
            </span>
            <div className={`text-2xl font-black my-1 font-mono ${isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
              {isNoAC ? "0 V" : `${data?.vac || 230} V`} <span className="text-xs font-bold text-subtle">{isNoAC ? "(CORTE AC)" : `• ${data?.fac || 60}Hz`}</span>
            </div>
            <div className={`text-[11px] font-mono font-bold pt-2 border-t border-slate-700/30 w-full ${isNoAC ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {isNoAC ? "🔴 SIN SUBMINISTRO AC (ALERTA)" : "⚡ Subministro AC Activo"}
            </div>
          </div>

          {/* Flow Line 1: Grid to Inverter */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
              {!isNoAC && <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse" />}
            </div>
            <span className="text-xs font-mono font-extrabold mt-1.5 text-blue-600 dark:text-blue-400">
              {isNoAC ? "❌ Interrumpido" : `AC ➔ ${Math.abs(gridKW)} kW`}
            </span>
          </div>

          {/* 2. GROWATT INVERTER (CENTER NODE) */}
          <div className={`theme-card p-5 flex flex-col items-center text-center border-2 shadow-2xl relative scale-105 z-10 ${
            isNoAC ? "border-amber-500 bg-amber-500/5" : "border-amber-500/60"
          }`}>
            <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
              Growatt Inverter UPS
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/15 text-amber-500 my-2 border border-amber-500/40">
              <Cpu className="w-9 h-9" />
            </div>
            <span className="text-xs font-extrabold uppercase text-subtle">Gestor Híbrido / Respaldo</span>
            <div className="text-xl font-extrabold font-mono my-1 text-amber-600 dark:text-amber-400">
              {pacKW} <span className="text-xs font-bold text-subtle">kW SALIDA AC</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono font-semibold pt-2 border-t border-slate-700/30 w-full text-subtle">
              <span>Temp: <strong className="text-amber-600 dark:text-amber-400">{data?.temperature || 38.5}°C</strong></span>
              <span>•</span>
              <span>Modo: <strong className={isNoAC ? "text-red-500 font-extrabold" : "text-emerald-500 font-extrabold"}>{isNoAC ? "Batería Respaldo" : "Red AC Normal"}</strong></span>
            </div>
          </div>

          {/* Flow Line 2: Inverter to Home */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full relative overflow-hidden">
              <div className={`absolute inset-0 rounded-full animate-pulse ${isNoAC ? "bg-amber-500" : "bg-emerald-500"}`} />
            </div>
            <span className={`text-xs font-mono font-extrabold mt-1.5 ${isNoAC ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {isNoAC ? "⚡ UPS ➔" : "AC Out ➔"}
            </span>
          </div>

          {/* 3. HOUSE CONSUMPTION LOAD */}
          <div className="theme-well p-5 flex flex-col items-center text-center border-2 border-purple-500/40 shadow-sm relative group hover:scale-[1.02] transition-transform">
            <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 mb-2.5 border border-purple-500/30 shadow-sm">
              <Home className="w-8 h-8" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-subtle">Consumo del Hogar</span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 my-1 font-mono">
              {houseKW} <span className="text-xs font-bold text-subtle">kW</span>
            </div>
            <div className="text-[11px] font-mono font-extrabold pt-2 border-t border-slate-700/30 w-full text-purple-600 dark:text-purple-400">
              {isNoAC ? "🛡️ Respaldo Ininterrumpido" : "🏠 Consumo Normal"}
            </div>
          </div>

        </div>
      )}

      {/* Secondary Status & Battery Telemetry Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-700/40 dark:border-slate-800">
        
        {/* RED AC STATUS BOX */}
        <div className={`theme-well p-4 flex items-center justify-between border-2 transition-all shadow-sm ${
          isNoAC
            ? "border-red-500/70 bg-red-500/10 alarm-critical-pulse"
            : "border-blue-500/40"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isNoAC
                ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                : "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
            }`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-extrabold block">Estado Red AC (Grid In)</span>
              <span className={`text-xs font-bold ${isNoAC ? "text-red-600 dark:text-red-400 animate-pulse" : "text-blue-600 dark:text-blue-400"}`}>
                {isNoAC ? "🔴 ALARMA: SIN VOLTAJE AC DE ENTRADA" : "🟢 Subministro Eléctrico Estable"}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg sm:text-xl font-mono font-black ${isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
              {isNoAC ? "0 V (Falta AC)" : `${data?.vac || 230} V`}
            </div>
            <span className="text-xs font-mono font-semibold text-subtle block">
              {isNoAC ? "Modo Inversor UPS" : `Frecuencia: ${data?.fac || 60} Hz`}
            </span>
          </div>
        </div>

        {/* BATTERY BMS STATUS WITH CRITICAL & LOW ALARM HIGHLIGHTS */}
        <div className={`theme-well p-4 flex items-center justify-between border-2 transition-all shadow-sm ${
          isBatCritical
            ? "border-red-500/80 bg-red-500/15 alarm-critical-pulse"
            : isBatLow
            ? "border-amber-500/80 bg-amber-500/15 alarm-warning-pulse"
            : "border-emerald-500/40"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isBatCritical
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
                isBatCritical ? "text-red-600 dark:text-red-400 font-extrabold" : isBatLow ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {batteryKW > 0 ? `⚡ Cargando (+${batteryKW} kW)` : batteryKW < 0 ? `⚡ Descargando (${batteryKW} kW)` : "🔋 Nivel Óptimo en Reposo"}
              </span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className={`text-lg sm:text-xl font-mono font-black ${
              isBatCritical ? "text-red-600 dark:text-red-400" : isBatLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {batterySOC}% <span className="text-xs font-bold text-subtle">({batteryVoltage}V)</span>
            </div>
            <div className="w-28 h-2.5 bg-slate-300 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-slate-400/30 dark:border-slate-700 inline-block">
              <div
                className={`h-full rounded-full transition-all ${
                  isBatCritical
                    ? "bg-red-600 animate-pulse"
                    : isBatLow
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, batterySOC))}%` }}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
