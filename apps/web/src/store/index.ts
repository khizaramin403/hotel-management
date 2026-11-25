import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./slices/authSlice";
import { bookingDraftReducer } from "./slices/bookingDraftSlice";
import { callReducer } from "./slices/callSlice";
import { chatReducer } from "./slices/chatSlice";
import { uiReducer } from "./slices/uiSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      bookingDraft: bookingDraftReducer,
      chat: chatReducer,
      call: callReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
