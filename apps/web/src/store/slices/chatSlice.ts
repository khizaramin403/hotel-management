import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ChatState {
  activeConversationId: number | null;
  unreadByConversation: Record<number, number>;
  typingByConversation: Record<number, boolean>;
}

const initialState: ChatState = {
  activeConversationId: null,
  unreadByConversation: {},
  typingByConversation: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<number | null>) {
      state.activeConversationId = action.payload;
      if (action.payload !== null) {
        state.unreadByConversation[action.payload] = 0;
      }
    },
    setConversationUnread(state, action: PayloadAction<{ conversationId: number; count: number }>) {
      state.unreadByConversation[action.payload.conversationId] = Math.max(0, action.payload.count);
    },
    incrementConversationUnread(state, action: PayloadAction<number>) {
      const current = state.unreadByConversation[action.payload] ?? 0;
      state.unreadByConversation[action.payload] = current + 1;
    },
    clearConversationUnread(state, action: PayloadAction<number>) {
      state.unreadByConversation[action.payload] = 0;
    },
    setConversationTyping(
      state,
      action: PayloadAction<{ conversationId: number; isTyping: boolean }>,
    ) {
      state.typingByConversation[action.payload.conversationId] = action.payload.isTyping;
    },
    resetChat() {
      return initialState;
    },
  },
});

export const {
  setActiveConversation,
  setConversationUnread,
  incrementConversationUnread,
  clearConversationUnread,
  setConversationTyping,
  resetChat,
} = chatSlice.actions;
export const chatReducer = chatSlice.reducer;

export const selectActiveConversationId = (state: { chat: ChatState }) =>
  state.chat.activeConversationId;
export const selectUnreadByConversation = (state: { chat: ChatState }) =>
  state.chat.unreadByConversation;
export const selectTypingByConversation = (state: { chat: ChatState }) =>
  state.chat.typingByConversation;

export const selectTotalUnreadCount = createSelector(
  [selectUnreadByConversation],
  (unreadByConversation) =>
    Object.values(unreadByConversation).reduce((total, count) => total + count, 0),
);

export const selectActiveConversationTyping = createSelector(
  [selectActiveConversationId, selectTypingByConversation],
  (activeId, typingByConversation) =>
    activeId !== null ? Boolean(typingByConversation[activeId]) : false,
);
