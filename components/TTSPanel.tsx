/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback, useEffect } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import { generateTTS } from '../services/geminiService';
import { decode, decodeAudioData } from '../services/audioUtils';
import { MegaphoneIcon, PlayIcon, StopIcon } from './icons';

interface TTSPanelProps {
  setError: (error: string | null) => void;
}

const TTSPanel: React.FC<TTSPanelProps> = ({ setError }) => {
  const [textInput, setTextInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext on first interaction or component mount
  useEffect(() => {
    if (!audioContextRef.current) {
      // Fix: Use standard AudioContext
      audioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
    }
    return () => {
      // Clean up audio context on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Error closing audio context:", e));
        audioContextRef.current = null;
      }
    };
  }, []);

  const handleGenerateTTS = useCallback(async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to convert to speech.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }

    try {
      const base64Audio = await generateTTS(textInput);
      if (!audioContextRef.current) {
        // Fix: Use standard AudioContext
        audioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
      }
      const buffer = await decodeAudioData(
        decode(base64Audio),
        audioContextRef.current,
        24000,
        1,
      );
      setAudioBuffer(buffer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate speech: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [textInput, setError]);

  const handlePlayAudio = useCallback(() => {
    if (audioBuffer && audioContextRef.current) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      audioSourceRef.current = source;
      setIsPlaying(true);
    }
  }, [audioBuffer]);

  const handleStopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Text to Speech</h2>
      <p className="text-md text-gray-400 text-center">
        Convert your text into natural-sounding speech.
      </p>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none h-40 disabled:opacity-60"
          disabled={isLoading}
          aria-label="Text to speech input"
        />

        <button
          onClick={handleGenerateTTS}
          disabled={isLoading || !textInput.trim()}
          className="w-full bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {isLoading ? <LoadingSpinner size="h-5 w-5" color="text-white" /> : <MegaphoneIcon className="w-5 h-5" />}
          {isLoading ? 'Generating Speech...' : 'Generate Speech'}
        </button>
      </div>

      {audioBuffer && !isLoading && (
        <div className="w-full mt-6 shadow-2xl rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700 p-4 animate-fade-in flex items-center justify-center gap-4">
          {!isPlaying ? (
            <button
              onClick={handlePlayAudio}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2"
              aria-label="Play audio"
            >
              <PlayIcon className="w-6 h-6" /> Play
            </button>
          ) : (
            <button
              onClick={handleStopAudio}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2"
              aria-label="Stop audio"
            >
              <StopIcon className="w-6 h-6" /> Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TTSPanel;