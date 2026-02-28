import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { messageService } from '@/services/messageService';
import { connectSocket } from '@/lib/socket';
import {
  X,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  Loader2,
} from 'lucide-react';

interface Message {
  _id: string;
  event: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  recipient: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  recipientId: string;
  recipientName: string;
}

const MessageModal = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  recipientId,
  recipientName,
}: MessageModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    fetchMessages();

    const socket = connectSocket();
    const handleNewMessage = (message: Message) => {
      const isRelevant =
        message.event === eventId &&
        ((message.sender._id === user.id && message.recipient._id === recipientId) ||
          (message.sender._id === recipientId && message.recipient._id === user.id));
      if (isRelevant) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [isOpen, user, eventId, recipientId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await messageService.getConversation(eventId, recipientId);
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      
      const sentMessage = await messageService.sendMessage({
        eventId,
        recipientId,
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
      
      toast({
        title: 'Message sent',
        description: 'Your message has been delivered',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{recipientName}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {eventTitle}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <MessageCircle className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">No messages yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Start the conversation by sending a message about this event
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isOwnMessage = message.sender._id === user?.id;
                      const showAvatar =
                        index === 0 ||
                        messages[index - 1].sender._id !== message.sender._id;

                      return (
                        <motion.div
                          key={message._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-end gap-2 ${
                            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar && (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                                {message.sender.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[70%] ${
                              isOwnMessage ? 'items-end' : 'items-start'
                            } flex flex-col gap-1`}
                          >
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwnMessage
                                  ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm break-words">
                                {message.content}
                              </p>
                            </div>

                            {/* Timestamp and Read Status */}
                            <div
                              className={`flex items-center gap-1 text-xs text-muted-foreground px-2 ${
                                isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              <span>{formatTime(message.createdAt)}</span>
                              {isOwnMessage && (
                                <>
                                  {message.isRead ? (
                                    <CheckCheck className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-border bg-card/50 backdrop-blur-sm"
              >
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sending}
                    maxLength={1000}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {newMessage.length}/1000 characters
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MessageModal;
