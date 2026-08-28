export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startBackgroundMonitoring } = await import('./app/api/growatt/monitor.js');
      startBackgroundMonitoring();
    } catch (e) {
      console.error("Error starting background monitor in instrumentation:", e.message);
    }
  }
}
