"use client";

import { Sun, Calendar, TrendingUp, Leaf, Zap, Battery, Home, Cpu, Activity, AlertTriangle } from "lucide-react";

export default function KPICards({ data, hasSolar }) {
  const isNoAC = data?.vac === 0;
  const batSOC = data?.battery?.soc || 50;
  const batVolts = data?.battery?.voltage || 45.5;
  
  // Choose cards based on whether physical solar panels are connected
  let cards = [];

  if (!hasSolar) {
    // SYSTEM / UPS / BACKUP MODE (Default for Sr. Nelson)
    cards = [
      {
        title: "Estado Red Eléctrica (AC IN)",
        value: isNoAC ? "CORTE AC" : `${data?.vac || 230}`,
        unit: isNoAC ? "" : "V",
        subtitle: isNoAC ? "⚠️ Alarma: Sin entrada de red eléctrica" : `Frecuencia normal: ${data?.fac || 60} Hz`,
        icon: Zap,
        badgeColor: isNoAC 
          ? "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-extrabold animate-pulse" 
          : "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold",
        textColor: isNoAC ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Nivel de Batería (SOC)",
        value: `${batSOC}`,
        unit: "%",
        subtitle: `Voltaje BMS: ${batVolts}V (${batSOC < 20 ? "⚠️ Crítico" : "Óptimo"})`,
        icon: Battery,
        badgeColor: batSOC <= 20 
          ? "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-extrabold animate-pulse"
          : batSOC <= 30
          ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold"
          : "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold",
        textColor: batSOC <= 20 
          ? "text-red-600 dark:text-red-400" 
          : batSOC <= 30 
          ? "text-amber-600 dark:text-amber-400" 
          : "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Consumo del Hogar en Vivo",
        value: `${data?.houseKW !== undefined ? data.houseKW : 0.85}`,
        unit: "kW",
        subtitle: `Potencia demandada (${((data?.houseKW !== undefined ? data.houseKW : 0.85) * 1000).toFixed(0)} W)`,
        icon: Home,
        badgeColor: "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold",
        textColor: "text-purple-600 dark:text-purple-400",
      },
      {
        title: "Estado Operativo Inversor",
        value: `${data?.temperature || 38.5}`,
        unit: "°C",
        subtitle: isNoAC ? "Modo Respaldo desde Baterías" : "Modo Normal (Red AC + Cargador)",
        icon: Cpu,
        badgeColor: "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold",
        textColor: "text-amber-600 dark:text-amber-400",
      }
    ];
  } else {
    // SOLAR GENERATION MODE
    cards = [
      {
        title: "Potencia Solar Actual",
        value: `${data?.ppvKW || 0}`,
        unit: "kW",
        subtitle: `${data?.ppv || 0} Watts en vivo desde paneles`,
        icon: Sun,
        badgeColor: "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold",
        textColor: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Generación de Hoy",
        value: `${data?.eToday || 0}`,
        unit: "kWh",
        subtitle: "Energía solar capturada hoy",
        icon: Calendar,
        badgeColor: "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold",
        textColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Producción del Mes",
        value: `${data?.eMonth || 684.2}`,
        unit: "kWh",
        subtitle: "Total acumulado mensual",
        icon: TrendingUp,
        badgeColor: "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold",
        textColor: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Impacto Ecológico",
        value: `${data?.co2SavedKg || 0}`,
        unit: "kg CO₂",
        subtitle: `Equivalente a 🌲 ${data?.treesSaved || 0} árboles`,
        icon: Leaf,
        badgeColor: "bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold",
        textColor: "text-teal-600 dark:text-teal-400",
      }
    ];
  }

  return (
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
                  <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${card.textColor}`}>
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
              
              <div className={`p-3 rounded-xl border shadow-sm shrink-0 transition-transform group-hover:scale-110 ${card.badgeColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
