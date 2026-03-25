import { Nunito } from "next/font/google";
import "./globals.css";
import ClientOnly from "@/components/ClientOnly";
import { Toaster } from "react-hot-toast";
import LoginModal from "@/components/modals/LoginModal";
import RegisterModal from "@/components/modals/RegisterModal";
import getCurrentUser from "@/app/(site)/actions/getCurrentUser";

const font = Nunito({ subsets: ["latin"] });

export const metadata = {
  title: "Immobilier",
  description: "Plateforme de gestion et location immobilière",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={font.className}>
        <ClientOnly>
          <Toaster />
          <LoginModal />
          <RegisterModal />
          {children}
        </ClientOnly>
      </body>
    </html>
  );
}
