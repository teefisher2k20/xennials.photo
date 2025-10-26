/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback, useEffect } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import MarkdownRenderer from './common/MarkdownRenderer';
import { performFitCheck, getOutfitSuggestions } from '../services/geminiService'; // Import getOutfitSuggestions
import { UploadIcon, PaperClipIcon, XMarkIcon, RocketLaunchIcon } from './icons';

interface FitCheckPanelProps {
  setError: (error: string | null) => void;
}

const FitCheckPanel: React.FC<FitCheckPanelProps> = ({ setError }) => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageObjectURLs, setImageObjectURLs] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [suggestedItems, setSuggestedItems] = useState<string[] | null>(null); // New state for suggestions
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newURLs = newFiles.map(file => URL.createObjectURL(file));

      setImageFiles(prev => [...prev, ...newFiles]);
      setImageObjectURLs(prev => [...prev, ...newURLs]);
      setAiResponse(null); // Clear previous results
      setSuggestedItems(null); // Clear previous suggestions
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImageObjectURLs(prev => {
      const newURLs = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove]); // Revoke the object URL of the removed image
      return newURLs;
    });
    setAiResponse(null);
    setSuggestedItems(null); // Clear previous suggestions
    if (imageFiles.length === 1 && imageInputRef.current) { // If last image removed
      imageInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-500/10');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (newFiles.length > 0) {
        const newURLs = newFiles.map(file => URL.createObjectURL(file));
        setImageFiles(prev => [...prev, ...newFiles]);
        setImageObjectURLs(prev => [...prev, ...newURLs]);
        setAiResponse(null);
        setSuggestedItems(null); // Clear previous suggestions
      } else {
        setError('Please drop image files.');
      }
    }
  }, [setError]);

  const handleGetFeedback = useCallback(async () => {
    if (imageFiles.length === 0) {
      setError('Please upload at least one outfit image first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a question or context for your fit check.');
      return;
    }

    setIsLoading(true);
    setAiResponse(null);
    setSuggestedItems(null); // Clear previous suggestions before new request
    setError(null);

    try {
      const result = await performFitCheck(imageFiles, prompt);
      setAiResponse(result);

      // After getting initial feedback, request suggestions
      try {
        const suggestions = await getOutfitSuggestions(imageFiles, prompt, result);
        setSuggestedItems(suggestions);
      } catch (suggestionError) {
        console.warn("Failed to get outfit suggestions:", suggestionError);
        // Do not block the main feedback flow if suggestions fail
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get fit check feedback: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFiles, prompt, setError]);

  const handleClear = () => {
    imageObjectURLs.forEach(url => URL.revokeObjectURL(url)); // Revoke all object URLs
    setImageFiles([]);
    setImageObjectURLs([]);
    setPrompt('');
    setAiResponse(null);
    setSuggestedItems(null); // Clear suggestions on clear
    setError(null);
    setIsLoading(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = ''; // Clear file input
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      imageObjectURLs.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageObjectURLs]);

  // Scroll to bottom of response when new response comes
  useEffect(() => {
    if (aiResponse && responseAreaRef.current) {
      responseAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [aiResponse]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in p-4">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Fit Check</h2>
      <p className="text-md text-gray-400 text-center">
        Upload images of your outfit from different angles and get fashion feedback and advice from Gemini.
      </p>

      <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm">
        <div
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-200 
            ${imageFiles.length > 0 ? 'border-gray-600' : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/10'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {imageFiles.length > 0 ? (
            <div className="relative w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-center">
              {imageObjectURLs.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt={`Outfit ${index + 1}`} className="w-full h-28 object-cover rounded-md mx-auto" />
                  <button
                    onClick={() => removeImage(index)}
                    disabled={isLoading}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label htmlFor="outfit-image-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-400 border border-dashed border-gray-600 rounded-md p-2 hover:border-blue-500 hover:bg-blue-500/10 transition-colors h-28">
                <UploadIcon className="w-6 h-6" />
                <span className="text-sm font-semibold text-center">Add More Images</span>
                <input
                  id="outfit-image-upload"
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={imageInputRef}
                  disabled={isLoading}
                />
              </label>
            </div>
          ) : (
            <label htmlFor="outfit-image-upload" className="cursor-pointer flex flex-col items-center gap-2 text-gray-400">
              <UploadIcon className="w-10 h-10" />
              <span className="text-lg font-semibold text-center">Upload Outfit Images (on a human body)</span>
              <span className="text-sm">or drag and drop here</span>
              <input
                id="outfit-image-upload"
                type="file"
                multiple
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                ref={imageInputRef}
                disabled={isLoading}
              />
            </label>
          )}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={imageFiles.length > 0 ? "e.g., 'What do you think of this outfit for a casual dinner?' or 'Does this color combination work?'" : "Upload images first"}
          className="flex-grow bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 h-24 resize-none"
          disabled={isLoading || imageFiles.length === 0}
          aria-label="Outfit feedback prompt"
        />

        <button
          onClick={handleGetFeedback}
          disabled={isLoading || imageFiles.length === 0 || !prompt.trim()}
          className="w-full bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/20 hover:shadow-xl hover:hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {isLoading ? <LoadingSpinner size="h-5 w-5" color="text-white" /> : <RocketLaunchIcon className="w-5 h-5" />}
          {isLoading ? 'Getting Feedback...' : 'Get Feedback'}
        </button>
      </div>

      {aiResponse && !isLoading && (
        <div className="w-full mt-6 shadow-2xl rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700 p-4 animate-fade-in" ref={responseAreaRef}>
          <h3 className="text-xl font-semibold text-gray-200 mb-3">AI Feedback:</h3>
          <MarkdownRenderer content={aiResponse} className="text-gray-300 text-sm leading-relaxed" />

          {suggestedItems && suggestedItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-gray-200 mb-2">Complementary Suggestions:</h4>
                <ul className="list-disc list-inside text-gray-300 text-sm leading-relaxed">
                    {suggestedItems.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
          )}
        </div>
      )}

      {(imageFiles.length > 0 || aiResponse) && (
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
        >
          Clear
        </button>
      )}

      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-gray-900/80 p-6 rounded-lg shadow-xl z-50">
          <LoadingSpinner />
          <p className="text-gray-300 text-center">Analyzing your outfit...</p>
        </div>
      )}
    </div>
  );
};

export default FitCheckPanel;