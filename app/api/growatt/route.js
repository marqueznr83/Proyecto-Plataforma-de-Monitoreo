import { NextResponse } from "next/server";

// Growatt API route proxy & smart telemetry engine (OpenAPI v1 Integration & Fallback Simulator)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || process.env.GROWATT_API_TOKEN || "75433vd880684dfp20nav03t8zb10xp1";
  const isDemoMode = searchParams.get("demo") === "true";
  
  // Custom Alarm & System Configuration from query params
  const config = {
    isDemoMode: isDemoMode,
    hasSolar: searchParams.get("hasSolar") === "true", 
    simulateACOutage: searchParams.get("noAC") === "true",
    minGridVac: Number(searchParams.get("minVac")) || 195,
    maxGridVac: Number(searchParams.get("maxVac")) || 250,
    lowBatSOC: Number(searchParams.get("lowBat")) || 25,
    criticalBatSOC: Number(searchParams.get("critBat")) || 15,
    customBatSOC: searchParams.get("batSOC") !== null ? Number(searchParams.get("batSOC")) : null
  };

  // If not in demo mode, attempt to connect to the real Growatt OpenAPI
  if (!isDemoMode && token && token !== "demo") {
    try {
      const realTelemetry = await getRealGrowattTelemetry(token, config);
      if (realTelemetry) {
        return NextResponse.json({
          source: "growatt_openapi_realtime",
          success: true,
          data: realTelemetry
        });
      }
    } catch (apiError) {
      console.warn("Growatt OpenAPI fetch failed or permission denied, using smart simulator. Error details:", apiError);
      
      // Fallback with exact API error info so the user knows what happened
      const simulatedData = generateLiveTelemetry(token, config);
      
      // Inject API connection error context so the UI can display a warning banner
      simulatedData.alerts.push({
        id: "api_connection_warning",
        severity: "warning",
        title: "⚠️ CONEXIÓN API GROWATT SIMULADA",
        message: `No se pudo conectar a los servidores de Growatt (${apiError?.error_msg || apiError?.message || "Código 10011: Permiso denegado/Token inactivo"}). Mostrando datos simulados calibrados de tu sistema de respaldo.`,
        code: `API_${apiError?.error_code || "CONN_ERR"}`,
        timestamp: new Date().toLocaleTimeString("es-ES")
      });
      simulatedData.status = "WARNING (SIMULADO)";
      simulatedData.hasWarningAlert = true;

      return NextResponse.json({
        source: "growatt_openapi_fallback",
        success: true,
        data: simulatedData
      });
    }
  }

  // Default to live high-fidelity simulation
  const liveTelemetry = generateLiveTelemetry(token, config);
  return NextResponse.json({
    source: "telemetry_engine_v3",
    success: true,
    data: liveTelemetry
  });
}

