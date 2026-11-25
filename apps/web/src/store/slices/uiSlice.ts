import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, toggleMobileMenu, setMobileMenuOpen } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;

export const selectSidebarCollapsed = (state: { ui: UiState }) => state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: { ui: UiState }) => state.ui.mobileMenuOpen;
