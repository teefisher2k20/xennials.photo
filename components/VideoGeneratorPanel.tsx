/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import { generateVideo } from '../services/geminiService';
import ApiKeyChecker from './common/ApiKeyChecker';
import { UploadIcon, PaperClipIcon, XMarkIcon } from './icons';

interface VideoGeneratorPanelProps {
  setError: (error: string | null) => void;
}

type AspectRatio = '16:9' | '9:16';

const VideoGeneratorPanel: React.FC<VideoGeneratorPanelProps> = ({ setError }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a video.');
      return;
    }

    setIsLoading(true);
    setVideoUrl(null);
    setError(null);
    setStatusMessage('Starting video generation...');

    try {
      const url = await generateVideo(prompt, imageFile, aspectRatio, setStatusMessage);
      setVideoUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate video: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  }, [prompt, imageFile, aspectRatio, setError]);

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `generated-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const aspectRatioOptions: { label: string; value: AspectRatio }[] = [
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Generate Video</h2>
      <p className="text-md text-gray-400 text-center">
        Create short videos from text prompts and optional starting images using Veo.
      </p>

      {!apiKeyReady ? (
        <ApiKeyChecker onApiKeySelected={() => setApiKeyReady(true)} setError={setError} />
      ) : (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'A futuristic car driving through a neon city at night'"
            className="flex-grow bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            aria-label="Video generation prompt"
          />

          <div className="flex items-center gap-4">
            <label htmlFor="video-image-upload" className="relative cursor-pointer bg-white/10 hover:bg-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
              <PaperClipIcon className="w-4 h-4" />
              {imageFile ? imageFile.name : 'Add Start Image (Optional)'}
              <input
                id="video-image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                ref={imageInputRef}
                disabled={isLoading}
              />
            </label>
            {imageFile && (
              <button
                onClick={removeImage}
                disabled={isLoading}
                className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"
                aria-label="Remove image"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-300 text-sm mr-2">Aspect Ratio:</span>
            {aspectRatioOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setAspectRatio(option.value)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                  aspectRatio === option.value
                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white/10 hover:bg-white/20 text-gray-200'
                }`}
                aria-pressed={aspectRatio === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? 'Generating...' : 'Generate Video'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <LoadingSpinner />
          <p className="text-gray-300 text-center animate-pulse">{statusMessage || 'Video generation in progress...'}</p>
          <p className="text-gray-500 text-sm mt-2">This may take a few minutes.</p>
        </div>
      )}

      {videoUrl && !isLoading && (
        <div className="w-full mt-6 shadow-2xl rounded-xl overflow-hidden bg-black/20 animate-fade-in">
          <video controls src={videoUrl} className="w-full h-auto object-contain rounded-xl" />
          <div className="p-4 bg-gray-800/80 border-t border-gray-700 flex justify-end">
            <button
              onClick={handleDownload}
              className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
              <UploadIcon className="inline-block w-5 h-5 mr-2 -rotate-90" /> Download Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorPanel;