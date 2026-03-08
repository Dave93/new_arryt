import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../providers/query-provider";
import { ToastProvider } from "../providers/toast-provider";
import { AuthGuard } from "../components/auth/auth-guard";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for managing your application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NuqsAdapter>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
