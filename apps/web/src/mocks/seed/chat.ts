import type { Conversation, Message, Role, User } from "@hotel/shared";

export interface SeedChatBundle {
  conversations: Conversation[];
  messages: Message[];
  nextConversationId: number;
  nextMessageId: number;
}

const VIRTUALIZATION_SEED_MESSAGE_COUNT = 150;

const GUEST_SNIPPETS = [
  "Hello, I have a question about my upcoming stay.",
  "Can I request an early check-in around 11:00 AM if a room is ready?",
  "Also, is airport pickup available from Islamabad airport?",
  "Thank you! Could you also confirm whether breakfast is included?",
  "We are travelling with a toddler and would love a quiet room away from the elevator.",
  "Sounds great. Can we add a baby cot to the booking notes?",
  "Got it, thanks for confirming that so quickly.",
  "One more question: is late check-out possible on Sunday until 2:00 PM?",
] as const;

const STAFF_SNIPPETS = [
  "Welcome to Grand Hotel! We are happy to help with your stay.",
  "I have added an early check-in note to your reservation; we will prioritize getting your room ready.",
  "Yes, private airport transfers can be arranged 24 hours before arrival.",
  "Breakfast for all registered guests is served daily from 7:00 AM to 10:30 AM.",
  "Certainly, we have noted a quiet room on an upper floor for your family.",
  "A complimentary baby cot has been added to your reservation preferences.",
  "Late check-out until 2:00 PM is complimentary whenever availability permits on departure day.",
  "Please let reception know anytime if you need anything else before arrival.",
] as const;

function buildConversationOneMessages(
  guestId: number,
  staffId: number,
  anchorMs: number,
): Message[] {
  const messages: Message[] = [];
  const startMs = anchorMs - 4 * 24 * 60 * 60 * 1000;
  let cursorMs = startMs;

  for (let index = 0; index < VIRTUALIZATION_SEED_MESSAGE_COUNT; index += 1) {
    // Mix close consecutive bursts (< 2 min) with wider gaps across days for realistic grouping.
    if (index > 0) {
      cursorMs += index % 5 === 0 ? 45 * 60 * 1000 : 45 * 1000;
    }

    const isLastTwoFromGuest = index >= VIRTUALIZATION_SEED_MESSAGE_COUNT - 2;
    const isGuestTurn = isLastTwoFromGuest || index % 2 === 0;
    const senderRole: Role = isGuestTurn ? "guest" : "staff";
    const senderId = isGuestTurn ? guestId : staffId;
    const bank = isGuestTurn ? GUEST_SNIPPETS : STAFF_SNIPPETS;
    const baseText = bank[index % bank.length] ?? "Thank you.";
    const text =
      index === VIRTUALIZATION_SEED_MESSAGE_COUNT - 2
        ? "Quick follow-up: what is the Wi-Fi policy for the executive lounge?"
        : index === VIRTUALIZATION_SEED_MESSAGE_COUNT - 1
          ? "Also could you share the breakfast timings again?"
          : `${baseText} (Note #${index + 1})`;

    messages.push({
      id: index + 1,
      conversationId: 1,
      senderId,
      senderRole,
      text,
      createdAt: new Date(cursorMs).toISOString(),
    });
  }

  return messages;
}

export function createSeedChat(users: readonly User[], now: Date = new Date()): SeedChatBundle {
  const guestOne = users.find((u) => u.id === 1) ?? { id: 1, name: "Sara Khan", role: "guest" as const };
  const guestTwo = users.find((u) => u.id === 4) ?? { id: 4, name: "Omar Sheikh", role: "guest" as const };
  const guestThree = users.find((u) => u.id === 5) ?? {
    id: 5,
    name: "Zara Ahmed",
    role: "guest" as const,
  };
  const staff = users.find((u) => u.role === "staff") ?? { id: 2, name: "Ali Raza", role: "staff" as const };

  const anchorMs = now.getTime();
  const convOneMessages = buildConversationOneMessages(guestOne.id, staff.id, anchorMs);
  const convOneLast = convOneMessages[convOneMessages.length - 1]!;

  const convTwoMessages: Message[] = [
    {
      id: 151,
      conversationId: 2,
      senderId: guestTwo.id,
      senderRole: "guest",
      text: "Hello reception, is covered parking available tonight?",
      createdAt: new Date(anchorMs - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 152,
      conversationId: 2,
      senderId: staff.id,
      senderRole: "staff",
      text: "Yes Mr. Sheikh, underground valet parking is complimentary for all guests.",
      createdAt: new Date(anchorMs - 115 * 60 * 1000).toISOString(),
    },
    {
      id: 153,
      conversationId: 2,
      senderId: guestTwo.id,
      senderRole: "guest",
      text: "Perfect, I will arrive around 9:30 PM.",
      createdAt: new Date(anchorMs - 25 * 60 * 1000).toISOString(),
    },
  ];
  const convTwoLast = convTwoMessages[convTwoMessages.length - 1]!;

  const convThreeMessages: Message[] = [
    {
      id: 154,
      conversationId: 3,
      senderId: guestThree.id,
      senderRole: "guest",
      text: "Do the Suite rooms include a balcony overlooking the garden?",
      createdAt: new Date(anchorMs - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 155,
      conversationId: 3,
      senderId: staff.id,
      senderRole: "staff",
      text: "Yes, both third-floor Suites overlook the courtyard garden.",
      createdAt: new Date(anchorMs - 4 * 60 * 60 * 1000).toISOString(),
    },
  ];
  const convThreeLast = convThreeMessages[convThreeMessages.length - 1]!;

  const conversations: Conversation[] = [
    {
      id: 1,
      guestId: guestOne.id,
      guestName: guestOne.name,
      staffId: staff.id,
      status: "open",
      lastMessage: {
        text: convOneLast.text,
        createdAt: convOneLast.createdAt,
      },
      unreadCount: 2,
    },
    {
      id: 2,
      guestId: guestTwo.id,
      guestName: guestTwo.name,
      staffId: staff.id,
      status: "open",
      lastMessage: {
        text: convTwoLast.text,
        createdAt: convTwoLast.createdAt,
      },
      unreadCount: 1,
    },
    {
      id: 3,
      guestId: guestThree.id,
      guestName: guestThree.name,
      staffId: null,
      status: "open",
      lastMessage: {
        text: convThreeLast.text,
        createdAt: convThreeLast.createdAt,
      },
      unreadCount: 0,
    },
  ];

  const messages = [...convOneMessages, ...convTwoMessages, ...convThreeMessages];

  return {
    conversations,
    messages,
    nextConversationId: 4,
    nextMessageId: 156,
  };
}
