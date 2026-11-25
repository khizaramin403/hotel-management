import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@hotel/shared";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  user: User | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = "loading";
    },
    setAuthUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.status = "authenticated";
    },
    clearAuth(state) {
      state.user = null;
      state.status = "unauthenticated";
    },
    resetAuth() {
      return initialState;
    },
  },
});

export const { setAuthLoading, setAuthUser, clearAuth, resetAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectAuthRole = createSelector([selectAuthUser], (user) => user?.role ?? null);
export const selectIsAuthenticated = createSelector(
  [selectAuthStatus],
  (status) => status === "authenticated",
);
