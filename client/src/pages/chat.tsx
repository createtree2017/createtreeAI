import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEphemeralChatStore, useSendEphemeralMessage, suggestedTopics, chatPersonas, personaCategories, type ChatMessage, type ChatPersona, type PersonaCategory } from "@/lib/openai";
import { Bot, Send, User, Trash2, RefreshCw, Check, BookmarkIcon, Heart } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import SaveChatDialog from "@/components/SaveChatDialog";

// Persona selection component
function PersonaSelector() {
  const selectedPersona = useEphemeralChatStore((state) => state.selectedPersona);
  const setPersona = useEphemeralChatStore((state) => state.setPersona);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  const handleSelectPersona = (persona: ChatPersona) => {
    setPersona(persona.id);
    setIsOpen(false);
    toast({
      title: `Now chatting with ${persona.name}`,
      description: persona.description,
    });
  };
  
  // Filter personas by category and search query
  const filteredPersonas = useMemo(() => {
    return chatPersonas.filter(persona => {
      // Filter by category
      const matchesCategory = 
        activeCategory === "all" || 
        (persona.categories && persona.categories.includes(activeCategory));
      
      // Filter by search query
      const matchesSearch = 
        searchQuery === "" || 
        persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        persona.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);
  
  return (
    <div className="mb-6">
      <h3 className="font-heading font-semibold text-lg mb-3">Choose Your Companion</h3>
      
      {/* Selected persona */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white p-4 rounded-lg shadow-soft border border-neutral-light hover:border-primary/50 transition-all mb-2"
      >
        <div className="flex items-center">
          <div className="text-2xl mr-3">{selectedPersona.avatarEmoji}</div>
          <div className="text-left">
            <h4 className="font-medium">{selectedPersona.name}</h4>
            <p className="text-xs text-neutral-dark line-clamp-1">{selectedPersona.description}</p>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      
      {/* Expanded persona selector */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-soft border border-neutral-light p-4 mt-3 animate-fadeIn">
          {/* Search bar */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search companions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
            {personaCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? "bg-primary text-white"
                    : "bg-neutral-lightest hover:bg-neutral-light/50 text-neutral-dark"
                }`}
              >
                <span>{category.emoji}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
          
          {/* Category description */}
          <div className="mb-4 text-sm text-neutral-dark">
            {personaCategories.find(c => c.id === activeCategory)?.description || "Browse all available companion characters"}
          </div>
          
          {/* Divider */}
          <div className="h-px bg-neutral-light mb-4"></div>
          
          {/* Persona grid with pagination (max 6 per page) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredPersonas.length > 0 ? (
              filteredPersonas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona)}
                  className={cn(
                    "flex flex-col items-center text-center p-4 rounded-lg transition-all border group",
                    persona.id === selectedPersona.id
                      ? `bg-${persona.primaryColor}/10 border-${persona.primaryColor}/50 shadow-md`
                      : "bg-white border-neutral-light hover:border-neutral hover:shadow-md"
                  )}
                  style={{ 
                    backgroundColor: persona.id === selectedPersona.id ? `${persona.secondaryColor}40` : '', 
                    borderColor: persona.id === selectedPersona.id ? persona.primaryColor : '' 
                  }}
                >
                  {/* Persona emoji avatar */}
                  <div 
                    className="text-4xl mb-3 p-3 rounded-full transition-transform group-hover:scale-110"
                    style={{ 
                      backgroundColor: `${persona.secondaryColor}30`,
                      color: persona.primaryColor
                    }}
                  >
                    {persona.avatarEmoji}
                  </div>
                  
                  {/* Persona name */}
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <h4 className="font-medium" 
                      style={{ color: persona.id === selectedPersona.id ? persona.primaryColor : '' }}>
                      {persona.name}
                    </h4>
                    {persona.id === selectedPersona.id && (
                      <Check size={16} className="text-green-500" />
                    )}
                  </div>
                  
                  {/* Persona description */}
                  <p className="text-sm text-neutral-dark line-clamp-2 mb-2">
                    {persona.description}
                  </p>
                  
                  {/* Category tags */}
                  {persona.categories && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
                      {persona.categories.map(catId => {
                        const category = personaCategories.find(c => c.id === catId);
                        return category ? (
                          <span 
                            key={catId}
                            className="text-xs bg-neutral-lightest px-2 py-0.5 rounded-full"
                          >
                            {category.emoji} {category.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="col-span-full text-center p-8 text-neutral-dark">
                <div className="text-3xl mb-2">🔍</div>
                <p>No companions found for this search.</p>
                <p className="text-sm">Try another search term or category.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaveChatOpen, setIsSaveChatOpen] = useState(false);
  
  // Get ephemeral chat messages from local store
  const chatMessages = useEphemeralChatStore((state) => state.messages);
  const clearMessages = useEphemeralChatStore((state) => state.clearMessages);
  const selectedPersona = useEphemeralChatStore((state) => state.selectedPersona);
  const isLoadingMessages = false; // Always false as messages are locally stored
  
  // Send ephemeral message mutation
  const { mutate: sendMessage, isPending: isSending } = useSendEphemeralMessage();
  
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
  
  const handleClearChat = () => {
    clearMessages();
    toast({
      title: "Conversation cleared",
      description: "Your chat history has been erased.",
    });
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
      
      {/* Persona Selector Component */}
      <PersonaSelector />
      
      {/* Chat Interface */}
      <div className="bg-white rounded-xl shadow-soft border border-neutral-light overflow-hidden flex flex-col" style={{ height: "65vh", maxHeight: "550px" }}>
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-light bg-gradient-to-r from-primary-light/40 to-accent1-light/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="text-white rounded-full p-2 w-11 h-11 flex items-center justify-center shadow-sm"
                style={{ backgroundColor: selectedPersona.primaryColor }}
              >
                <span className="text-xl">{selectedPersona.avatarEmoji}</span>
              </div>
              <div>
                <h3 className="font-heading font-semibold" style={{ color: selectedPersona.primaryColor }}>
                  {selectedPersona.name}
                </h3>
                <p className="text-xs text-neutral-dark">
                  {isSending ? "Thinking..." : "Here to support you 24/7"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-neutral-dark hover:text-red-500 hover:bg-red-50"
                onClick={handleClearChat}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span className="text-xs">Clear</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="text-neutral-dark hover:text-pink-500 hover:bg-pink-50"
                onClick={() => setIsSaveChatOpen(true)}
                title="Save meaningful conversation"
                disabled={chatMessages.length < 2}
              >
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-xs">Save</span>
              </Button>
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
                  <div 
                    className="text-white rounded-full p-1.5 w-8 h-8 flex items-center justify-center mt-1"
                    style={{ backgroundColor: selectedPersona.primaryColor }}
                  >
                    <span className="text-sm">{selectedPersona.avatarEmoji}</span>
                  </div>
                  <div 
                    className="rounded-t-xl rounded-br-xl p-3 max-w-[85%] shadow-softer"
                    style={{ backgroundColor: `${selectedPersona.secondaryColor}50` }}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs text-neutral-dark mt-1.5">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start justify-end space-x-2 animate-fadeIn">
                  <div 
                    className="rounded-t-xl rounded-bl-xl p-3 max-w-[85%] shadow-softer"
                    style={{ backgroundColor: "rgba(124, 58, 237, 0.1)" }}
                  >
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
      
      {/* Save Chat Dialog */}
      <SaveChatDialog 
        isOpen={isSaveChatOpen} 
        onClose={() => setIsSaveChatOpen(false)} 
      />
    </div>
  );
}