// Regional OpenAPI endpoints lookup
async function fetchGrowattOpenAPI(token, path, queryParams = {}, method = "GET", bodyParams = null) {
  const domains = [
    "https://openapi.growatt.com",
    "https://openapi-us.growatt.com",
    "https://openapi-cn.growatt.com"
  ];
  
  let lastError = null;
  
  for (const domain of domains) {
    try {
      const url = new URL(`${domain}${path}`);
      Object.keys(queryParams).forEach(k => url.searchParams.append(k, queryParams[k]));
      
      const options = {
        method: method,
        headers: {
          "token": token,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      };

      if (bodyParams) {
        // Growatt OpenAPI expects application/x-www-form-urlencoded for form parameters
        const formBody = [];
        for (const property in bodyParams) {
          const encodedKey = encodeURIComponent(property);
          const encodedValue = encodeURIComponent(bodyParams[property]);
          formBody.push(encodedKey + "=" + encodedValue);
        }
        options.body = formBody.join("&");
      }
      
      const res = await fetch(url.toString(), { 
        ...options, 
        next: { revalidate: 300 } // Cache 5 min to avoid rate limits
      });
      
      if (!res.ok) continue;
      
      const json = await res.json();
      
      // error_code 0 means success in Growatt OpenAPI protocol
      if (json && json.error_code === 0) {
        return json.data || json;
      } else {
        lastError = json;
      }
    } catch (e) {
      lastError = e;
    }
  }
  
  throw lastError || new Error("Failed to connect to Growatt OpenAPI");
}

// Fetch and merge real plant, device and battery data from OpenAPI
async function getRealGrowattTelemetry(token, config) {
  const now = new Date();

  // 1. Get user plants
  const plantListRes = await fetchGrowattOpenAPI(token, "/v1/plant/list");
  const plants = plantListRes?.plants || plantListRes?.list || [];
  if (plants.length === 0) {
    throw new Error("No se encontraron plantas de energía en esta cuenta.");
  }
  
  const plant = plants[0];
  const plantId = plant.plant_id || plant.plantId;

  // 2. Get device list
  const deviceListRes = await fetchGrowattOpenAPI(token, "/v1/device/list", { plant_id: plantId });
  const devices = deviceListRes?.devices || deviceListRes?.list || [];
  if (devices.length === 0) {
    throw new Error("No se encontraron inversores o dispositivos de almacenamiento.");
  }

  // Find storage (battery hybrid type 2) or inverter (type 1)
  const storageDevice = devices.find(d => d.type === 2 || d.type === "storage" || d.model?.toLowerCase().includes("sph") || d.model?.toLowerCase().includes("spa"));
  const inverterDevice = devices.find(d => d.type === 1 || d.type === "inverter") || devices[0];

  let batterySOC = 100;
  let batteryVoltage = 53.3;
  let batteryPower = 0;
  let temperature = 38.5;
  let vac = 230;
  let fac = 60.0;
  let pac = 0;
  let houseLoad = 0;

  // 3. Query real-time metrics for storage if present
  if (storageDevice) {
    try {
      const storageData = await fetchGrowattOpenAPI(token, "/v1/device/storage/storage_last_data", {}, "POST", {
        storage_sn: storageDevice.device_sn || storageDevice.deviceSn
      });
      
      if (storageData) {
        // Extract real BMS and Grid metrics
        // capacity is the real Battery SOC, vBat is battery voltage
        batterySOC = storageData.capacity !== undefined ? storageData.capacity : (storageData.soc || storageData.batterySoc || 100);
        batteryVoltage = storageData.vBat !== undefined ? Number(Number(storageData.vBat).toFixed(1)) : (storageData.batteryVoltage || 53.3);
        
        // pBat is positive for discharging and negative for charging. We invert it for our UI standard (+ charge, - discharge)
        batteryPower = storageData.pBat !== undefined ? -storageData.pBat : 0;
        
        temperature = storageData.invTemperature || storageData.temperature || storageData.temp || 38.5;
        vac = storageData.vGrid !== undefined ? Number(Number(storageData.vGrid).toFixed(1)) : (storageData.vac1 ? Number(Number(storageData.vac1).toFixed(1)) : 230);
        fac = storageData.freqGrid !== undefined ? Number(Number(storageData.freqGrid).toFixed(2)) : (storageData.fGrid ? Number(Number(storageData.fGrid).toFixed(2)) : 60.0);
        pac = storageData.outPutPower || storageData.pAcOutPut || 0;
        
        // In bypass mode, house consumption load is outputPower / pAcOutPut or 0 if idle
        houseLoad = storageData.pLocal || storageData.loadPower || storageData.outPutPower || storageData.pAcOutPut || 0;
      }
    } catch (storageErr) {
      console.warn("Could not query detailed storage data, using base inverter metrics", storageErr);
    }
  } else if (inverterDevice) {
    // Basic inverter metrics fallback
    try {
      const inverterData = await fetchGrowattOpenAPI(token, "/v1/device/inverter/inverter_last_data", {}, "POST", {
        inverter_sn: inverterDevice.device_sn || inverterDevice.deviceSn
      });
      if (inverterData) {
        vac = inverterData.vac1 !== undefined ? Number(Number(inverterData.vac1).toFixed(1)) : 230;
        fac = inverterData.fac !== undefined ? Number(Number(inverterData.fac).toFixed(2)) : 60.0;
        pac = inverterData.pac || 0;
        temperature = inverterData.temp || 38.5;
      }
    } catch (invErr) {
      console.warn("Could not query inverter data", invErr);
    }
  }

  // Parse simulated/forced override if requested for debugging
  if (config.simulateACOutage) {
    vac = 0;
    fac = 0;
  }
  // Only override real battery values with the testing slider if Demo Mode is ACTIVE
  if (config.isDemoMode && config.customBatSOC !== null) {
    batterySOC = config.customBatSOC;
    batteryVoltage = Number((45.0 + (batterySOC / 100) * 8.1).toFixed(1));
  }

  // 4. Construct live alerts based on real metrics & custom user thresholds
  const alerts = [];
  if (vac === 0) {
    alerts.push({
      id: "ac_outage",
      severity: "critical",
      title: "🚨 CORTE DE ENERGÍA: SIN ENTRADA RED AC",
      message: "El inversor no detecta tensión de red eléctrica. Operando en modo Respaldo Ininterrumpido desde Batería (UPS).",
      code: "E01_NO_AC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (vac < config.minGridVac) {
    alerts.push({
      id: "ac_low_vac",
      severity: "warning",
      title: "⚠️ BAJO VOLTAJE DE RED AC",
      message: `Voltaje de red eléctrica por debajo del umbral de advertencia (${vac}V < ${config.minGridVac}V).`,
      code: "W02_LOW_VAC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (vac > config.maxGridVac) {
    alerts.push({
      id: "ac_high_vac",
      severity: "critical",
      title: "🚨 SOBREVOLTAJE EN RED AC",
      message: `Voltaje de red eléctrica peligroso (${vac}V > ${config.maxGridVac}V). Activada protección en inversor.`,
      code: "E03_HIGH_VAC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  }

  if (batterySOC <= config.criticalBatSOC) {
    alerts.push({
      id: "bat_critical",
      severity: "critical",
      title: "🚨 VOLTAJE DE BATERÍA CRÍTICO (ROJO)",
      message: `Carga y voltaje de batería crítico: ${batterySOC}% (${batteryVoltage}V). Límite: ${config.criticalBatSOC}%.`,
      code: "E10_BAT_CRITICAL",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (batterySOC <= config.lowBatSOC) {
    alerts.push({
      id: "bat_low",
      severity: "warning",
      title: "⚠️ BATERÍA EN NIVEL BAJO (AMARILLO)",
      message: `Estado de carga de batería bajo: ${batterySOC}% (${batteryVoltage}V). Límite aviso: ${config.lowBatSOC}%.`,
      code: "W11_BAT_LOW",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  let status = "ONLINE";
  let statusMessage = "Operación Óptima";
  if (hasCritical) {
    status = "CRÍTICO (ROJO)";
    statusMessage = "Alarma Activa";
  } else if (hasWarning) {
    status = "ADVERTENCIA (AMARILLO)";
    statusMessage = "Revisar Parámetros";
  } else if (vac === 0) {
    status = "MODO RESPALDO";
    statusMessage = "Operando con Baterías";
  }

  // Construct Hourly Curves (consumption & battery charge history)
  const hourlyData = [];
  for (let h = 5; h <= 21; h++) {
    hourlyData.push({
      time: `${h.toString().padStart(2, '0')}:00`,
      potenciaKW: 0
    });
  }

  return {
    plantName: plant.plant_name || plant.plantName || "Residencial Sr. Nelson",
    inverterModel: storageDevice?.model || inverterDevice?.model || "Growatt Inverter UPS",
    serialNumber: storageDevice?.device_sn || inverterDevice?.device_sn || "GW-REAL-2026",
    tokenPreview: `${token.substring(0, 6)}...${token.substring(token.length - 4)}`,
    status,
    statusMessage,
    alerts,
    hasCriticalAlert: hasCritical,
    hasWarningAlert: hasWarning,
    hasSolar: config.hasSolar,
    ppv: 0,
    ppvKW: 0,
    pac: pac,
    pacKW: Number((pac / 1000).toFixed(2)),
    eToday: 0,
    eTotal: 0,
    eMonth: 0,
    houseLoad: houseLoad,
    houseKW: Number((houseLoad / 1000).toFixed(2)),
    gridPower: -houseLoad, // Net importing
    vac,
    fac,
    gridAC: {
      vac,
      iac: Number((pac / Math.max(1, vac)).toFixed(2)),
      fac
    },
    batterySOC,
    batteryVoltage,
    batteryPower,
    battery: {
      soc: batterySOC,
      voltage: batteryVoltage,
      power: batteryPower
    },
    temperature: Math.round(temperature),
    efficiency: 98.2,
    co2SavedKg: 0,
    treesSaved: 0,
    hourlyData,
    lastUpdated: now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

// Local telemetry generator fallback function
function generateLiveTelemetry(token, config) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  let currentPpv = 0;
  if (config.hasSolar) {
    if (hour >= 6 && hour <= 19) {
      const dayProgress = (hour - 6) / 13;
      const solarFactor = Math.sin(dayProgress * Math.PI);
      const basePpv = Math.max(0, Math.round(6000 * Math.pow(solarFactor, 1.4)));
      const jitter = (Math.random() - 0.5) * 80;
      currentPpv = Math.max(0, Math.round(basePpv + jitter));
    }
  }

  let vac = config.simulateACOutage ? 0 : Math.round(229 + (Math.random() * 2 - 1));
  const fac = vac > 0 ? Number((60.0 + (Math.random() * 0.04 - 0.02)).toFixed(2)) : 0;
  
  let batterySOC = config.customBatSOC !== null && !isNaN(config.customBatSOC)
    ? config.customBatSOC 
    : Math.round(55 + Math.sin(hour / 3) * 20);
  batterySOC = Math.max(0, Math.min(100, batterySOC));

  const batteryVoltage = Number((45.0 + (batterySOC / 100) * 8.1).toFixed(1));

  const houseLoad = Math.round(820 + Math.random() * 180);
  const houseKW = Number((houseLoad / 1000).toFixed(2));

  let pac = 0;
  let batteryPower = 0;
  let gridPower = 0;

  if (vac > 0) {
    if (currentPpv > houseLoad) {
      pac = Math.round(currentPpv * 0.975);
      batteryPower = Math.min(pac - houseLoad, 2000);
      gridPower = pac - houseLoad - batteryPower;
    } else {
      pac = houseLoad;
      if (batterySOC > config.lowBatSOC && config.hasSolar) {
        batteryPower = -Math.min(houseLoad, 1500);
        gridPower = -(houseLoad - Math.abs(batteryPower));
      } else {
        batteryPower = batterySOC < 95 ? 1200 : 0; 
        gridPower = -(houseLoad + batteryPower);
      }
    }
  } else {
    if (batterySOC > 5) {
      batteryPower = -houseLoad;
      pac = houseLoad;
    } else {
      pac = 0;
    }
    gridPower = 0;
  }

  const pacKW = Number((pac / 1000).toFixed(2));
  const eToday = config.hasSolar ? Number((14.2 + (currentPpv / 1000) * 2).toFixed(2)) : 0;

  const ppv1 = Math.round(currentPpv * 0.6);
  const ppv2 = Math.round(currentPpv * 0.4);
  const vpv1 = ppv1 > 0 ? 362 : 0;
  const ipv1 = vpv1 > 0 ? Number((ppv1 / vpv1).toFixed(2)) : 0;
  const vpv2 = ppv2 > 0 ? 344 : 0;
  const ipv2 = vpv2 > 0 ? Number((ppv2 / vpv2).toFixed(2)) : 0;

  const alerts = [];
  if (vac === 0) {
    alerts.push({
      id: "ac_outage",
      severity: "critical",
      title: "🚨 CORTE DE ENERGÍA: SIN ENTRADA RED AC",
      message: "El inversor no detecta tensión de red eléctrica. Operando en modo Respaldo Ininterrumpido desde Batería (UPS).",
      code: "E01_NO_AC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (vac < config.minGridVac) {
    alerts.push({
      id: "ac_low_vac",
      severity: "warning",
      title: "⚠️ BAJO VOLTAJE DE RED AC",
      message: `Voltaje de red eléctrica por debajo del umbral de advertencia (${vac}V < ${config.minGridVac}V).`,
      code: "W02_LOW_VAC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (vac > config.maxGridVac) {
    alerts.push({
      id: "ac_high_vac",
      severity: "critical",
      title: "🚨 SOBREVOLTAJE EN RED AC",
      message: `Voltaje de red eléctrica peligroso (${vac}V > ${config.maxGridVac}V). Activada protección en inversor.`,
      code: "E03_HIGH_VAC",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  }

  if (batterySOC <= config.criticalBatSOC) {
    alerts.push({
      id: "bat_critical",
      severity: "critical",
      title: "🚨 VOLTAJE DE BATERÍA CRÍTICO (ROJO)",
      message: `Nivel de carga y voltaje en estado crítico: ${batterySOC}% (${batteryVoltage}V). Límite configurado: ${config.criticalBatSOC}%.`,
      code: "E10_BAT_CRITICAL",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  } else if (batterySOC <= config.lowBatSOC) {
    alerts.push({
      id: "bat_low",
      severity: "warning",
      title: "⚠️ BATERÍA EN NIVEL BAJO (AMARILLO)",
      message: `Estado de carga de batería en nivel bajo: ${batterySOC}% (${batteryVoltage}V). Límite de advertencia: ${config.lowBatSOC}%.`,
      code: "W11_BAT_LOW",
      timestamp: now.toLocaleTimeString("es-ES")
    });
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  let status = "ONLINE";
  let statusMessage = "Operación Óptima";

  if (hasCritical) {
    status = "CRÍTICO (ROJO)";
    statusMessage = "Alarma de Alta Prioridad";
  } else if (hasWarning) {
    status = "ADVERTENCIA (AMARILLO)";
    statusMessage = "Revisar Parámetros";
  } else if (vac === 0) {
    status = "MODO RESPALDO";
    statusMessage = "Alimentando desde Baterías";
  }

  const hourlyData = [];
  for (let h = 5; h <= 21; h++) {
    const hProgress = (h - 6) / 13;
    let hFactor = config.hasSolar && h >= 6 && h <= 19 ? Math.sin(hProgress * Math.PI) : 0;
    hourlyData.push({
      time: `${h.toString().padStart(2, '0')}:00`,
      potenciaKW: Number((Math.max(0, 5.8 * Math.pow(hFactor, 1.4))).toFixed(2)),
    });
  }

  return {
    plantName: "Residencial Sr. Nelson",
    inverterModel: "Growatt Inverter UPS",
    serialNumber: "GW-HIBRIDO-2026",
    tokenPreview: token ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : "Demo",
    status,
    statusMessage,
    alerts,
    hasCriticalAlert: hasCritical,
    hasWarningAlert: hasWarning,
    hasSolar: config.hasSolar,
    ppv: currentPpv,
    ppvKW: Number((currentPpv / 1000).toFixed(2)),
    pac: pac,
    pacKW: pacKW,
    eToday: eToday,
    eTotal: config.hasSolar ? 4865.2 : 0,
    eMonth: config.hasSolar ? 684.2 : 0,
    houseLoad: houseLoad,
    houseKW: houseKW,
    gridPower: gridPower,
    vac: vac,
    fac: fac,
    gridAC: {
      vac: vac,
      iac: Number((pac > 0 ? (pac / Math.max(1, vac)).toFixed(2) : 0)),
      fac: fac
    },
    batterySOC: batterySOC,
    batteryVoltage: batteryVoltage,
    batteryPower: batteryPower,
    battery: {
      soc: batterySOC,
      voltage: batteryVoltage,
      power: batteryPower
    },
    hasBattery: true,
    string1: { vpv: vpv1, ipv: ipv1, ppv: ppv1 },
    string2: { vpv: vpv2, ipv: ipv2, ppv: ppv2 },
    temperature: Math.round(37 + (pacKW / 6) * 6),
    efficiency: vac > 0 ? 98.4 : 95.8,
    co2SavedKg: Number((eToday * 0.709).toFixed(2)),
    treesSaved: Number((eToday * 0.709 / 20).toFixed(1)),
    hourlyData: hourlyData,
    lastUpdated: now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}
