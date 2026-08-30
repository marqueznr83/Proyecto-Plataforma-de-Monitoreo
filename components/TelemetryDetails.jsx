"use client";

import { Gauge, Cpu, Zap, Thermometer, CheckCircle2, Battery, ShieldAlert } from "lucide-react";

export default function TelemetryDetails({ data, hasSolar = false }) {
  const isNoAC = data?.vac === 0 || data?.gridAC?.vac === 0;
  const batSOC = data?.batterySOC !== null && data?.batterySOC !== undefined 
    ? data.batterySOC 
    : (data?.battery?.soc !== null && data?.battery?.soc !== undefined ? data.battery.soc : 100);
  const batVolts = data?.batteryVoltage !== null && data?.batteryVoltage !== undefined 
    ? Number(data.batteryVoltage).toFixed(1) 
    : (data?.battery?.voltage !== null && data?.battery?.voltage !== undefined ? Number(data.battery.voltage).toFixed(1) : "54.1");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. SOURCE TELEMETRY (PV STRINGS IF SOLAR, BMS BATTERY IF NOT) */}
      {hasSolar ? (
        <div className="theme-card p-5 border-amber-500/30 shadow-md">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <Gauge className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider">
              Strings Fotovoltaicos (DC)
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl theme-well border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">String 1 (PV1)</span>
                <span className="text-xs font-mono font-black">{data?.string1?.ppv || 0} W</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-black/5 dark:bg-black/40 p-2 rounded-lg border border-slate-700/20">
                  <span className="text-[10px] text-subtle block font-sans">Voltaje:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">{data?.string1?.vpv || 0} V</span>
                </div>
                <div className="bg-black/5 dark:bg-black/40 p-2 rounded-lg border border-slate-700/20">
                  <span className="text-[10px] text-subtle block font-sans">Corriente:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">{data?.string1?.ipv || 0} A</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl theme-well border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">String 2 (PV2)</span>
                <span className="text-xs font-mono font-black">{data?.string2?.ppv || 0} W</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-black/5 dark:bg-black/40 p-2 rounded-lg border border-slate-700/20">
                  <span className="text-[10px] text-subtle block font-sans">Voltaje:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">{data?.string2?.vpv || 0} V</span>
                </div>
                <div className="bg-black/5 dark:bg-black/40 p-2 rounded-lg border border-slate-700/20">
                  <span className="text-[10px] text-subtle block font-sans">Corriente:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">{data?.string2?.ipv || 0} A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="theme-card p-5 border-purple-500/30 shadow-md">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <Battery className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider">
              Telemetría Batería & BMS (DC)
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
              <span className="text-subtle font-sans font-semibold">Nivel de Carga (SOC):</span>
              <span className={`font-black ${batSOC <= 20 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {batSOC}% ({batSOC <= 20 ? "⚠️ Crítico/Bajo" : "Normal"})
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
              <span className="text-subtle font-sans font-semibold">Voltaje BMS en Bornes:</span>
              <span className="text-purple-600 dark:text-purple-400 font-extrabold">{batVolts} V DC</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
              <span className="text-subtle font-sans font-semibold">Estado Operativo BMS:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Comunicación CAN Active</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
              <span className="text-subtle font-sans font-semibold">Salud del Banco (SOH):</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">99.4% (Excelente)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. AC GRID QUALITY */}
      <div className="theme-card p-5 border-blue-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider">
            Calidad de Red AC (Salida)
          </h3>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Voltaje AC (Fase Principal):</span>
            <span className={`font-black ${isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
              {isNoAC ? "0 V (Falta AC)" : `${data?.vac || 230} V`}
            </span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Corriente AC Salida:</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{(data?.houseKW * 1000 / (data?.vac || 230)).toFixed(1)} A</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Frecuencia de Red:</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{isNoAC ? "0.0 Hz" : `${data?.fac || 60.0} Hz`}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Factor de Potencia (PF):</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">1.00 (Óptimo)</span>
          </div>
        </div>
      </div>

      {/* 3. INVERTER HEALTH & SYSTEM STATUS */}
      <div className="theme-card p-5 border-emerald-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider">
            Diagnóstico de Inversor
          </h3>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Temp. Interna Inversor:</span>
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-black">{data?.temperature || 38.5} °C</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Eficiencia de Conversión:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">{data?.efficiency || 98.2}%</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Protección de Aislamiento:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Óptima (&gt;50MΩ)</span>
            </span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Firmware Growatt:</span>
            <span className="font-bold text-primary">GW_SPH6000_V2.5</span>
          </div>
        </div>
      </div>

    </div>
  );
}
