import { Nunito } from "next/font/google";
import "./globals.css";
import ClientOnly from "@/components/ClientOnly";
import { Toaster } from "react-hot-toast";
import LoginModal from "@/components/modals/LoginModal";
import RegisterModal from "@/components/modals/RegisterModal";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const font = Nunito({ subsets: ["latin"] });

export const metadata = {
  title: "Immobilier Pro",
  description: "Plateforme luxury de gestion et location immobilière",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  themeColor: "#3B82F6",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ImmoPro" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={font.className}>
        <ClientOnly>
          <Toaster />
          <LoginModal />
          <RegisterModal />
          <PWAInstallPrompt />
          
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ("serviceWorker" in navigator) {
                  window.addEventListener("load", function() {
                    navigator.serviceWorker.register("/sw.js").then(
                      function(registration) {
                        console.log("Service Worker registration successful with scope: ", registration.scope);
                      },
                      function(err) {
                        console.log("Service Worker registration failed: ", err);
                      }
                    );
                  });
                }
              `,
            }}
          />

          {children}
        </ClientOnly>
      </body>
    </html>
  );
}
