import { describe, expect, it } from "vitest";
import {
  selectMobileMenuOpen,
  selectSidebarCollapsed,
  setMobileMenuOpen,
  setSidebarCollapsed,
  toggleMobileMenu,
  toggleSidebar,
  uiReducer,
} from "./uiSlice";

describe("uiSlice", () => {
  it("toggles and explicitly sets sidebarCollapsed", () => {
    const initial = uiReducer(undefined, { type: "unknown" });
    expect(selectSidebarCollapsed({ ui: initial })).toBe(false);

    const toggled = uiReducer(initial, toggleSidebar());
    expect(selectSidebarCollapsed({ ui: toggled })).toBe(true);

    const setFalse = uiReducer(toggled, setSidebarCollapsed(false));
    expect(selectSidebarCollapsed({ ui: setFalse })).toBe(false);
  });

  it("toggles and explicitly sets mobileMenuOpen", () => {
    const initial = uiReducer(undefined, { type: "unknown" });
    expect(selectMobileMenuOpen({ ui: initial })).toBe(false);

    const opened = uiReducer(initial, toggleMobileMenu());
    expect(selectMobileMenuOpen({ ui: opened })).toBe(true);

    const closed = uiReducer(opened, setMobileMenuOpen(false));
    expect(selectMobileMenuOpen({ ui: closed })).toBe(false);
  });
});
