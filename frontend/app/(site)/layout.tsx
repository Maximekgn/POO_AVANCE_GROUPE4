import "@/app/globals.css";
import ClientOnly from "@/components/ClientOnly";
import Navbar from "@/components/navbar/Navbar";
import RentModal from "@/components/modals/RentModal";
import SearchModal from "@/components/modals/SearchModal";
import ChatWidget from "@/components/chat/ChatWidget";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <RentModal />
      <SearchModal />
      <Navbar />
      <ChatWidget />
      <div className="py-36">{children}</div>
    </ClientOnly>
  );
}
