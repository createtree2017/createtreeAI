import { useMutation, useQuery } from "@tanstack/react-query";
import { sendChatMessage, getChatHistory } from "./api";
import { create } from "zustand";
import { format } from "date-fns";

export interface ChatMessage {
  id: number | string;  // Can be string for ephemeral messages
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  ephemeral?: boolean;
}

type ChatState = {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "createdAt">) => void;
  clearMessages: () => void;
}

// Create a store for ephemeral chat messages that won't be saved to the database
export const useEphemeralChatStore = create<ChatState>((set) => ({
  messages: [
    // Welcome message from the assistant
    {
      id: "welcome-message",
      role: "assistant",
      content: "안녕하세요! I'm your maternal companion. Share your feelings, ask questions, or simply chat. I'm here to provide emotional support during your motherhood journey. Your conversation is private and won't be permanently saved.",
      createdAt: new Date().toISOString(),
      ephemeral: true
    }
  ],
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: `ephemeral-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date().toISOString(),
        ...message,
        ephemeral: true
      }
    ]
  })),
  clearMessages: () => set(() => ({
    messages: [
      // Reset to only the welcome message
      {
        id: "welcome-message-new",
        role: "assistant",
        content: "Conversation cleared. Feel free to start a new chat whenever you're ready. I'm here to listen and support you through your journey.",
        createdAt: new Date().toISOString(),
        ephemeral: true
      }
    ]
  }))
}));

// Legacy API-based messages hook (kept for compatibility)
export const useChatMessages = () => {
  return useQuery({
    queryKey: ["/api/chat/history"],
    refetchOnWindowFocus: false,
    enabled: false, // Disabled since we're using ephemeral chat
  });
};

// This hook uses the AI API to generate a response, but stores messages in memory only
export const useSendEphemeralMessage = () => {
  const addMessage = useEphemeralChatStore((state) => state.addMessage);
  
  return useMutation({
    mutationFn: async (message: string) => {
      // Add the user message to the ephemeral store
      addMessage({
        role: "user",
        content: message,
      });
      
      // Send the message to the API for processing with ephemeral flag
      // This will still hit the server endpoint but won't store in database
      const response = await sendChatMessage(message, true);
      
      // Add the AI response to the ephemeral store
      addMessage({
        role: "assistant",
        content: response.assistantMessage.content,
      });
      
      return response;
    }
  });
};

// Legacy API-based send message hook (kept for compatibility)
export const useSendMessage = () => {
  return useMutation({
    mutationFn: (message: string) => sendChatMessage(message),
    onSuccess: (_data, _variables, _context) => {
      // We invalidate the chat history query to refetch after sending a message
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
    },
  });
};

// List of suggested topics for the chat
export const suggestedTopics = [
  "Baby sleep tips",
  "Self-care ideas",
  "Postpartum recovery",
  "Breastfeeding advice",
  "Handling stress",
  "Baby development",
  "Time management",
  "Healthy meal ideas"
];

import { queryClient } from "./queryClient";
