import type { Role } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import type { ConversationsListResult } from "@/lib/api";
import type { SocketClient } from "@/lib/socket";
import type { AppDispatch, RootState } from "@/store";
import {
  acceptCall,
  endCall,
  receiveIncomingCall,
  setCallMuted,
  startOutgoingCall,
} from "@/store/slices/callSlice";
import { addChatSystemEvent } from "@/store/slices/chatSlice";
import {
  computeElapsedCallSeconds,
  formatCallDuration,
  getCallEngine,
} from "./callEngine";

const pendingOffersByConversation = new Map<number, unknown>();
let systemEventCounter = 0;

export function setPendingCallOffer(conversationId: number, sdp: unknown): void {
  pendingOffersByConversation.set(conversationId, sdp);
}

export function consumePendingCallOffer(conversationId: number): unknown {
  const sdp = pendingOffersByConversation.get(conversationId);
  pendingOffersByConversation.delete(conversationId);
  return sdp;
}

export function clearPendingCallOffers(): void {
  pendingOffersByConversation.clear();
}

export function resolveCallPeerName(
  queryClient: QueryClient,
  currentUserRole: Role | null | undefined,
  conversationId: number,
): string {
  if (currentUserRole === "guest") {
    return "Reception";
  }

  const queries = queryClient.getQueryCache().findAll({
    queryKey: ["chat", "conversations"],
  });

  for (const query of queries) {
    const data = query.state.data as ConversationsListResult | undefined;
    const matched = data?.data.find((conv) => conv.id === conversationId);
    if (matched) {
      return matched.guestName;
    }
  }

  return "Guest";
}

/**
 * Transitions the call state machine to `ended` idempotently, releases CallEngine resources,
 * and appends the `'Call ended MM:SS'` system pill to the conversation thread.
 */
export function finalizeCallEnded({
  dispatch,
  getState,
  conversationId,
  nowMs = Date.now(),
}: {
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
  conversationId: number;
  nowMs?: number;
}): boolean {
  const current = getState().call;
  if (
    current.conversationId !== conversationId ||
    current.status === "idle" ||
    current.status === "ended"
  ) {
    return false;
  }

  const elapsedSeconds = computeElapsedCallSeconds(current.startedAt, nowMs);
  const durationText = formatCallDuration(elapsedSeconds);

  getCallEngine().cleanup();
  consumePendingCallOffer(conversationId);
  systemEventCounter += 1;

  dispatch(
    addChatSystemEvent({
      id: `call-ended-${conversationId}-${nowMs}-${systemEventCounter}`,
      conversationId,
      text: `Call ended ${durationText}`,
      createdAt: new Date(nowMs).toISOString(),
    }),
  );
  dispatch(endCall(durationText));

  return true;
}

export async function initiateOutgoingCall({
  conversationId,
  peerName,
  dispatch,
  getState,
  socket,
}: {
  conversationId: number;
  peerName: string;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
  socket: SocketClient | null;
}): Promise<boolean> {
  const currentStatus = getState().call.status;
  if (currentStatus === "ringing" || currentStatus === "connected") {
    return false;
  }

  const engine = getCallEngine();
  dispatch(startOutgoingCall({ conversationId, peerName }));

  try {
    const offerSdp = await engine.startOffer(conversationId);
    if (socket?.isConnected()) {
      await socket.emit("call:offer", { conversationId, sdp: offerSdp });
    }
    return true;
  } catch {
    finalizeCallEnded({ dispatch, getState, conversationId });
    return false;
  }
}

export async function acceptIncomingCallFlow({
  conversationId,
  dispatch,
  getState,
  socket,
}: {
  conversationId: number;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
  socket: SocketClient | null;
}): Promise<void> {
  const engine = getCallEngine();
  const offerSdp = consumePendingCallOffer(conversationId);

  try {
    const answerSdp = await engine.acceptOffer(conversationId, offerSdp);
    dispatch(acceptCall(new Date().toISOString()));
    if (socket?.isConnected()) {
      await socket.emit("call:answer", { conversationId, sdp: answerSdp });
    }
  } catch {
    finalizeCallEnded({ dispatch, getState, conversationId });
  }
}

export async function declineIncomingCallFlow({
  conversationId,
  dispatch,
  getState,
  socket,
}: {
  conversationId: number;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
  socket: SocketClient | null;
}): Promise<void> {
  finalizeCallEnded({ dispatch, getState, conversationId });
  if (socket?.isConnected()) {
    await socket.emit("call:reject", { conversationId }).catch(() => {});
  }
}

export async function endActiveCallFlow({
  conversationId,
  dispatch,
  getState,
  socket,
}: {
  conversationId: number;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
  socket: SocketClient | null;
}): Promise<void> {
  finalizeCallEnded({ dispatch, getState, conversationId });
  if (socket?.isConnected()) {
    await socket.emit("call:end", { conversationId }).catch(() => {});
  }
}

export function toggleCallMuteFlow(
  dispatch: AppDispatch,
  currentlyMuted: boolean,
): boolean {
  const nextMuted = getCallEngine().setMuted(!currentlyMuted);
  dispatch(setCallMuted(nextMuted));
  return nextMuted;
}

export function handleIncomingCallSocketEvent({
  conversationId,
  sdp,
  peerName,
  dispatch,
  getState,
}: {
  conversationId: number;
  sdp: unknown;
  peerName: string;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
}): void {
  const currentStatus = getState().call.status;
  if (currentStatus === "ringing" || currentStatus === "connected") {
    return;
  }

  setPendingCallOffer(conversationId, sdp);
  dispatch(receiveIncomingCall({ conversationId, peerName }));
}

export async function handleAnsweredCallSocketEvent({
  conversationId,
  sdp,
  dispatch,
  getState,
}: {
  conversationId: number;
  sdp: unknown;
  dispatch: AppDispatch;
  getState: () => Pick<RootState, "call">;
}): Promise<void> {
  const current = getState().call;
  if (current.conversationId !== conversationId || current.status !== "ringing") {
    return;
  }

  await getCallEngine().handleAnswer(sdp);
  dispatch(acceptCall(new Date().toISOString()));
}
