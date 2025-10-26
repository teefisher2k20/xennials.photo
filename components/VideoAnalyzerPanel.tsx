/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import MarkdownRenderer from './common/MarkdownRenderer';
import { analyzeVideo } from '../services/geminiService';
import { UploadIcon, PaperClipIcon, XMarkIcon } from './icons';

interface VideoAnalyzerPanelProps {
  setError: (error: string | null) => void;
}

const VideoAnalyzerPanel: React.FC<VideoAnalyzerPanelProps> = ({ setError }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoObjectURL, setVideoObjectURL] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      if (videoObjectURL) {
        URL.revokeObjectURL(videoObjectURL);
      }
      setVideoObjectURL(URL.createObjectURL(file));
      setAnalysisResult(null); // Clear previous results
    } else {
      setVideoFile(null);
      if (videoObjectURL) {
        URL.revokeObjectURL(videoObjectURL);
      }
      setVideoObjectURL(null);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoObjectURL) {
      URL.revokeObjectURL(videoObjectURL);
      setVideoObjectURL(null);
    }
    setAnalysisResult(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!videoFile) {
      setError('Please upload a video to analyze.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a question or command for video analysis.');
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);

    try {
      const result = await analyzeVideo(videoFile, prompt);
      setAnalysisResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to analyze video: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, prompt, setError]);

  // Clean up object URL when component unmounts or video file changes
  React.useEffect(() => {
    return () => {
      if (videoObjectURL) {
        URL.revokeObjectURL(videoObjectURL);
      }
    };
  }, [videoObjectURL]);


  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Video Analyzer</h2>
      <p className="text-md text-gray-400 text-center">
        Upload a video and ask Gemini Pro to analyze its content, summarize, or extract key information.
      </p>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="video-upload" className="relative cursor-pointer bg-white/10 hover:bg-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
            <UploadIcon className="w-4 h-4" />
            {videoFile ? videoFile.name : 'Upload Video'}
            <input
              id="video-upload"
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleVideoChange}
              ref={videoInputRef}
              disabled={isLoading}
            />
          </label>
          {videoFile && (
            <button
              onClick={removeVideo}
              disabled={isLoading}
              className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"
              aria-label="Remove video"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {videoObjectURL && (
          <div className="mt-4 w-full shadow-lg rounded-md overflow-hidden bg-black/30">
            <video controls src={videoObjectURL} className="w-full h-auto object-contain max-h-[40vh]" />
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={videoFile ? "e.g., 'Summarize the key events in this video' or 'Describe the main subject'" : "Upload a video first"}
          className="flex-grow bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 h-24"
          disabled={isLoading || !videoFile}
          aria-label="Video analysis prompt"
        />

        <button
          onClick={handleAnalyze}
          disabled={isLoading || !videoFile || !prompt.trim()}
          className="w-full bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Video'}
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <LoadingSpinner />
          <p className="text-gray-300">Analyzing video content...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment for larger videos.</p>
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="w-full mt-6 shadow-2xl rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700 p-4 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-200 mb-3">Analysis Result:</h3>
          <MarkdownRenderer content={analysisResult} className="text-gray-300 text-sm leading-relaxed" />
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzerPanel;