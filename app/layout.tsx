// Path: medicalend-web/app/layout.tsx

import "./globals.css";

export const metadata = {
  title: "MediCalend Web",
  description: "MediCalend web portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
