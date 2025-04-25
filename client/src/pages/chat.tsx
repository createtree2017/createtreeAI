import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages, useSendMessage, suggestedTopics, type ChatMessage } from "@/lib/openai";
import { Bot, Send, User } from "lucide-react";
import { format } from 'date-fns';

export default function Chat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get chat messages
  const { data: chatMessages, isLoading: isLoadingMessages } = useChatMessages();
  
  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendMessage(message);
    setMessage("");
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const handleTopicSelect = (topic: string) => {
    setMessage(topic);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };
  
  // Topic categories for better organization
  const topicCategories = [
    {
      name: "Pregnancy",
      emoji: "👶",
      topics: ["Managing morning sickness", "Pregnancy nutrition", "Sleep positions", "Baby's movement tracking"]
    },
    {
      name: "Postpartum",
      emoji: "🌸", 
      topics: ["Postpartum recovery", "Self-care ideas", "Handling emotions", "Body changes"]
    },
    {
      name: "Baby Care",
      emoji: "🍼",
      topics: ["Baby sleep tips", "Breastfeeding advice", "Baby development", "Diaper rash remedies"]
    },
    {
      name: "Self Care",
      emoji: "💆‍♀️",
      topics: ["Time management", "Healthy meal ideas", "Stress relief", "Partner relationships"]
    }
  ] as const;
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Mom's Support Circle</h2>
        <p className="text-neutral-dark">Your personal companion throughout your motherhood journey</p>
      </div>
      
      {/* Chat Interface */}
      <div className="bg-white rounded-xl shadow-soft border border-neutral-light overflow-hidden flex flex-col" style={{ height: "65vh", maxHeight: "550px" }}>
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-light bg-gradient-to-r from-primary-light/40 to-accent1-light/30">
          <div className="flex items-center space-x-3">
            <div className="bg-white text-primary rounded-full p-2 w-11 h-11 flex items-center justify-center shadow-sm">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-primary-dark">Maternal Guide</h3>
              <p className="text-xs text-neutral-dark">
                {isSending ? "Thinking..." : "Here to support you 24/7"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" id="chatMessages">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chatMessages && Array.isArray(chatMessages) && chatMessages.length > 0 ? (
            chatMessages.map((msg: ChatMessage) => (
              msg.role === "assistant" ? (
                <div key={msg.id} className="flex items-start space-x-2 animate-fadeIn">
                  <div className="bg-primary-light text-primary rounded-full p-1.5 w-8 h-8 flex items-center justify-center mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-neutral-lightest rounded-t-xl rounded-br-xl p-3 max-w-[85%] shadow-softer">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs text-neutral-dark mt-1.5">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start justify-end space-x-2 animate-fadeIn">
                  <div className="bg-primary/10 rounded-t-xl rounded-bl-xl p-3 max-w-[85%] shadow-softer">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs text-neutral-dark mt-1.5">{formatTime(msg.createdAt)}</p>
                  </div>
                  <div className="bg-primary text-white rounded-full p-1.5 w-8 h-8 flex items-center justify-center mt-1">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="bg-primary-light/20 p-4 rounded-full mb-3">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Welcome to Your Support Circle</h3>
              <p className="text-neutral-dark max-w-md">
                I'm here to guide and support you through every stage of motherhood. 
                Feel free to ask me anything about pregnancy, baby care, or self-care!
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-primary-light/10 hover:bg-primary-light/30 text-primary border-primary-light"
                  onClick={() => handleTopicSelect("Can you share some pregnancy self-care tips?")}
                >
                  Start a conversation
                </Button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input */}
        <div className="p-3 border-t border-neutral-light bg-neutral-lightest/50">
          <form className="flex items-center space-x-2" onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Ask about pregnancy, baby care, or mom tips..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 p-3 rounded-lg border border-neutral focus:border-primary focus:ring focus:ring-primary-light/30 focus:ring-opacity-50 outline-none transition"
              ref={inputRef}
            />
            <Button
              type="submit"
              className={`p-3 rounded-lg transition-colors ${
                isSending
                  ? "bg-neutral text-neutral-darkest"
                  : "bg-primary hover:bg-primary-dark text-white"
              }`}
              disabled={isSending}
            >
              {isSending ? (
                <div className="h-5 w-5 border-2 border-t-transparent border-neutral-dark rounded-full animate-spin"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
      
      {/* Topic Categories */}
      <div className="mt-6">
        <h3 className="font-heading font-semibold text-lg mb-3">Conversation Starters</h3>
        <div className="space-y-4">
          {topicCategories.map((category, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-soft border border-neutral-light p-3">
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">{category.emoji}</span>
                <h4 className="font-medium text-primary-dark">{category.name}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.topics.map((topic, index) => (
                  <button
                    key={index}
                    className="bg-neutral-lightest hover:bg-primary-light/20 text-neutral-darkest hover:text-primary-dark text-sm py-1.5 px-3 rounded-full transition-colors border border-neutral-light"
                    onClick={() => handleTopicSelect(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
