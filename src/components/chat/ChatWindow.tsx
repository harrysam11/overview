import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from "@/hooks/useChat";
import { GroupMessage } from "@/hooks/useGroups";
import { formatDistanceToNow } from "date-fns";

interface ChatWindowProps {
  messages: Message[] | GroupMessage[];
  onSendMessage: (content: string) => Promise<void>;
  currentUserId: string | undefined;
  chatName: string;
  chatAvatar?: string | null;
  onBack?: () => void;
  isGroup?: boolean;
}

export const ChatWindow = ({
  messages,
  onSendMessage,
  currentUserId,
  chatName,
  chatAvatar,
  onBack,
  isGroup = false,
}: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await onSendMessage(newMessage);
    setNewMessage("");
    setSending(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={chatAvatar || undefined} />
          <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{chatName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}>
                  {!isOwn && isGroup && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(msg.sender_profile?.display_name || null)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    {!isOwn && isGroup && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {msg.sender_profile?.display_name || "Anonymous"}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            maxLength={1000}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
