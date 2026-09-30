"use client";

import { Clock, ShieldAlert } from "lucide-react";
import { useACOutageTimer } from "@/components/useACOutageTimer";

export default function ACOutageBanner({ data }) {
  const isOffline = data?.isOffline || false;
  const isNoAC = !isOffline && (data?.vac === 0 || data?.gridAC?.vac === 0);
  const { formattedLong, formattedClock } = useACOutageTimer(data?.acOutageStartTime, isNoAC);

  if (!isNoAC) return null;

  return (
    <div className="w-full theme-card p-4 sm:p-5 border-2 border-red-500/80 bg-red-500/15 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse my-2">
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-red-600 text-white shrink-0 shadow-md">
          <Clock className="w-6 h-6 animate-spin" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              ?? ALARMA CR?TICA: CORTE EN RED EL?CTRICA AC
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold shadow-sm">
              MODO RESPALDO UPS (BATER?A)
            </span>
          </div>
          <p className="text-sm font-extrabold text-primary mt-1">
            Inversor alimentando el consumo de la residencia desde el banco de bateras.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 bg-red-600 text-white px-4.5 py-2.5 rounded-xl shadow-lg font-mono font-black text-base border border-red-400/40">
        <span>?? Tiempo sin luz:</span>
        <span className="text-amber-300 font-extrabold">{formattedLong}</span>
        <span className="text-xs opacity-85 bg-red-950 px-2 py-0.5 rounded font-mono">({formattedClock})</span>
      </div>
    </div>
  );
}
