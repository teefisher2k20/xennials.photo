/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import MarkdownRenderer from './common/MarkdownRenderer';
import { TextChatService } from '../services/geminiService';
import { PaperClipIcon, XMarkIcon, RocketLaunchIcon, GlobeAltIcon, MapPinIcon } from './icons';

interface ChatMessage {
  type: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingUrls?: { uri: string; title: string; }[];
  filePreview?: string;
  fileName?: string;
  fileType?: 'image' | 'video';
}

interface TextChatPanelProps {
  setError: (error: string | null) => void;
}

const TextChatPanel: React.FC<TextChatPanelProps> = ({ setError }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedVideo, setAttachedVideo] = useState<File | null>(null);
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState<boolean>(false);
  const [useThinkingMode, setUseThinkingMode] = useState<boolean>(false);
  const [useFlashLite, setUseFlashLite] = useState<boolean>(false);
  const [currentGroundingUrls, setCurrentGroundingUrls] = useState<{ uri: string; title: string; }[]>([]);

  const chatServiceRef = useRef<TextChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize chat service when component mounts
    chatServiceRef.current = new TextChatService(setError, setCurrentGroundingUrls);
    return () => {
      // Cleanup if needed, though TextChatService doesn't have a specific close method
    };
  }, [setError]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !attachedImage && !attachedVideo) return;

    const userMessage: ChatMessage = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date(),
      filePreview: attachedImage ? URL.createObjectURL(attachedImage) : (attachedVideo ? URL.createObjectURL(attachedVideo) : undefined),
      fileName: attachedImage?.name || attachedVideo?.name || undefined,
      fileType: attachedImage ? 'image' : (attachedVideo ? 'video' : undefined),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setAttachedImage(null);
    setAttachedVideo(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    setCurrentGroundingUrls([]); // Clear URLs for new message

    setIsLoading(true);
    setError(null);

    const modelInitialText: ChatMessage = { type: 'model', text: '', timestamp: new Date(), groundingUrls: [] };
    setMessages((prev) => [...prev, modelInitialText]);

    try {
      await chatServiceRef.current?.sendMessage(
        userMessage.text,
        userMessage.fileType === 'image' ? userMessage.filePreview ? await fetch(userMessage.filePreview).then(res => res.blob()).then(blob => new File([blob], userMessage.fileName || 'image', {type: blob.type})) : null : null, // Re-create file for API
        userMessage.fileType === 'video' ? userMessage.filePreview ? await fetch(userMessage.filePreview).then(res => res.blob()).then(blob => new File([blob], userMessage.fileName || 'video', {type: blob.type})) : null : null, // Re-create file for API
        useSearchGrounding,
        useMapsGrounding,
        useThinkingMode,
        useFlashLite,
        (chunkText) => {
          setMessages((prev) => {
            const lastMessage = { ...prev[prev.length - 1] };
            lastMessage.text += chunkText;
            return [...prev.slice(0, prev.length - 1), lastMessage];
          });
        },
        (fullText, urls) => {
          setMessages((prev) => {
            const lastMessage = { ...prev[prev.length - 1] };
            lastMessage.text = fullText; // Ensure final text is set
            lastMessage.groundingUrls = urls;
            return [...prev.slice(0, prev.length - 1), lastMessage];
          });
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Chat failed: ${errorMessage}`);
      setMessages((prev) => {
        const lastMessage = { ...prev[prev.length - 1] };
        lastMessage.text = `Error: ${errorMessage}`;
        return [...prev.slice(0, prev.length - 1), lastMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedImage(e.target.files[0]);
      setAttachedVideo(null); // Clear video if image is attached
    }
  };

  const handleVideoAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedVideo(e.target.files[0]);
      setAttachedImage(null); // Clear image if video is attached
    }
  };

  const removeAttachedFile = () => {
    if (attachedImage) {
      URL.revokeObjectURL(URL.createObjectURL(attachedImage));
      setAttachedImage(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
    if (attachedVideo) {
      URL.revokeObjectURL(URL.createObjectURL(attachedVideo));
      setAttachedVideo(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputMessage('');
    setAttachedImage(null);
    setAttachedVideo(null);
    setUseSearchGrounding(false);
    setUseMapsGrounding(false);
    setUseThinkingMode(false);
    setUseFlashLite(false);
    setCurrentGroundingUrls([]);
    setError(null);
    chatServiceRef.current?.resetChat(
        useFlashLite ? 'gemini-flash-lite-latest' : (useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash'),
        {
            thinkingConfig: useThinkingMode ? { thinkingBudget: 32768 } : undefined
        }
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Text Chat</h2>
      <p className="text-md text-gray-400 text-center">
        Have a conversation with Gemini, analyze images/videos, or get up-to-date info.
      </p>

      <div className="w-full h-[60vh] bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm overflow-hidden">
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {messages.length === 0 && (
            <p className="text-gray-500 text-center py-10">Start a conversation!</p>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col gap-1 mb-4 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                }`}
              >
                {msg.filePreview && (
                  msg.fileType === 'image' ? (
                    <img src={msg.filePreview} alt="Attached" className="max-w-48 max-h-48 object-contain rounded-md mb-2" />
                  ) : (
                    <video src={msg.filePreview} controls className="max-w-full max-h-48 object-contain rounded-md mb-2" />
                  )
                )}
                <MarkdownRenderer content={msg.text} />
              </div>
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  <p>Sources:</p>
                  <ul className="list-disc list-inside">
                    {msg.groundingUrls.map((url, urlIndex) => (
                      <li key={urlIndex}>
                        <a href={url.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {url.title || url.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <span className="text-xs text-gray-500 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2 pt-2 border-t border-gray-700">
          {(attachedImage || attachedVideo) && (
            <div className="relative p-2 border border-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-xs gap-1">
              {attachedImage ? (
                <img src={URL.createObjectURL(attachedImage)} alt="Attached" className="h-8 w-8 object-cover rounded" />
              ) : (
                <video src={URL.createObjectURL(attachedVideo!)} controls className="h-8 w-8 object-cover rounded" />
              )}
              <span>{attachedImage?.name || attachedVideo?.name}</span>
              <button
                type="button"
                onClick={removeAttachedFile}
                className="absolute -top-2 -right-2 bg-red-500/80 rounded-full p-0.5 text-white hover:bg-red-600"
                aria-label="Remove attached file"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          <label htmlFor="attach-image" className="cursor-pointer text-gray-400 hover:text-blue-400 p-2">
            <PaperClipIcon className="w-6 h-6 rotate-45" />
            <input id="attach-image" type="file" className="hidden" accept="image/*" onChange={handleImageAttach} ref={imageInputRef} />
          </label>
          <label htmlFor="attach-video" className="cursor-pointer text-gray-400 hover:text-blue-400 p-2">
            <PaperClipIcon className="w-6 h-6 -rotate-45" />
            <input id="attach-video" type="file" className="hidden" accept="video/*" onChange={handleVideoAttach} ref={videoInputRef} />
          </label>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none max-h-32"
            rows={1}
            disabled={isLoading}
            aria-label="Chat input message"
          />
          <button
            type="submit"
            disabled={isLoading || (!inputMessage.trim() && !attachedImage && !attachedVideo)}
            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            aria-label="Send message"
          >
            <RocketLaunchIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-wrap justify-center gap-2 backdrop-blur-sm text-sm">
        <label className="flex items-center cursor-pointer text-gray-300 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={useSearchGrounding}
            onChange={() => setUseSearchGrounding(!useSearchGrounding)}
            className="mr-2 accent-blue-500"
            disabled={isLoading || useMapsGrounding} // Search and Maps are mutually exclusive with other grounding tools
          />
          <GlobeAltIcon className="w-4 h-4 mr-1" /> Search Grounding
        </label>
        <label className="flex items-center cursor-pointer text-gray-300 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={useMapsGrounding}
            onChange={() => setUseMapsGrounding(!useMapsGrounding)}
            className="mr-2 accent-blue-500"
            disabled={isLoading || useSearchGrounding} // Search and Maps are mutually exclusive with other grounding tools
          />
          <MapPinIcon className="w-4 h-4 mr-1" /> Maps Grounding
        </label>
        <label className="flex items-center cursor-pointer text-gray-300 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={useThinkingMode}
            onChange={() => setUseThinkingMode(!useThinkingMode)}
            className="mr-2 accent-purple-500"
            disabled={isLoading || useFlashLite} // Thinking mode and flash lite are mutually exclusive model options
          />
          <RocketLaunchIcon className="w-4 h-4 mr-1" /> Thinking Mode (Pro)
        </label>
        <label className="flex items-center cursor-pointer text-gray-300 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={useFlashLite}
            onChange={() => setUseFlashLite(!useFlashLite)}
            className="mr-2 accent-green-500"
            disabled={isLoading || useThinkingMode} // Thinking mode and flash lite are mutually exclusive model options
          />
          <RocketLaunchIcon className="w-4 h-4 mr-1" /> Flash Lite (Low-Latency)
        </label>
      </div>

      <button
        onClick={handleResetChat}
        disabled={isLoading}
        className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
      >
        Reset Chat
      </button>

      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-gray-900/80 p-6 rounded-lg shadow-xl z-50">
          <LoadingSpinner />
          <p className="text-gray-300 text-center">Thinking...</p>
        </div>
      )}
    </div>
  );
};

export default TextChatPanel;