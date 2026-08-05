import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "Plataforma de Monitoreo Solar Growatt | Sr. Nelson",
  description: "Sistema de monitoreo en tiempo real e histórico para inversor fotovoltaico Growatt. Optimizado para móvil y escritorio.",
  keywords: ["Growatt", "Inversor Solar", "Energía Solar", "Monitoreo Fotovoltaico", "ShineServer", "Vercel"],
  authors: [{ name: "Sr. Nelson" }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-amber-500 selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
