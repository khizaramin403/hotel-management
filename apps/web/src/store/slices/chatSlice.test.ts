import { describe, expect, it } from "vitest";
import {
  chatReducer,
  clearConversationUnread,
  incrementConversationUnread,
  resetChat,
  selectActiveConversationId,
  selectActiveConversationTyping,
  selectTotalUnreadCount,
  selectTypingByConversation,
  selectUnreadByConversation,
  setActiveConversation,
  setConversationTyping,
  setConversationUnread,
} from "./chatSlice";

describe("chatSlice", () => {
  it("tracks unread counts per conversation and clears unread when activating a conversation", () => {
    let state = chatReducer(undefined, setConversationUnread({ conversationId: 1, count: 2 }));
    state = chatReducer(state, incrementConversationUnread(2));
    state = chatReducer(state, incrementConversationUnread(2));

    expect(selectUnreadByConversation({ chat: state })).toEqual({ 1: 2, 2: 2 });
    expect(selectTotalUnreadCount({ chat: state })).toBe(4);

    state = chatReducer(state, setActiveConversation(2));
    expect(selectActiveConversationId({ chat: state })).toBe(2);
    expect(selectTotalUnreadCount({ chat: state })).toBe(2);

    state = chatReducer(state, clearConversationUnread(1));
    expect(selectTotalUnreadCount({ chat: state })).toBe(0);
  });

  it("updates typing state and resets chat state cleanly", () => {
    let state = chatReducer(undefined, setActiveConversation(5));
    state = chatReducer(state, setConversationTyping({ conversationId: 5, isTyping: true }));

    expect(selectTypingByConversation({ chat: state })).toEqual({ 5: true });
    expect(selectActiveConversationTyping({ chat: state })).toBe(true);

    const resetState = chatReducer(state, resetChat());
    expect(selectActiveConversationId({ chat: resetState })).toBeNull();
    expect(selectActiveConversationTyping({ chat: resetState })).toBe(false);
    expect(selectTotalUnreadCount({ chat: resetState })).toBe(0);
  });
});
