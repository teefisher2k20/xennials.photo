/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import { generateImage } from '../services/geminiService';
import { UploadIcon } from './icons';

interface ImageGeneratorPanelProps {
  setError: (error: string | null) => void;
}

type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({ setError }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }

    setIsLoading(true);
    setGeneratedImageUrl(null);
    setError(null);

    try {
      const imageUrl = await generateImage(prompt, aspectRatio);
      setGeneratedImageUrl(imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate image: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `generated-image-${Date.now()}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const aspectRatioOptions: { label: string; value: AspectRatio }[] = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (3:4)', value: '3:4' },
    { label: 'Landscape (4:3)', value: '4:3' },
    { label: 'Tall Portrait (9:16)', value: '9:16' },
    { label: 'Wide Landscape (16:9)', value: '16:9' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Generate Image</h2>
      <p className="text-md text-gray-400 text-center">
        Create stunning images from text descriptions using Imagen 4.0.
      </p>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'a robot holding a red skateboard in a cyberpunk city'"
          className="flex-grow bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          aria-label="Image generation prompt"
        />

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
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <LoadingSpinner />
          <p className="text-gray-300">Creating your image...</p>
        </div>
      )}

      {generatedImageUrl && !isLoading && (
        <div className="w-full mt-6 shadow-2xl rounded-xl overflow-hidden bg-black/20 animate-fade-in">
          <img src={generatedImageUrl} alt="Generated" className="w-full h-auto object-contain rounded-xl" />
          <div className="p-4 bg-gray-800/80 border-t border-gray-700 flex justify-end">
            <button
              onClick={handleDownload}
              className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
              <UploadIcon className="inline-block w-5 h-5 mr-2 -rotate-90" /> Download Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneratorPanel;