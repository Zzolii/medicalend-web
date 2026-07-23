// Path: medicalend-web/app/layout.tsx

import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.medicalend.ro"),

  title: {
    default: "MediCalend",
    template: "%s | MediCalend",
  },

  description:
    "Platformă pentru programări medicale și urmărirea parcursului pacientului.",

  applicationName: "MediCalend",

  manifest: "/manifest.webmanifest",

  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "MediCalend",
    statusBarStyle: "default",
  },

  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: "https://app.medicalend.ro",
    siteName: "MediCalend",
    title: "MediCalend",
    description:
      "Programări medicale și urmărirea parcursului pacientului într-un singur loc.",
  },

  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
