import type { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <RoleGuard allowedRoles={["staff", "admin"]} enforceRouteRole>
      <DashboardShell>{children}</DashboardShell>
    </RoleGuard>
  );
}
