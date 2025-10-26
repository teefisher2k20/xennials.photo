/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type, Chat, FunctionDeclaration, Part } from "@google/genai";
import { decode, decodeAudioData, createBlob, encode } from './audioUtils';

// Helper function to convert a File object to a Gemini API Part
export const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper to convert base64 to Blob
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mimeType });
};

// Helper function to convert a File object to a base64 string
export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Your request was blocked. Reason: ${blockReason}. ${blockReasonMessage || 'Please try rephrasing your prompt to be less sensitive or to comply with content policies.'}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    let explicitReasonMessage = '';
    if (finishReason && finishReason !== 'STOP') {
        explicitReasonMessage = `Reason: ${finishReason}. `;
        if (finishReason === 'SAFETY') {
            explicitReasonMessage += 'The content may violate safety guidelines. Please try a different prompt.';
        } else if (finishReason === 'MAX_TOKENS') {
            explicitReasonMessage += 'The response exceeded the maximum allowed tokens. Please try a shorter or simpler prompt.';
        } else if (finishReason === 'OTHER') {
            explicitReasonMessage += 'An internal issue occurred, or the request was too complex/ambiguous for the model to generate an image. Please try simplifying or rephrasing your prompt.';
        } else if (finishReason === 'IMAGE_OTHER') { // Specific for the user's report
             explicitReasonMessage += 'The image generation process encountered an internal issue or could not fulfill the request. This can be due to a complex or ambiguous prompt, or model limitations. Please try simplifying or rephrasing your prompt.';
        } else {
            // General fallback for any other non-STOP finishReason
            explicitReasonMessage += 'The image generation process stopped unexpectedly. This often relates to model limitations or an inability to fulfill the request. Please try simplifying or rephrasing your prompt.';
        }
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `Image generation for ${context} stopped unexpectedly. ${explicitReasonMessage}` +
        (textFeedback 
            ? ` The model responded with text: "${textFeedback}"`
            : ""); // Only append text feedback if a specific reason isn't already verbose.

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting localized generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'localized edit');
};

/**
 * Generates a general edited image using generative AI based on a text prompt.
 * This is for edits that don't require a specific hotspot, e.g., "remove the person in the background".
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateGeneralEditedImage = async (
    originalImage: File,
    userPrompt: string,
): Promise<string> => {
    console.log('Starting general generative edit:', userPrompt);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural edit on the provided image based on the user's request.
User Request: "${userPrompt}"

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- Do not alter elements not specified in the prompt.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and general edit prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });
    console.log('Received response from model for general edit.', response);

    return handleApiResponse(response, 'general edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Removes the background from an image, making it transparent.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with the background removed.
 */
