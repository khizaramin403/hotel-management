import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CallStatus = "idle" | "ringing" | "connected" | "ended";
export type CallDirection = "incoming" | "outgoing" | null;

export interface CallParticipantPayload {
  conversationId: number;
  peerName?: string | null;
}

export interface CallState {
  status: CallStatus;
  conversationId: number | null;
  direction: CallDirection;
  startedAt: string | null;
  peerName: string | null;
  muted: boolean;
  endedDurationText: string | null;
}

const initialState: CallState = {
  status: "idle",
  conversationId: null,
  direction: null,
  startedAt: null,
  peerName: null,
  muted: false,
  endedDurationText: null,
};

function resolveCallPayload(payload: number | CallParticipantPayload): CallParticipantPayload {
  return typeof payload === "number" ? { conversationId: payload } : payload;
}

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startOutgoingCall(state, action: PayloadAction<number | CallParticipantPayload>) {
      const { conversationId, peerName } = resolveCallPayload(action.payload);
      state.status = "ringing";
      state.conversationId = conversationId;
      state.direction = "outgoing";
      state.startedAt = null;
      state.peerName = peerName ?? null;
      state.muted = false;
      state.endedDurationText = null;
    },
    receiveIncomingCall(state, action: PayloadAction<number | CallParticipantPayload>) {
      const { conversationId, peerName } = resolveCallPayload(action.payload);
      state.status = "ringing";
      state.conversationId = conversationId;
      state.direction = "incoming";
      state.startedAt = null;
      state.peerName = peerName ?? null;
      state.muted = false;
      state.endedDurationText = null;
    },
    acceptCall(state, action: PayloadAction<string | undefined>) {
      state.status = "connected";
      state.startedAt = action.payload ?? new Date().toISOString();
      state.endedDurationText = null;
    },
    setCallMuted(state, action: PayloadAction<boolean>) {
      state.muted = action.payload;
    },
    toggleCallMute(state) {
      state.muted = !state.muted;
    },
    endCall(state, action: PayloadAction<string | undefined>) {
      state.status = "ended";
      state.muted = false;
      state.endedDurationText = action.payload ?? state.endedDurationText ?? "00:00";
    },
    resetCall() {
      return initialState;
    },
  },
});

export const {
  startOutgoingCall,
  receiveIncomingCall,
  acceptCall,
  setCallMuted,
  toggleCallMute,
  endCall,
  resetCall,
} = callSlice.actions;
export const callReducer = callSlice.reducer;

export const selectCallStatus = (state: { call: CallState }) => state.call.status;
export const selectCallConversationId = (state: { call: CallState }) => state.call.conversationId;
export const selectCallDirection = (state: { call: CallState }) => state.call.direction;
export const selectCallStartedAt = (state: { call: CallState }) => state.call.startedAt;
export const selectCallPeerName = (state: { call: CallState }) => state.call.peerName;
export const selectCallMuted = (state: { call: CallState }) => state.call.muted;
export const selectCallEndedDurationText = (state: { call: CallState }) =>
  state.call.endedDurationText;
