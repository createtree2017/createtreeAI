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
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Mom Companion</h2>
        <p className="text-neutral-dark">Chat with your supportive AI friend anytime</p>
      </div>
      
      {/* Chat Interface */}
      <div className="bg-white rounded-xl shadow-soft border border-neutral-light overflow-hidden flex flex-col" style={{ height: "70vh", maxHeight: "600px" }}>
        <div className="p-3 border-b border-neutral-light bg-neutral-lightest">
          <div className="flex items-center space-x-3">
            <div className="bg-accent1-light text-accent1-dark rounded-full p-2 w-10 h-10 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">MomMelody Assistant</h3>
              <p className="text-xs text-neutral-dark">Always here to support you</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" id="chatMessages">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent1"></div>
            </div>
          ) : chatMessages && chatMessages.length > 0 ? (
            chatMessages.map((msg: ChatMessage) => (
              msg.role === "assistant" ? (
                <div key={msg.id} className="flex items-end space-x-2">
                  <div className="bg-accent1-light text-accent1-dark rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-neutral-lightest rounded-t-lg rounded-r-lg p-3 max-w-xs shadow-softer">
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-neutral-dark mt-1">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-end justify-end space-x-2">
                  <div className="bg-primary-light rounded-t-lg rounded-l-lg p-3 max-w-xs shadow-softer">
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-neutral-dark mt-1">{formatTime(msg.createdAt)}</p>
                  </div>
                  <div className="bg-primary text-white rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Bot className="h-12 w-12 text-accent1-dark mb-3" />
              <h3 className="font-heading font-semibold text-lg mb-2">Welcome to Mom Companion</h3>
              <p className="text-neutral-dark">I'm here to support you through your motherhood journey. Feel free to ask me anything!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 border-t border-neutral-light">
          <form className="flex items-center space-x-2" onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 p-3 rounded-lg border border-neutral focus:border-accent1-dark focus:ring focus:ring-accent1-light focus:ring-opacity-50 outline-none transition"
              ref={inputRef}
            />
            <Button
              type="submit"
              className="bg-accent1 hover:bg-accent1-dark text-white p-3 rounded-lg transition-colors"
              disabled={isSending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
      
      {/* Quick Topics */}
      <div className="mt-5">
        <h3 className="font-heading font-semibold text-lg mb-3">Suggested Topics</h3>
        <div className="flex flex-wrap gap-2">
          {suggestedTopics.map((topic, index) => (
            <button
              key={index}
              className="bg-neutral-lightest hover:bg-accent1-light text-neutral-darkest hover:text-accent1-dark text-sm py-2 px-3 rounded-full transition-colors border border-neutral"
              onClick={() => handleTopicSelect(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
