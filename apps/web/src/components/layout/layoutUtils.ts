import type { QueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/endpoints/auth";
import { clearMockRoleCookie } from "@/mocks/db";
import type { AppDispatch } from "@/store";
import { clearAuth } from "@/store/slices/authSlice";

export function getUserInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "GH";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export async function performClientLogout(
  dispatch: AppDispatch,
  queryClient?: QueryClient,
): Promise<void> {
  try {
    await logout();
  } catch {
    // Clear local auth state even if the session has already expired.
  } finally {
    clearMockRoleCookie();
    dispatch(clearAuth());
    queryClient?.clear();
  }
}
