"use client";

import { useState, useEffect } from "react";

export function useACOutageTimer(acOutageStartTime, isNoAC) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isNoAC || !acOutageStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = typeof acOutageStartTime === "number" 
      ? acOutageStartTime 
      : new Date(acOutageStartTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [acOutageStartTime, isNoAC]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const pad = (num) => String(num).padStart(2, "0");

  const formattedClock = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const formattedShort = hours > 0 
    ? `${hours}h ${minutes}m ${seconds}s`
    : minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const formattedLong = hours > 0
    ? `${hours}h ${minutes}m ${seconds}s`
    : minutes > 0
    ? `${minutes} min ${seconds} seg`
    : `${seconds} seg`;

  return {
    elapsedSeconds,
    hours,
    minutes,
    seconds,
    formattedClock,
    formattedShort,
    formattedLong
  };
}