export const removeImageBackground = async (
    originalImage: File,
): Promise<string> => {
    console.log('Starting background removal.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to precisely remove the background from the provided image, leaving only the main subject. The new background must be transparent.
    
Output: Return ONLY the final edited image as a PNG with a transparent background. Do not add any new elements or text.`;
    const textPart = { text: prompt };

    console.log('Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });
    console.log('Received response from model for background removal.', response);
    
    return handleApiResponse(response, 'background-removal');
};

/**
 * Generates a new image using Imagen model based on a text prompt and aspect ratio.
 * @param prompt The text prompt for image generation.
 * @param aspectRatio The desired aspect ratio (e.g., '1:1', '16:9').
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImage = async (
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
): Promise<string> => {
    console.log(`Generating image with prompt: "${prompt}", aspect ratio: ${aspectRatio}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image data received from Imagen API.");
        }
    } catch (err) {
        console.error("Error generating image with Imagen:", err);
        throw new Error(`Failed to generate image: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    }
};

/**
 * Generates a video using Veo model based on a text prompt and an optional starting image.
 * @param prompt The text prompt for video generation.
 * @param imageFile An optional image file to start the video.
 * @param aspectRatio The desired aspect ratio ('16:9' or '9:16').
 * @param onUpdateStatus Callback to provide status updates during polling.
 * @returns A promise that resolves to the URL of the generated video.
 */
export const generateVideo = async (
    prompt: string,
    imageFile: File | null,
    aspectRatio: '16:9' | '9:16',
    onUpdateStatus: (status: string) => void
): Promise<string> => {
    onUpdateStatus('Checking API key selection...');
    const hasSelectedKey = await window.aistudio.hasSelectedApiKey();
    if (!hasSelectedKey) {
        onUpdateStatus('API key not selected. Opening key selection dialog.');
        await window.aistudio.openSelectKey();
        // Assume success for now; if the next API call fails, it will re-prompt.
    }

    onUpdateStatus('Initializing video generation...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    let videoConfig: {
        numberOfVideos: 1;
        resolution: '720p' | '1080p';
        aspectRatio: '16:9' | '9:16';
    } = {
        numberOfVideos: 1,
        resolution: '720p', // Default to 720p for fast preview
        aspectRatio: aspectRatio,
    };

    let imagePart: { imageBytes: string; mimeType: string; } | undefined = undefined;
    if (imageFile) {
        onUpdateStatus('Uploading starting image...');
        const base64Image = await fileToBase64(imageFile);
        imagePart = {
            imageBytes: base64Image,
            mimeType: imageFile.type,
        };
    }

    try {
        onUpdateStatus('Sending request to Veo API...');
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: imagePart,
            config: videoConfig,
        });

        onUpdateStatus('Video generation started. Waiting for completion...');
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
            onUpdateStatus(`Video processing... ${operation.metadata?.state || 'in progress'}`);
        }

        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            onUpdateStatus('Video generated successfully!');
            // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
            return `${downloadLink}&key=${process.env.API_KEY!}`;
        } else {
            throw new Error("No video URI received from Veo API.");
        }
    } catch (err) {
        // If "Requested entity was not found." implies API key issue, re-prompt
        if (err instanceof Error && err.message.includes("Requested entity was not found.")) {
            onUpdateStatus('API key may be invalid. Please select your API key again.');
            await window.aistudio.openSelectKey(); // Try re-selecting key
        }
        console.error("Error generating video with Veo:", err);
        throw new Error(`Failed to generate video: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    }
};

/**
 * Analyzes a video file and answers a prompt using Gemini Pro.
 * @param videoFile The video file to analyze.
 * @param userPrompt The text prompt for video analysis.
 * @returns A promise that resolves to the text response.
 */
export const analyzeVideo = async (videoFile: File, userPrompt: string): Promise<string> => {
    console.log('Analyzing video with prompt:', userPrompt);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const videoPart = await fileToPart(videoFile);
    const textPart = { text: userPrompt };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [videoPart, textPart] },
        });

        return response.text;
    } catch (err) {
        console.error("Error analyzing video:", err);
        throw new Error(`Failed to analyze video: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    }
};

/**
 * Performs a fit check on outfit images, providing feedback based on a user prompt.
 * @param imageFiles An array of image files of the outfit from different angles.
 * @param userPrompt The text prompt asking for feedback or context.
 * @returns A promise that resolves to the text feedback from the AI.
 */
export const performFitCheck = async (imageFiles: File[], userPrompt: string): Promise<string> => {
    console.log('Performing fit check with images and prompt:', userPrompt);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const imageParts = await Promise.all(imageFiles.map(fileToPart));
    const prompt = `You are an expert fashion stylist AI. Analyze the provided images of an outfit from different angles and respond to the user's request.
User's Outfit Images: [Images Provided]
User Request: "${userPrompt}"

Provide constructive feedback, style tips, or answer questions about the outfit's appropriateness, color coordination, accessories, or overall aesthetic. Ensure your feedback is helpful, encouraging, and respectful.

Safety & Ethics Policy:
- Focus solely on the fashion aspects of the outfit.
- Do NOT comment on the person's body shape, weight, or any personal characteristics beyond the clothing itself.
- Do NOT generate harmful, explicit, or discriminatory content.
- If the image content is inappropriate or irrelevant to an outfit check, politely decline to provide feedback.

Output: Provide your feedback in clear, concise markdown format.`;
    const textPart = { text: prompt };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Use multimodal model for image + text input
            contents: { parts: [...imageParts, textPart] },
            config: {
                responseMimeType: 'text/plain', // Request text/plain output, Markdown will be rendered client-side
            }
        });

        // Check for prompt blocking specifically for text models
        if (response.promptFeedback?.blockReason) {
            const { blockReason, blockReasonMessage } = response.promptFeedback;
            const errorMessage = `Your request was blocked. Reason: ${blockReason}. ${blockReasonMessage || 'Please try rephrasing your prompt to be less sensitive or to comply with content policies.'}`;
            console.error(errorMessage, { response });
            throw new Error(errorMessage);
        }

        return response.text;
    } catch (err) {
        console.error("Error performing fit check:", err);
        throw new Error(`Failed to get fit check feedback: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    }
};

