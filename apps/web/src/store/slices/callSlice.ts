import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CallStatus = "idle" | "ringing" | "connected" | "ended";
export type CallDirection = "incoming" | "outgoing" | null;

export interface CallState {
  status: CallStatus;
  conversationId: number | null;
  direction: CallDirection;
  startedAt: string | null;
}

const initialState: CallState = {
  status: "idle",
  conversationId: null,
  direction: null,
  startedAt: null,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startOutgoingCall(state, action: PayloadAction<number>) {
      state.status = "ringing";
      state.conversationId = action.payload;
      state.direction = "outgoing";
      state.startedAt = null;
    },
    receiveIncomingCall(state, action: PayloadAction<number>) {
      state.status = "ringing";
      state.conversationId = action.payload;
      state.direction = "incoming";
      state.startedAt = null;
    },
    acceptCall(state, action: PayloadAction<string | undefined>) {
      state.status = "connected";
      state.startedAt = action.payload ?? new Date().toISOString();
    },
    endCall(state) {
      state.status = "ended";
    },
    resetCall() {
      return initialState;
    },
  },
});

export const { startOutgoingCall, receiveIncomingCall, acceptCall, endCall, resetCall } =
  callSlice.actions;
export const callReducer = callSlice.reducer;

export const selectCallStatus = (state: { call: CallState }) => state.call.status;
export const selectCallConversationId = (state: { call: CallState }) => state.call.conversationId;
export const selectCallDirection = (state: { call: CallState }) => state.call.direction;
export const selectCallStartedAt = (state: { call: CallState }) => state.call.startedAt;
