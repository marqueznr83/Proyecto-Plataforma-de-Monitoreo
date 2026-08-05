# ☀️ Plataforma de Monitoreo Solar Growatt (Next.js + Vercel)

Plataforma web interactiva, moderna y responsive (optimizada para móviles iOS/Android y escritorio) para monitorear en tiempo real e histórico el rendimiento de tu inversor fotovoltaico **Growatt**.

![Dashboard Preview](https://img.shields.io/badge/Growatt-Solar_Monitoring-amber?style=for-the-badge&logo=react)
![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=nextdotjs)
![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)

---

## ✨ Características Principales

- ⚡ **Telemetría en Tiempo Real:** Potencia Solar (kW), Energía Hoy (kWh), Energía Total (MWh).
- 🔄 **Diagrama de Flujo Energético Animado:** Visualización en vivo del flujo de energía entre Paneles Solares ☀️, Inversor Growatt ⚡, Consumo del Hogar 🏠, Red Eléctrica 🔌 y Baterías 🔋.
- 📊 **Gráficos Interactivos de Producción:** Curva diurna de generación solar (kW) e histórico de producción mensual con Recharts.
- 🛠️ **Diagnóstico Técnico de Strings:** Voltaje, corriente y potencia de String 1 (PV1) y String 2 (PV2), más estado de red AC y temperatura interna del inversor.
- 🔒 **Proxy de API Seguro (`/api/growatt`):** Conexión serverless sin exponer tu API Token en el navegador del cliente.
- 📱 **Diseño 100% Adaptativo:** Interfaz futurista con soporte de modo oscuro y glassmorphism.

---

## 🚀 Guía de Despliegue en GitHub y Vercel

### Paso 1: Subir el Proyecto a tu GitHub

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Inicializar repositorio Git
git init

# 2. Agregar todos los archivos
git add .

# 3. Guardar el primer commit
git commit -m "Inicializar Plataforma de Monitoreo Growatt"

# 4. Cambiar a rama principal
git branch -M main

# 5. Vincular tu repositorio remoto de GitHub (reemplaza TU-USUARIO con tu cuenta)
git remote add origin https://github.com/TU-USUARIO/growatt-monitoring-app.git

# 6. Subir el código
git push -u origin main
```

---

### Paso 2: Desplegar en Vercel (1 Clic)

1. Ingresa a tu cuenta de **[Vercel](https://vercel.com/new)**.
2. Haz clic en **Import Project** y selecciona tu repositorio `growatt-monitoring-app` desde GitHub.
3. En la sección **Environment Variables**, agrega tu Token de Growatt:
   - **Name:** `GROWATT_API_TOKEN`
   - **Value:** `75433vd880684dfp20nav03t8zb10xp1`
4. Haz clic en **Deploy**. ¡Vercel compilará y te entregará tu dirección URL web accesible desde cualquier celular o PC!

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la plataforma.

---

Desarrollado con ❤️ para el monitoreo de energía solar residencial Growatt.
