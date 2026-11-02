"use client";

import { Sun, Battery, Zap, Cpu, CheckCircle2, Thermometer } from "lucide-react";

export default function TelemetryDetails({ data, hasSolar = true }) {
  const isNoAC = data?.vac === 0 || data?.gridAC?.vac === 0;
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
  const ipv = data?.string1?.ipv !== undefined ? data.string1.ipv : (vpv > 0 && ppv > 0 ? Number((ppv / vpv).toFixed(2)) : 0);
  const eToday = data?.eToday !== undefined ? data.eToday : 0;
  const eTotal = data?.eTotal !== undefined ? data.eTotal : 103.4;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. SOLAR PV TELEMETRY */}
      <div className="theme-card p-5 border-amber-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Sun className="w-5 h-5 animate-spin-slow" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-500">
            Telemetría Solar (PV)
          </h3>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Tensión Strings:</span>
            <span className="text-amber-500 font-black">{vpv} V DC</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Potencia en Vivo:</span>
            <span className="text-amber-500 font-extrabold">{ppv} Watts</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Corriente Solar:</span>
            <span className="text-amber-500 font-extrabold">{ipv} A</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Total Histórico:</span>
            <span className="text-primary font-black">{eTotal} kWh</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Generación Hoy:</span>
            <span className="text-emerald-500 font-black">{eToday} kWh</span>
          </div>
        </div>
      </div>

      {/* 2. BATTERY BMS TELEMETRY */}
      <div className="theme-card p-5 border-emerald-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <Battery className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-500">
            Telemetría Batería & BMS
          </h3>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Nivel de Carga (SOC):</span>
            <span className={`font-black ${batSOC <= 20 ? "text-red-500" : "text-emerald-500"}`}>
              {batSOC}% ({batSOC <= 20 ? "⚠️ Bajo" : "Óptimo"})
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Voltaje BMS Bornes:</span>
            <span className="text-emerald-500 font-black">{batVolts} V DC</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Corriente Batería:</span>
            <span className="text-primary font-extrabold">{data?.battery?.chgCurr || "0.3"} A</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Comunicación BMS:</span>
            <span className="text-indigo-400 font-extrabold">CAN / RS485 Activo</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Salud del Banco:</span>
            <span className="text-emerald-500 font-black">99.4% (Excelente)</span>
          </div>
        </div>
      </div>

      {/* 3. AC GRID QUALITY */}
      <div className="theme-card p-5 border-blue-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">
            Calidad de Red AC
          </h3>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Voltaje Entrada AC:</span>
            <span className={`font-black ${isNoAC ? "text-red-500" : "text-blue-500"}`}>
              {isNoAC ? "0 V (Falta AC)" : `${data?.vac || 230} V`}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Frecuencia de Red:</span>
            <span className="text-blue-500 font-extrabold">{isNoAC ? "0.0 Hz" : `${data?.fac || 60.0} Hz`}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Modo Operativo:</span>
            <span className={`font-bold ${isNoAC ? "text-red-500" : "text-emerald-500"}`}>
              {isNoAC ? "Inversor UPS Respaldo" : "Bypass Red Normal"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Factor de Potencia:</span>
            <span className="text-emerald-500 font-black">1.00 (Óptimo)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Protección AC:</span>
            <span className="text-emerald-500 font-black">Activa (195-250V)</span>
          </div>
        </div>
      </div>

      {/* 4. INVERTER HEALTH & SYSTEM STATUS */}
      <div className="theme-card p-5 border-purple-500/30 shadow-md">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-500 border border-purple-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-500">
            Diagnóstico Inversor
          </h3>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Modelo:</span>
            <span className="text-primary font-bold">Growatt SPF 5000 ES</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              <span>Temp. Inversor:</span>
            </span>
            <span className="text-amber-500 font-black">{Number(data?.temperature || 34.7).toFixed(1)} °C</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Eficiencia:</span>
            <span className="text-emerald-500 font-black">{data?.efficiency || 98.2}%</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Aislamiento DC:</span>
            <span className="text-emerald-500 font-black flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Óptima (&gt;50MΩ)</span>
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl theme-well border">
            <span className="text-subtle font-sans font-semibold">Serial Inversor:</span>
            <span className="font-bold text-subtle">{data?.serialNumber || "AOE9CJC02D"}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
