"use client";

import AdminSidebar from "@/app/(dashboard)/admin/dashboard/components/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser?.isAdmin) {
        router.replace("/");
      } else {
        setIsChecking(false);
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row gap-0 bg-blue-50/30">
      {/* Sidebar */}
      <div className="w-full md:w-80 md:h-screen md:sticky md:top-0 flex items-center justify-center">
        <AdminSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen">
        <main className="w-full h-full py-20 container mx-auto pr-10 bg-white rounded-lg shadow-md p-6 m-6">
          {children}
        </main>
      </div>
    </div>
  );
}
