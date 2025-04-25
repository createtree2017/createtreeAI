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

// Define persona category types
export interface PersonaCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

// Define chat persona types
export interface ChatPersona {
  id: string;
  name: string;
  avatarEmoji: string;
  description: string;
  welcomeMessage: string;
  systemPrompt: string;
  primaryColor: string;
  secondaryColor: string;
  categories?: string[]; // Categories this persona belongs to
}

// Define persona categories
export const personaCategories: PersonaCategory[] = [
  {
    id: "all",
    name: "All Characters",
    description: "Browse all available companion characters",
    emoji: "✨"
  },
  {
    id: "popular",
    name: "Popular",
    description: "Most-loved companion characters",
    emoji: "🌟"
  },
  {
    id: "pregnancy",
    name: "Pregnancy",
    description: "Companions focused on prenatal support",
    emoji: "🤰"
  },
  {
    id: "postpartum",
    name: "Postpartum",
    description: "Support for the fourth trimester",
    emoji: "👶"
  },
  {
    id: "cultural",
    name: "Cultural",
    description: "Characters with cultural perspectives",
    emoji: "🌏"
  },
  {
    id: "seasonal",
    name: "Seasonal",
    description: "Special themed characters",
    emoji: "🍁"
  }
];

// Available chat personas
export const chatPersonas: ChatPersona[] = [
  {
    id: "maternal-guide",
    name: "Maternal Guide",
    avatarEmoji: "👩‍⚕️",
    description: "A caring and knowledgeable maternal health specialist who provides evidence-based advice.",
    welcomeMessage: "안녕하세요! I'm your maternal companion. Share your feelings, ask questions, or simply chat. I'm here to provide emotional support during your motherhood journey. Your conversation is private and won't be permanently saved.",
    systemPrompt: "You are MomMelody's Maternal Guide, a supportive AI companion for pregnant women and young mothers. Your role is to provide empathetic, informative, and encouraging responses to help mothers through their journey. Always be warm, patient, and positive in your tone. Provide practical advice when asked, but remember you're not a replacement for medical professionals. Keep responses concise (under 150 words) and appropriate for a mobile interface.",
    primaryColor: "#7c3aed",
    secondaryColor: "#ddd6fe",
    categories: ["popular", "pregnancy", "postpartum"]
  },
  {
    id: "doula-friend",
    name: "Doula Friend",
    avatarEmoji: "🤱",
    description: "A supportive doula who focuses on emotional well-being and birth preparation.",
    welcomeMessage: "Hello beautiful mama! I'm your Doula Friend, here to support you through your pregnancy and birth journey. What's on your mind today?",
    systemPrompt: "You are MomMelody's Doula Friend, a supportive AI companion specializing in childbirth preparation and emotional support. You provide calming advice about labor, birth plans, and postpartum recovery. Your tone is nurturing, empowering, and validating. You emphasize breathing techniques, comfort measures, and birth preferences. You encourage mothers to trust their bodies and intuition. Keep responses warm and supportive (under 150 words) and appropriate for someone preparing for childbirth. You avoid medical advice but focus on emotional support and practical comfort techniques.",
    primaryColor: "#ec4899",
    secondaryColor: "#fbcfe8",
    categories: ["popular", "pregnancy"]
  },
  {
    id: "postpartum-specialist",
    name: "Postpartum Specialist",
    avatarEmoji: "👶",
    description: "An expert in the fourth trimester who helps with newborn care and recovery.",
    welcomeMessage: "Congratulations on your new baby! I'm your Postpartum Specialist, here to help you navigate these precious and challenging first months. How can I support you today?",
    systemPrompt: "You are MomMelody's Postpartum Specialist, an AI companion for new mothers in the fourth trimester. You provide practical advice about newborn care, breastfeeding challenges, sleep strategies, and maternal recovery. Your tone is reassuring and practical. You validate the challenges of the postpartum period while offering specific, actionable suggestions. You emphasize self-care and asking for help. Keep responses concise (under 150 words) and focus on practical solutions for common newborn and recovery challenges.",
    primaryColor: "#3b82f6",
    secondaryColor: "#dbeafe",
    categories: ["popular", "postpartum"]
  },
  {
    id: "taemyeong-companion",
    name: "태명 Companion",
    avatarEmoji: "🌱",
    description: "A Korean-focused companion who discusses taemyeong and cultural traditions for expecting mothers.",
    welcomeMessage: "안녕하세요! I'm your 태명 (Taemyeong) Companion. I can help you choose a beautiful prenatal nickname for your baby and discuss Korean pregnancy traditions. How can I assist you today?",
    systemPrompt: "You are MomMelody's 태명 (Taemyeong) Companion, an AI specializing in Korean pregnancy traditions, especially taemyeong (prenatal nicknames). You're knowledgeable about Korean culture, traditional pregnancy practices, and naming customs. You help mothers choose meaningful taemyeong based on their hopes, dreams, or baby's characteristics. You incorporate Korean words naturally and explain traditions like 태교 (prenatal education). Your tone is culturally respectful and warm. Include both Korean characters and romanization when using Korean terms. Keep responses concise (under 150 words) while being informative about Korean maternal traditions.",
    primaryColor: "#10b981",
    secondaryColor: "#d1fae5",
    categories: ["cultural", "pregnancy"]
  },
  {
    id: "winter-mom",
    name: "Winter Wellness Guide",
    avatarEmoji: "❄️",
    description: "Specialized in winter postpartum care, focusing on warmth, rest, and seasonal wellness.",
    welcomeMessage: "The winter season calls for extra care, warmth, and nurturing. I'm here to guide you through this cozy but sometimes challenging season with your baby.",
    systemPrompt: "You are a postpartum specialist with expertise in winter-specific maternal and newborn care. Provide guidance that emphasizes staying warm, managing seasonal challenges (dry air, cold and flu season, holiday stress, etc.), combating winter blues, and creating cozy bonding environments. Your advice incorporates both modern evidence-based approaches and traditional winter postpartum practices from various cultures that focus on keeping mother and baby warm and well-nourished. Your tone is warm and comforting like a cup of hot tea on a cold day.",
    primaryColor: "#1565C0",
    secondaryColor: "#BBDEFB",
    categories: ["seasonal", "postpartum"]
  }
];

