import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveChat } from "@/lib/api";
import { useEphemeralChatStore, type ChatMessage, type ChatPersona } from "@/lib/openai";
import { queryClient } from "@/lib/queryClient";
import { Heart, Save } from "lucide-react";

const moodEmojis = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🥰", label: "Adore" },
  { emoji: "😊", label: "Happy" },
  { emoji: "🌟", label: "Inspired" },
  { emoji: "👶", label: "Nurturing" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "💪", label: "Strong" },
];

interface SaveChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveChatDialog({ isOpen, onClose }: SaveChatDialogProps) {
  const { toast } = useToast();
  const messages = useEphemeralChatStore((state) => state.messages);
  const selectedPersona = useEphemeralChatStore((state) => state.selectedPersona);

  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [userMemo, setUserMemo] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>(moodEmojis[0].emoji);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Generate a default title based on the conversation
  const generateDefaultTitle = () => {
    // Get the first user message or use a default
    const firstUserMessage = messages.find(msg => msg.role === "user")?.content || "";
    // Use the first few words as the title
    const words = firstUserMessage.split(" ").slice(0, 5).join(" ");
    return words.length > 0 ? `${words}...` : "My Chat Memory";
  };

  // Generate a summary based on the conversation
  const generateSummary = () => {
    // Get up to the first 3 messages
    const initialMessages = messages.slice(0, 3);
    let summaryText = "A conversation about ";
    
    // Extract main topics from user messages
    const userMessages = initialMessages
      .filter(msg => msg.role === "user")
      .map(msg => msg.content);
      
    if (userMessages.length > 0) {
      // Take just a snippet of the first message
      const firstMessageWords = userMessages[0].split(" ").slice(0, 10).join(" ");
      summaryText += firstMessageWords + "...";
    } else {
      summaryText += "maternal support and guidance";
    }
    
    return summaryText;
  };

  const handleSaveChat = async () => {
    if (!title) {
      toast({
        title: "Title Required",
        description: "Please provide a title for this saved conversation.",
        variant: "destructive"
      });
      return;
    }

    if (messages.length === 0) {
      toast({
        title: "Empty Conversation",
        description: "There are no messages to save.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare data for saving
      const chatData = {
        title,
        personaId: selectedPersona.id,
        personaName: selectedPersona.name,
        personaEmoji: selectedPersona.avatarEmoji,
        messages,
        summary: summary || generateSummary(),
        userMemo: userMemo || undefined,
        mood: selectedMood,
      };
      
      // Call API to save the chat
      await saveChat(chatData);
      
      // Show success message
      toast({
        title: "Chat Saved",
        description: "Your meaningful conversation has been saved to your gallery.",
      });
      
      // Invalidate any queries that might display saved chats
      queryClient.invalidateQueries({ queryKey: ['/api/chat/saved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] }); 
      
      // Close the dialog
      onClose();
      
    } catch (error) {
      console.error("Error saving chat:", error);
      toast({
        title: "Save Failed",
        description: "There was a problem saving your conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Save Meaningful Conversation
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              placeholder={generateDefaultTitle()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="summary" className="text-right">
              Summary
            </Label>
            <Textarea
              id="summary"
              placeholder={generateSummary()}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="col-span-3"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">
              Mood
            </Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {moodEmojis.map((mood) => (
                <button
                  key={mood.emoji}
                  type="button"
                  onClick={() => setSelectedMood(mood.emoji)}
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    selectedMood === mood.emoji
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-neutral-lightest border border-neutral-light hover:bg-primary/5"
                  }`}
                  title={mood.label}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-xs">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="memo" className="text-right">
              Your Memo
            </Label>
            <Textarea
              id="memo"
              placeholder="Add a personal note about this conversation..."
              value={userMemo}
              onChange={(e) => setUserMemo(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveChat} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}