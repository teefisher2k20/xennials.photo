/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { CheckCircleIcon, WarningIcon } from '../icons';

interface ApiKeyCheckerProps {
  onApiKeySelected: () => void;
  setError: (error: string | null) => void;
}

const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onApiKeySelected, setError }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  const checkApiKey = async () => {
    try {
      setLoading(true);
      setError(null);
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const keyStatus = await window.aistudio.hasSelectedApiKey();
        setHasKey(keyStatus);
        if (keyStatus) {
          onApiKeySelected();
        }
      } else {
        setError('`window.aistudio` not found. Please ensure the environment is correctly set up for API key selection.');
        setHasKey(false);
      }
    } catch (e) {
      console.error('Error checking API key:', e);
      setError(`Failed to check API key status: ${e instanceof Error ? e.message : String(e)}`);
      setHasKey(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    setIsSelecting(true);
    setError(null);
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume success after opening dialog. Actual validation happens on next API call.
        setHasKey(true); 
        onApiKeySelected();
      } else {
        setError('`window.aistudio.openSelectKey` not found. Cannot open API key selection dialog.');
      }
    } catch (e) {
      console.error('Error opening API key selection:', e);
      setError(`Failed to open API key selector: ${e instanceof Error ? e.message : String(e)}`);
      setHasKey(false);
    } finally {
      setIsSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg bg-gray-800/50 border border-gray-700 w-full max-w-xl text-center">
        <LoadingSpinner />
        <p className="text-gray-300">Checking API key status...</p>
      </div>
    );
  }

  if (hasKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg bg-green-500/10 border border-green-500/20 w-full max-w-xl text-center animate-fade-in">
        <CheckCircleIcon className="w-12 h-12 text-green-400" />
        <p className="text-green-300 text-lg font-semibold">API key successfully selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 w-full max-w-xl text-center animate-fade-in">
      <WarningIcon className="w-12 h-12 text-yellow-400" />
      <h3 className="text-xl font-bold text-yellow-300">API Key Required for Veo</h3>
      <p className="text-gray-300 text-md">
        Please select your API key to use Veo video generation. You may need to enable billing for the Gemini API in Google Cloud.
      </p>
      <a 
        href="https://ai.google.dev/gemini-api/docs/billing" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-400 hover:text-blue-300 underline text-sm"
      >
        Learn more about billing
      </a>
      <button
        onClick={handleSelectKey}
        disabled={isSelecting}
        className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isSelecting ? 'Opening...' : 'Select API Key'}
      </button>
    </div>
  );
};

export default ApiKeyChecker;