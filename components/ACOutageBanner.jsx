"use client";

import { Clock, ShieldAlert } from "lucide-react";
import { useACOutageTimer } from "@/components/useACOutageTimer";

export default function ACOutageBanner({ data }) {
  const isOffline = data?.isOffline || false;
  const isNoAC = !isOffline && (data?.vac === 0 || data?.gridAC?.vac === 0);
  const { formattedLong, formattedClock } = useACOutageTimer(data?.acOutageStartTime, isNoAC);

  if (!isNoAC) return null;

  return (
    <div className="w-full theme-card p-4 sm:p-5 border-2 border-red-500/40 bg-red-500/10 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse my-1">
      <div className="flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-500 shrink-0 shadow-sm">
          <Clock className="w-6 h-6 animate-spin text-red-500" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-red-500 dark:text-red-400">
              Alarma de Corte de Luz AC
            </span>
            <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-500 dark:text-red-400 uppercase tracking-wide">
              Modo Respaldo UPS
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-primary mt-1">
            El inversor está alimentando el consumo de la residencia desde el banco de baterías.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 theme-well px-4 py-2.5 rounded-xl border border-red-500/40 shadow-sm bg-red-500/10">
        <span className="text-xs font-bold text-subtle">Tiempo sin luz:</span>
        <span className="text-red-500 dark:text-red-400 font-mono font-black text-base tracking-tight">
          {formattedLong}
        </span>
        <span className="text-[11px] font-mono font-bold text-subtle bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
          {formattedClock}
        </span>
      </div>
    </div>
  );
}
