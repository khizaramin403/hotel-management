"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@hotel/shared";
import { Button, Skeleton } from "antd";
import { ErrorState } from "@/components/ui";
import { isDashboardRouteAllowed } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectAuthStatus, selectAuthUser } from "@/store/slices/authSlice";

export interface RoleGuardProps {
  allowedRoles: readonly Role[];
  enforceRouteRole?: boolean;
  children: ReactNode;
}

function GuardLoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-container px-4 py-8 md:px-6"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton active title={{ width: "30%" }} paragraph={{ rows: 6 }} />
    </div>
  );
}

export function RoleGuard({ allowedRoles, enforceRouteRole = false, children }: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectAuthUser);

  const isLoading = status === "idle" || status === "loading";
  const isLoggedOut = status === "unauthenticated" || (status === "authenticated" && !user);

  useEffect(() => {
    if (!isLoggedOut) {
      return;
    }
    const search = typeof window !== "undefined" ? window.location.search : "";
    const nextPath = `${pathname}${search}` || "/";
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isLoggedOut, pathname, router]);

  if (isLoading || isLoggedOut || !user) {
    return <GuardLoadingSkeleton />;
  }

  const hasAllowedRole = allowedRoles.includes(user.role);
  const hasRouteAccess = enforceRouteRole ? isDashboardRouteAllowed(pathname, user.role) : true;

  if (!hasAllowedRole || !hasRouteAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <ErrorState
          status="403"
          title="You do not have access"
          description="You do not have permission to view this page."
          action={
            <Button type="primary" onClick={() => router.push("/")}>
              Back to home
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
