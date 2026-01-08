import React, { useState, useEffect, useRef } from 'react';
import { useStorage, useMutation } from '../liveblocks.config';
import { ChatMessage } from '../types';

interface ChatRoomProps {
  currentUser: {
    id: string;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, isOpen, onClose }) => {
  const messages = useStorage((root) => root.messages);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useMutation(({ storage }, text: string) => {
    if (!text.trim()) return;
    const msgList = storage.get('messages');
    if (!msgList) return;

    msgList.push({
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: text.trim(),
      timestamp: Date.now(),
    });
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
    setInputText('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-4 w-80 md:w-96 bg-[#1a1a20] border border-white/10 rounded-t-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up" style={{ height: '450px', maxHeight: '60vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-white/10 rounded-t-2xl cursor-pointer" onClick={onClose}>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-poker-green rounded-full mr-2 animate-pulse"></div>
          <span className="font-bold text-white text-sm">Room Chat</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
        {(!messages || messages.length === 0) && (
          <div className="text-center text-gray-500 text-xs py-4">
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages?.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`text-[10px] text-gray-500 mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                 {isMe ? 'You' : msg.senderName}
              </div>
              <div 
                className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words ${
                  isMe 
                    ? 'bg-poker-green text-black font-medium rounded-tr-none' 
                    : 'bg-white/10 text-gray-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#1a1a20] border-t border-white/10 rounded-b-none">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-poker-green/50 transition-colors"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="p-2 bg-poker-green text-black rounded-full hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
};