/**
 * Generates suggestions for complementary clothing items or accessories.
 * @param imageFiles An array of image files of the outfit.
 * @param userPrompt The original user prompt for context.
 * @param aiFeedback The AI's initial feedback for context.
 * @returns A promise that resolves to an array of strings, each being a suggestion.
 */
export const getOutfitSuggestions = async (
    imageFiles: File[],
    userPrompt: string,
    aiFeedback: string,
): Promise<string[]> => {
    console.log('Getting outfit suggestions...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const imageParts = await Promise.all(imageFiles.map(fileToPart));
    const prompt = `You are an expert fashion stylist AI. Based on the outfit in the provided images, the user's original request: "${userPrompt}", and the feedback already provided: "${aiFeedback}", suggest 3-5 specific clothing items or accessories that would complement this outfit. Provide each suggestion as a concise, actionable phrase.

Output: Return ONLY a JSON array of strings, where each string is a suggestion. Do not include any other text or markdown.`;
    const textPart = { text: prompt };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // A text-focused model is sufficient here
            contents: { parts: [...imageParts, textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: 'A suggestion for a complementary clothing item or accessory.',
                    },
                },
            },
        });

        if (response.promptFeedback?.blockReason) {
            const { blockReason, blockReasonMessage } = response.promptFeedback;
            console.warn(`Suggestion request blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`);
            return []; // Return empty array on block
        }
        
        const jsonStr = response.text.trim();
        if (!jsonStr) {
            console.warn("No JSON response received for outfit suggestions.");
            return [];
        }
        
        try {
            const suggestions = JSON.parse(jsonStr);
            if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
                return suggestions;
            } else {
                console.error("Invalid JSON format for suggestions:", suggestions);
                return [];
            }
        } catch (parseError) {
            console.error("Failed to parse JSON suggestions:", parseError, jsonStr);
            return [];
        }

    } catch (err) {
        console.error("Error getting outfit suggestions:", err);
        // Do not throw, just return empty array so main flow isn't interrupted
        return [];
    }
};


/**
 * Generates speech from text using the TTS model.
 * @param text The text to convert to speech.
 * @returns A promise that resolves to a base64 encoded audio string.
 */
