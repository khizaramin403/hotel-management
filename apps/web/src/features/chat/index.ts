export {
  ChatInputBar,
  MAX_MESSAGE_LENGTH,
  TYPING_START_DEBOUNCE_MS,
  TYPING_STOP_DEBOUNCE_MS,
  type ChatInputBarProps,
} from "./components/ChatInputBar";
export { ChatMessage, type ChatMessageProps } from "./components/ChatMessage";
export { ChatThread, type ChatThreadProps } from "./components/ChatThread";
export { ConversationList, type ConversationListProps } from "./components/ConversationList";
export { GuestChatView, type GuestChatViewProps } from "./components/GuestChatView";
export { StaffChatView, type StaffChatViewProps } from "./components/StaffChatView";
export {
  TypingIndicatorBubble,
  type TypingIndicatorBubbleProps,
} from "./components/TypingIndicatorBubble";
export {
  CHAT_CONVERSATIONS_LIMIT,
  CHAT_MESSAGES_PAGE_SIZE,
  GUEST_CONVERSATION_QUERY_KEY,
  flattenChronologicalMessages,
  useConversationMessagesInfiniteQuery,
  useConversationsQuery,
  useGuestConversationQuery,
} from "./hooks/useChatQueries";
export {
  MESSAGE_GROUP_WINDOW_MS,
  formatChatDatePill,
  formatChatTime,
  groupChatMessages,
  type GroupedThreadItem,
  type MessageDeliveryStatus,
  type ThreadMessageItem,
} from "./lib/chatFormat";
