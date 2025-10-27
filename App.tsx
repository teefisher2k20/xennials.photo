/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, removeImageBackground, generateGeneralEditedImage } from './services/geminiService';
import Header from './components/Header';
import LoadingSpinner from './components/common/LoadingSpinner'; // Renamed from Spinner
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, PhotoIcon, VideoCameraIcon, ChatBubbleLeftRightIcon, CommandLineIcon, MegaphoneIcon, RocketLaunchIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ImageGeneratorPanel from './components/ImageGeneratorPanel';
import VideoGeneratorPanel from './components/VideoGeneratorPanel';
import VideoAnalyzerPanel from './components/VideoAnalyzerPanel';
import TextChatPanel from './components/TextChatPanel';
import VoiceChatPanel from './components/VoiceChatPanel';
import TTSPanel from './components/TTSPanel';
import FitCheckPanel from './components/FitCheckPanel'; // Import FitCheckPanel
import { TShirtIcon } from './components/icons'; // Import TShirtIcon
import { SplashCursor } from './components/ui/splash-cursor';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// --- IndexedDB Helpers ---
const DB_NAME = 'PixshopDB';
const STORE_NAME = 'sessionStore';
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject('IndexedDB error');
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
};

const dbGet = async <T,>(key: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const dbSet = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const dbDelete = async (key: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

type ImageEditorTab = 'retouch' | 'adjust' | 'filters' | 'crop';
type AppFeature = 'imageEditor' | 'imageGenerator' | 'videoGenerator' | 'videoAnalyzer' | 'textChat' | 'voiceChat' | 'ttsGenerator' | 'fitCheck'; // Add 'fitCheck'

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [imageEditorActiveTab, setImageEditorActiveTab] = useState<ImageEditorTab>('retouch'); // Renamed from activeTab
  const [activeFeature, setActiveFeature] = useState<AppFeature>('imageEditor'); // New state for main features
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonSliderPosition, setComparisonSliderPosition] = useState(50); // New state for comparison slider
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to load session from IndexedDB on initial mount
  useEffect(() => {
    const loadSession = async () => {
        try {
            const sessionData = await dbGet<{
                history: File[];
                historyIndex: number;
                imageEditorActiveTab: ImageEditorTab;
            }>('photoEditorSession');

            if (sessionData && Array.isArray(sessionData.history) && sessionData.history.length > 0) {
                const validHistory = sessionData.history.every(item => item instanceof File);
                if (validHistory) {
                    setHistory(sessionData.history);
                    setHistoryIndex(sessionData.historyIndex);
                    setImageEditorActiveTab(sessionData.imageEditorActiveTab || 'retouch');
                    setActiveFeature('imageEditor'); // Ensure image editor is active if session loaded
                } else {
                   console.error("Corrupt session data found in IndexedDB. Clearing session.");
                   await dbDelete('photoEditorSession');
                }
            }
        } catch (e) {
            console.error("Failed to load session from IndexedDB", e);
            await dbDelete('photoEditorSession').catch(err => console.error("Failed to clear corrupt session", err));
        }
    };

    loadSession();
  }, []);

  // Effect to save session to IndexedDB whenever history or imageEditorActiveTab changes
  useEffect(() => {
    const saveSession = async () => {
        // Only save session for the image editor feature
        if (activeFeature === 'imageEditor' && history.length > 0) {
            const sessionData = {
                history, // Store File objects directly
                historyIndex,
                imageEditorActiveTab,
            };
            try {
                await dbSet('photoEditorSession', sessionData);
            } catch(e) {
                console.error("Failed to save session to IndexedDB.", e);
                setError("Could not save your session. Your browser's storage might be full or private browsing is enabled.");
            }
        } else if (activeFeature === 'imageEditor' && history.length === 0) {
            // If image editor history is empty, clear the session from DB
            await dbDelete('photoEditorSession').catch(e => console.error("Failed to delete session from DB", e));
        }
    };

    const timeoutId = setTimeout(saveSession, 500);
    return () => clearTimeout(timeoutId);
  }, [history, historyIndex, imageEditorActiveTab, activeFeature]);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setComparisonSliderPosition(50); // Reset slider position on new edit
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setImageEditorActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setComparisonSliderPosition(50); // Reset slider position on new upload
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleGeneralImageEdit = useCallback(async (editPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateGeneralEditedImage(currentImage, editPrompt);
        const newImageFile = dataURLtoFile(editedImageUrl, `general-edit-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the edit. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleRemoveBackground = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to remove the background from.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const resultImageUrl = await removeImageBackground(currentImage);
        const newImageFile = dataURLtoFile(resultImageUrl, `bg-removed-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to remove the background. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setComparisonSliderPosition(50); // Reset slider position on undo
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setComparisonSliderPosition(50); // Reset slider position on redo
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setComparisonSliderPosition(50); // Reset slider position on reset
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setComparisonSliderPosition(50); // Reset slider position on new upload
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (imageEditorActiveTab !== 'retouch' || isComparing) return; // Disable hotspot when comparing
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
};

  const renderImageEditorContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const comparisonSlider = (
      <div className="relative w-full h-full max-h-[60vh]">
        {/* Original Image (background) */}
        {originalImageUrl && (
          <img
            src={originalImageUrl}
            alt="Original"
            className="absolute top-0 left-0 w-full h-full object-contain rounded-xl"
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Current Image (overlay with controlled width) */}
        <img
          src={currentImageUrl}
          alt="Current"
          className="absolute top-0 left-0 h-full object-contain rounded-xl"
          style={{ width: `${comparisonSliderPosition}%`, pointerEvents: 'none' }}
        />
        {/* Slider Handle */}
        <input
          type="range"
          min="0"
          max="100"
          value={comparisonSliderPosition}
          onChange={(e) => setComparisonSliderPosition(Number(e.target.value))}
          className="absolute top-0 bottom-0 m-auto h-full w-full opacity-0 cursor-ew-resize z-20"
          style={{ left: 0 }}
          aria-label="Image comparison slider"
        />
        {/* Visible Slider Bar */}
        <div
          className="absolute top-0 bottom-0 w-1 h-full bg-white/70 rounded-full cursor-ew-resize z-10"
          style={{ left: `${comparisonSliderPosition}%`, transform: 'translateX(-50%)' }}
        >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-lg flex items-center justify-center border-2 border-white/90">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-800">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
            </div>
        </div>
      </div>
    );
    
    // For ReactCrop, we need a single image element. We'll use the current one.
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <LoadingSpinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {imageEditorActiveTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : isComparing && originalImageUrl ? ( // Show comparison slider if active and original image exists
                comparisonSlider
            ) : ( // Default single image view
                <div className="relative w-full h-full max-h-[60vh]">
                    <img
                        ref={imgRef}
                        key={currentImageUrl}
                        src={currentImageUrl}
                        alt="Current"
                        onClick={handleImageClick}
                        className={`w-full h-auto object-contain max-h-[60vh] rounded-xl ${imageEditorActiveTab === 'retouch' ? 'cursor-crosshair' : ''}`}
                    />
                </div>
            )}

            {displayHotspot && !isLoading && imageEditorActiveTab === 'retouch' && !isComparing && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['retouch', 'crop', 'adjust', 'filters'] as ImageEditorTab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setImageEditorActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        imageEditorActiveTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {imageEditorActiveTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to select an area to edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {imageEditorActiveTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {imageEditorActiveTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} onRemoveBackground={handleRemoveBackground} onGeneralImageEdit={handleGeneralImageEdit} isLoading={isLoading} />}
            {imageEditorActiveTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download Image
            </button>
        </div>
      </div>
    );
  };
  
  const renderContent = () => {
    switch (activeFeature) {
      case 'imageEditor':
        return renderImageEditorContent();
      case 'imageGenerator':
        return <ImageGeneratorPanel setError={setError} />;
      case 'videoGenerator':
        return <VideoGeneratorPanel setError={setError} />;
      case 'videoAnalyzer':
        return <VideoAnalyzerPanel setError={setError} />;
      case 'textChat':
        return <TextChatPanel setError={setError} />;
      case 'voiceChat':
        return <VoiceChatPanel setError={setError} />;
      case 'ttsGenerator':
        return <TTSPanel setError={setError} />;
      case 'fitCheck': // Add new case for Fit Check
        return <FitCheckPanel setError={setError} />;
      default:
        return <StartScreen onFileSelect={handleFileSelect} />; // Fallback or initial screen
    }
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <SplashCursor />
      <Header />
      <div className="w-full bg-gray-800/80 border-b border-gray-700/80 p-2 flex flex-wrap justify-center gap-2 backdrop-blur-sm sticky top-[72px] z-40">
        {[
          { id: 'imageEditor', name: 'Image Editor', icon: <PhotoIcon className="w-5 h-5 mr-2" /> },
          { id: 'imageGenerator', name: 'Image Generator', icon: <RocketLaunchIcon className="w-5 h-5 mr-2" /> },
          { id: 'videoGenerator', name: 'Video Generator', icon: <VideoCameraIcon className="w-5 h-5 mr-2" /> },
          { id: 'videoAnalyzer', name: 'Video Analyzer', icon: <CommandLineIcon className="w-5 h-5 mr-2" /> },
          { id: 'fitCheck', name: 'Fit Check', icon: <TShirtIcon className="w-5 h-5 mr-2" /> },
          { id: 'textChat', name: 'Text Chat', icon: <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" /> },
          { id: 'voiceChat', name: 'Voice Chat', icon: <MegaphoneIcon className="w-5 h-5 mr-2" /> },
          { id: 'ttsGenerator', name: 'TTS', icon: <MegaphoneIcon className="w-5 h-5 mr-2" /> },
        ].map(feature => (
          <button
            key={feature.id}
            onClick={() => { setActiveFeature(feature.id as AppFeature); setError(null); }}
            className={`flex items-center justify-center capitalize font-semibold py-2 px-4 rounded-md transition-all duration-200 text-sm ${
              activeFeature === feature.id
                ? 'bg-gradient-to-br from-purple-500 to-indigo-400 text-white shadow-lg shadow-purple-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            aria-label={`Switch to ${feature.name}`}
          >
            {feature.icon} {feature.name}
          </button>
        ))}
      </div>
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${activeFeature === 'imageEditor' && currentImage ? 'items-start' : 'items-center'}`}>
        {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4 z-[99]">
                <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                <p className="text-md text-red-400">{error}</p>
                <button
                    onClick={() => setError(null)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
                  >
                    Dismiss
                </button>
            </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;