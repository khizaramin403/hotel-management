import type { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function GuestLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main>
        <RoleGuard allowedRoles={["guest"]}>{children}</RoleGuard>
      </main>
    </div>
  );
}
