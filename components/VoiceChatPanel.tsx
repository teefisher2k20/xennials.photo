/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import { LiveChatService } from '../services/geminiService';
import { MegaphoneIcon, RocketLaunchIcon, XMarkIcon } from './icons';

interface VoiceChatPanelProps {
  setError: (error: string | null) => void;
}

const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({ setError }) => {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemInstruction, setSystemInstruction] = useState<string>('');
  const [inputTranscription, setInputTranscription] = useState<string>('');
  const [outputTranscription, setOutputTranscription] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<{ type: 'user' | 'model', text: string }[]>([]);

  const liveChatServiceRef = useRef<LiveChatService | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    liveChatServiceRef.current = new LiveChatService(
      setError,
      (input, output) => {
        // Update current partial transcriptions
        setInputTranscription(input);
        setOutputTranscription(output);

        // If a turn is complete (both input and output transcriptions have been fully built),
        // add them to the conversation history and clear current transcriptions.
        // The LiveChatService handles clearing input/outputTranscription on turnComplete now.
        if (input && output) {
          setConversationHistory(prev => [...prev, { type: 'user', text: input }, { type: 'model', text: output }]);
        }
      }
    );

    return () => {
      liveChatServiceRef.current?.stopSession();
    };
  }, [setError]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, inputTranscription, outputTranscription]);


  const startVoiceChat = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setConversationHistory([]);
    setInputTranscription('');
    setOutputTranscription('');

    const started = await liveChatServiceRef.current?.startSession(systemInstruction);
    if (started) {
      setIsSessionActive(true);
    }
    setIsLoading(false);
  }, [setError, systemInstruction]);

  const stopVoiceChat = useCallback(() => {
    liveChatServiceRef.current?.stopSession();
    setIsSessionActive(false);
    setIsLoading(false);
    // Final check for incomplete turn to add to history
    if (inputTranscription || outputTranscription) {
      const finalHistoryUpdate: { type: 'user' | 'model', text: string }[] = [];
      if (inputTranscription) finalHistoryUpdate.push({ type: 'user', text: inputTranscription });
      if (outputTranscription) finalHistoryUpdate.push({ type: 'model', text: outputTranscription });
      setConversationHistory(prev => [...prev, ...finalHistoryUpdate]);
    }
    setInputTranscription('');
    setOutputTranscription('');
  }, [inputTranscription, outputTranscription]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Voice Chat</h2>
      <p className="text-md text-gray-400 text-center">
        Engage in real-time spoken conversations with Gemini using your microphone.
      </p>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
        <textarea
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          placeholder="Optional: Set a system instruction (e.g., 'You are a helpful customer support agent.')"
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none h-24 disabled:opacity-60"
          disabled={isLoading || isSessionActive}
          aria-label="System instruction for voice chat"
        />

        <div className="flex justify-center gap-4">
          {!isSessionActive ? (
            <button
              onClick={startVoiceChat}
              disabled={isLoading}
              className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isLoading ? <LoadingSpinner size="h-5 w-5" color="text-white" /> : <MegaphoneIcon className="w-5 h-5" />}
              {isLoading ? 'Connecting...' : 'Start Conversation'}
            </button>
          ) : (
            <button
              onClick={stopVoiceChat}
              className="bg-gradient-to-br from-red-600 to-red-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-50 flex items-center gap-2"
            >
              <XMarkIcon className="w-5 h-5" /> Stop Conversation
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-[50vh] bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 backdrop-blur-sm overflow-hidden">
        <h3 className="text-xl font-semibold text-gray-200 border-b border-gray-700 pb-2 mb-2">Transcript</h3>
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar text-sm">
          {conversationHistory.length === 0 && !inputTranscription && !outputTranscription && (
            <p className="text-gray-500 text-center py-10">Conversation will appear here.</p>
          )}
          {conversationHistory.map((entry, index) => (
            <p key={index} className={`${entry.type === 'user' ? 'text-blue-300 text-right' : 'text-gray-300 text-left'} mb-1`}>
              <strong>{entry.type === 'user' ? 'You:' : 'AI:'}</strong> {entry.text}
            </p>
          ))}
          {inputTranscription && (
            <p className="text-blue-400 text-right italic mb-1">
              <strong>You (speaking):</strong> {inputTranscription}
            </p>
          )}
          {outputTranscription && (
            <p className="text-gray-400 text-left italic mb-1">
              <strong>AI (responding):</strong> {outputTranscription}
            </p>
          )}
          <div ref={historyEndRef} />
        </div>
      </div>
    </div>
  );
};

export default VoiceChatPanel;