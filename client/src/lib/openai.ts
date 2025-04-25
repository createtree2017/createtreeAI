import { useMutation, useQuery } from "@tanstack/react-query";
import { sendChatMessage, getChatHistory } from "./api";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export const useChatMessages = () => {
  return useQuery({
    queryKey: ["/api/chat/history"],
    refetchOnWindowFocus: false,
  });
};

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
