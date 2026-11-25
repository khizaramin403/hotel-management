import { describe, expect, it } from "vitest";
import {
  acceptCall,
  callReducer,
  endCall,
  receiveIncomingCall,
  resetCall,
  selectCallConversationId,
  selectCallDirection,
  selectCallStartedAt,
  selectCallStatus,
  startOutgoingCall,
} from "./callSlice";

describe("callSlice", () => {
  it("handles outgoing call ringing, accept, end, and reset transitions", () => {
    let state = callReducer(undefined, startOutgoingCall(10));
    expect(selectCallStatus({ call: state })).toBe("ringing");
    expect(selectCallConversationId({ call: state })).toBe(10);
    expect(selectCallDirection({ call: state })).toBe("outgoing");
    expect(selectCallStartedAt({ call: state })).toBeNull();

    state = callReducer(state, acceptCall("2026-11-25T10:15:00.000Z"));
    expect(selectCallStatus({ call: state })).toBe("connected");
    expect(selectCallStartedAt({ call: state })).toBe("2026-11-25T10:15:00.000Z");

    state = callReducer(state, endCall());
    expect(selectCallStatus({ call: state })).toBe("ended");

    state = callReducer(state, resetCall());
    expect(selectCallStatus({ call: state })).toBe("idle");
    expect(selectCallConversationId({ call: state })).toBeNull();
    expect(selectCallDirection({ call: state })).toBeNull();
    expect(selectCallStartedAt({ call: state })).toBeNull();
  });

  it("handles incoming call ringing state", () => {
    const state = callReducer(undefined, receiveIncomingCall(42));
    expect(selectCallStatus({ call: state })).toBe("ringing");
    expect(selectCallConversationId({ call: state })).toBe(42);
    expect(selectCallDirection({ call: state })).toBe("incoming");
    expect(selectCallStartedAt({ call: state })).toBeNull();
  });
});