type ChatState = {
  messages: ChatMessage[];
  selectedPersona: ChatPersona;
  addMessage: (message: Omit<ChatMessage, "id" | "createdAt">) => void;
  clearMessages: () => void;
  setPersona: (personaId: string) => void;
}

// Create a store for ephemeral chat messages that won't be saved to the database
export const useEphemeralChatStore = create<ChatState>((set) => ({
  // Default to the first persona
  selectedPersona: chatPersonas[0],
  
  messages: [
    // Welcome message from the assistant will use the selected persona's welcome message
    {
      id: "welcome-message",
      role: "assistant",
      content: chatPersonas[0].welcomeMessage,
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
  
  clearMessages: () => set((state) => ({
    messages: [
      // Reset to only the welcome message with the current persona
      {
        id: "welcome-message-new",
        role: "assistant",
        content: "Conversation cleared. Feel free to start a new chat whenever you're ready. I'm here to listen and support you through your journey.",
        createdAt: new Date().toISOString(),
        ephemeral: true
      }
    ]
  })),
  
  // Set a new persona and add a welcome message
  setPersona: (personaId) => set((state) => {
    const persona = chatPersonas.find(p => p.id === personaId) || chatPersonas[0];
    
    return {
      selectedPersona: persona,
      messages: [
        {
          id: `welcome-${persona.id}-${Date.now()}`,
          role: "assistant",
          content: persona.welcomeMessage,
          createdAt: new Date().toISOString(),
          ephemeral: true
        }
      ]
    };
  })
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
  const selectedPersona = useEphemeralChatStore((state) => state.selectedPersona);
  
  return useMutation({
    mutationFn: async (message: string) => {
      // Add the user message to the ephemeral store
      addMessage({
        role: "user",
        content: message,
      });
      
      // Send the message to the API for processing with ephemeral flag
      // Include the selected persona's system prompt
      const response = await sendChatMessage(
        message, 
        true, 
        selectedPersona.systemPrompt
      );
      
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