export const generateTTS = async (text: string): Promise<string> => {
    console.log('Generating speech for text:', text);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // Using 'Kore' as an example voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from TTS API.");
        }
        return base64Audio;
    } catch (err) {
        console.error("Error generating TTS:", err);
        throw new Error(`Failed to generate speech: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    }
};

/**
 * Manages the text chat interaction with Gemini, including grounding and special modes.
 */
export class TextChatService {
    private chat: Chat | null = null;
    private currentGeolocation: { latitude: number; longitude: number } | null = null;
    private readonly setError: (message: string | null) => void;
    private readonly setGroundingUrls: (urls: { uri: string; title: string; }[]) => void;

    constructor(setError: (message: string | null) => void, setGroundingUrls: (urls: { uri: string; title: string; }[]) => void) {
        this.setError = setError;
        this.setGroundingUrls = setGroundingUrls;
        this.initChat();
        this.getGeolocation();
    }

    private initChat(model: string = 'gemini-2.5-flash', config: any = {}) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        this.chat = ai.chats.create({ model, config });
    }

    public async resetChat(model: string = 'gemini-2.5-flash', config: any = {}) {
        this.chat = null; // Clear previous chat instance
        this.initChat(model, config);
        this.setGroundingUrls([]);
        this.setError(null);
    }

    private async getGeolocation() {
        if (navigator.geolocation) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                this.currentGeolocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                console.log("Geolocation obtained:", this.currentGeolocation);
            } catch (error) {
                console.warn("Geolocation permission denied or not available.", error);
                this.currentGeolocation = null;
                // Don't set a hard error, just note that Maps grounding might be limited.
            }
        } else {
            console.warn("Geolocation is not supported by this browser.");
            this.currentGeolocation = null;
        }
    }

    private extractGroundingUrls(response: GenerateContentResponse): { uri: string; title: string; }[] {
        const urls: { uri: string; title: string; }[] = [];
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks) {
            for (const chunk of groundingChunks) {
                if (chunk.web?.uri) {
                    urls.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
                }
                if (chunk.maps?.uri) {
                    urls.push({ uri: chunk.maps.uri, title: chunk.maps.title || chunk.maps.uri });
                }
                if (chunk.maps?.placeAnswerSources) {
                    for (const source of chunk.maps.placeAnswerSources) {
                        if (source.reviewSnippets) {
                            for (const snippet of source.reviewSnippets) {
                                if (snippet.uri) {
                                    urls.push({ uri: snippet.uri, title: snippet.title || snippet.uri });
                                }
                            }
                        }
                    }
                }
            }
        }
        return urls;
    }

    public async sendMessage(
        message: string,
        imageFile: File | null = null,
        videoFile: File | null = null,
        useSearchGrounding: boolean,
        useMapsGrounding: boolean,
        useThinkingMode: boolean,
        useFlashLite: boolean,
        onChunk: (chunk: string) => void,
        onComplete: (fullText: string, urls: { uri: string; title: string; }[]) => void
    ): Promise<void> {
        if (!this.chat) {
            this.setError("Chat service not initialized.");
            return;
        }

        this.setGroundingUrls([]); // Clear previous grounding URLs
        this.setError(null);

        try {
            // Fix: Use the `Part[]` type for contents array.
            const contents: Part[] = [{ text: message }];
            if (imageFile) {
                contents.unshift(await fileToPart(imageFile));
            }
            if (videoFile) {
                contents.unshift(await fileToPart(videoFile));
            }

            const modelConfig: any = {};
            const tools: any[] = [];
            let modelName = 'gemini-2.5-flash';

            if (useFlashLite) {
                modelName = 'gemini-flash-lite-latest';
            } else if (useThinkingMode) {
                modelName = 'gemini-2.5-pro';
                modelConfig.thinkingConfig = { thinkingBudget: 32768 };
            }

            if (useSearchGrounding) {
                tools.push({ googleSearch: {} });
            }
            if (useMapsGrounding) {
                tools.push({ googleMaps: {} });
                if (this.currentGeolocation) {
                    modelConfig.toolConfig = {
                        retrievalConfig: {
                            latLng: this.currentGeolocation
                        }
                    };
                } else {
                    console.warn("Geolocation not available for Maps grounding.");
                }
            }
            
            // Cannot use responseMimeType/responseSchema with grounding tools
            if (!useSearchGrounding && !useMapsGrounding) {
                modelConfig.responseMimeType = "text/markdown";
            } else {
                // Ensure no conflicting configs are sent
                delete modelConfig.responseMimeType;
                delete modelConfig.responseSchema;
            }

            const stream = await this.chat.sendMessageStream({
                model: modelName,
                contents: { parts: contents },
                config: {
                    ...modelConfig,
                    tools: tools.length > 0 ? tools : undefined,
                },
            });

            let fullText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    onChunk(chunk.text);
                }
            }

            // After the stream, get the final response for grounding chunks
            const finalResponse: GenerateContentResponse = await (stream as any).response; // Access the full response object
            const groundingUrls = this.extractGroundingUrls(finalResponse);
            this.setGroundingUrls(groundingUrls);
            onComplete(fullText, groundingUrls);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            this.setError(`Chat failed: ${errorMessage}`);
            console.error("Chat error:", err);
            onComplete('', []); // Ensure completion even on error
        }
    }
}

/**
 * Manages the live audio chat interaction with Gemini.
 */
export class LiveChatService {
    private sessionPromise: Promise<any> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private mediaStream: MediaStream | null = null;
    private outputNode: GainNode | null = null;
    private sources = new Set<AudioBufferSourceNode>();
    private nextStartTime = 0;
    private readonly setError: (message: string | null) => void;
    private readonly onTranscriptionUpdate: (input: string, output: string) => void;
    private currentInputTranscription = '';
    private currentOutputTranscription = '';

    constructor(
        setError: (message: string | null) => void,
        onTranscriptionUpdate: (input: string, output: string) => void,
    ) {
        this.setError = setError;
        this.onTranscriptionUpdate = onTranscriptionUpdate;
    }

    public async startSession(systemInstruction: string = '') {
        if (this.sessionPromise) {
            console.warn("Session already active.");
            return;
        }

        this.setError(null);
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
        this.onTranscriptionUpdate('', ''); // Clear any previous transcriptions

        try {
            // Fix: Use standard AudioContext
            this.inputAudioContext = new window.AudioContext({ sampleRate: 16000 });
            // Fix: Use standard AudioContext
            this.outputAudioContext = new window.AudioContext({ sampleRate: 24000 });
            this.outputNode = this.outputAudioContext.createGain();
            this.outputNode.connect(this.outputAudioContext.destination);

            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

            this.sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.debug('Live session opened.');
                        if (this.inputAudioContext && this.mediaStream) {
                            this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
                            this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
                            this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                this.sessionPromise?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            this.mediaStreamSource.connect(this.scriptProcessor);
                            this.scriptProcessor.connect(this.inputAudioContext.destination);
                        }
                    },
                    onmessage: async (message) => {
                        // Handle audio output
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString && this.outputAudioContext && this.outputNode) {
                            this.nextStartTime = Math.max(
                                this.nextStartTime,
                                this.outputAudioContext.currentTime,
                            );
                            try {
                                const audioBuffer = await decodeAudioData(
                                    decode(base64EncodedAudioString),
                                    this.outputAudioContext,
                                    24000,
                                    1,
                                );
                                const source = this.outputAudioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(this.outputNode);
                                source.addEventListener('ended', () => {
                                    this.sources.delete(source);
                                });

                                source.start(this.nextStartTime);
                                this.nextStartTime = this.nextStartTime + audioBuffer.duration;
                                this.sources.add(source);
                            } catch (e) {
                                console.error("Error decoding or playing audio:", e);
                                this.setError("Failed to play audio response.");
                            }
                        }

                        // Handle transcription
                        if (message.serverContent?.outputTranscription) {
                            this.currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            this.currentInputTranscription += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            this.onTranscriptionUpdate(this.currentInputTranscription, this.currentOutputTranscription);
                            this.currentInputTranscription = '';
                            this.currentOutputTranscription = '';
                        } else {
                            // Update UI with partial transcriptions for real-time feel
                            this.onTranscriptionUpdate(this.currentInputTranscription, this.currentOutputTranscription);
                        }

                        // Handle interruptions
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of this.sources.values()) {
                                source.stop();
                                this.sources.delete(source);
                            }
                            this.nextStartTime = 0;
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        this.setError('Voice chat encountered an error. Please try again.');
                        this.stopSession();
                    },
                    onclose: (e) => {
                        console.debug('Live session closed:', e);
                        this.stopSessionCleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: systemInstruction || 'You are a friendly and helpful AI assistant.',
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
            });
            return true; // Session started successfully
        } catch (err) {
            console.error("Failed to start live session:", err);
            this.setError(`Failed to start voice chat: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
            this.stopSession(); // Clean up if start fails
            return false;
        }
    }

    public stopSession() {
        if (this.sessionPromise) {
            this.sessionPromise.then((session) => {
                session.close();
            }).catch(e => console.error("Error closing session:", e));
            this.sessionPromise = null;
        }
        this.stopSessionCleanup();
    }

    private stopSessionCleanup() {
        if (this.scriptProcessor) {
            this.scriptProcessor.onaudioprocess = null;
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.inputAudioContext) {
            this.inputAudioContext.close();
            this.inputAudioContext = null;
        }
        if (this.outputAudioContext) {
            for (const source of this.sources.values()) {
                source.stop();
            }
            this.sources.clear();
            this.nextStartTime = 0;
            this.outputAudioContext.close();
            this.outputAudioContext = null;
        }
        if (this.outputNode) {
            this.outputNode.disconnect();
            this.outputNode = null;
        }
        this.onTranscriptionUpdate(this.currentInputTranscription, this.currentOutputTranscription); // Final update
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
        console.debug('Live session cleanup complete.');
    }
}