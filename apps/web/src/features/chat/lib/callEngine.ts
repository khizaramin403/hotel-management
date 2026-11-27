export interface CallEngine {
  /** Initiates an outgoing call and returns the mock or real SDP offer. */
  startOffer(conversationId: number): Promise<unknown>;
  /** Answers an incoming call given the caller's SDP offer and returns the SDP answer. */
  acceptOffer(conversationId: number, remoteOfferSdp: unknown): Promise<unknown>;
  /** Completes signaling when the remote side answers an outgoing offer. */
  handleAnswer(remoteAnswerSdp: unknown): Promise<void>;
  /** Applies an incoming ICE candidate. */
  addIceCandidate(candidate: unknown): Promise<void>;
  /** Sets local microphone mute state and returns the updated state. */
  setMuted(muted: boolean): boolean;
  /** Returns whether local microphone audio is currently muted. */
  isMuted(): boolean;
  /** Releases local media and signaling state when a call terminates. */
  cleanup(): void;
}

export class MockCallEngine implements CallEngine {
  private muted = false;

  async startOffer(conversationId: number): Promise<unknown> {
    this.muted = false;
    return {
      type: "offer",
      sdp: `v=0\r\no=- ${conversationId} 1 IN IP4 127.0.0.1\r\ns=Grand Hotel Mock Offer\r\n`,
    };
  }

  async acceptOffer(conversationId: number): Promise<unknown> {
    this.muted = false;
    return {
      type: "answer",
      sdp: `v=0\r\no=- ${conversationId} 2 IN IP4 127.0.0.1\r\ns=Grand Hotel Mock Answer\r\n`,
    };
  }

  async handleAnswer(): Promise<void> {
    return Promise.resolve();
  }

  async addIceCandidate(): Promise<void> {
    return Promise.resolve();
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  cleanup(): void {
    this.muted = false;
  }
}

let activeCallEngine: CallEngine = new MockCallEngine();

export function getCallEngine(): CallEngine {
  return activeCallEngine;
}

export function setCallEngine(engine: CallEngine): void {
  activeCallEngine = engine;
}

export function resetCallEngine(): void {
  activeCallEngine.cleanup();
  activeCallEngine = new MockCallEngine();
}

/** Formats non-negative elapsed seconds into MM:SS (e.g. 134 -> "02:14"). */
export function formatCallDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Computes whole elapsed seconds from an ISO startedAt timestamp until nowMs. */
export function computeElapsedCallSeconds(
  startedAt: string | null,
  nowMs: number = Date.now(),
): number {
  if (!startedAt) {
    return 0;
  }
  const startMs = Date.parse(startedAt);
  if (Number.isNaN(startMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}
