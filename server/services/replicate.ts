/**
 * Service for generating music using Replicate API (for Suno)
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

// Directory to store the generated audio files
const audioDir = path.join(process.cwd(), "uploads", "audio");

// Create audio directory if it doesn't exist
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Replicate API configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_ENDPOINT = "https://api.replicate.com/v1/predictions";

/**
 * Generate music based on baby name and style
 */
export async function generateMusic(
  babyName: string,
  style: string,
  duration: number
): Promise<{ url: string }> {
  try {
    // Adjust prompt based on style and baby name
    const styleDescriptions: Record<string, string> = {
      lullaby: "gentle lullaby, soft piano, soothing melody",
      playful: "cheerful children's song, playful rhythm, joyful tune",
      classical: "classical orchestral piece, elegant strings, peaceful",
      nature: "nature sounds, gentle birds, flowing water, relaxing atmosphere",
    };
    
    const styleDesc = styleDescriptions[style] || "gentle lullaby";
    const durationPrompt = duration <= 60 ? "short" : "medium length";
    
    // Create the prompt for Suno
    const prompt = `Create a ${durationPrompt} ${styleDesc} for a baby named ${babyName}. The piece should be calming and perfect for a young mother to play for her child.`;
    
    // In a real implementation, we would call the Replicate API
    // For this example, we'll simulate a response with a mock URL
    
    // This is where we would make the API call to Replicate
    // const response = await fetch(REPLICATE_ENDPOINT, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Token ${REPLICATE_API_TOKEN}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     version: "2b1a361b528d4d5592fc259a6d133a9f9d6f863cea73d22e943ce9a3f544627d",
    //     input: {
    //       prompt: prompt,
    //       duration: Math.min(duration, 180),
    //     },
    //   }),
    // });
    
    // const prediction = await response.json();
    // return { url: prediction.output };
    
    // For development purposes, we'll return a mock URL
    // In production, replace this with the actual API call
    
    // Simulate the URL for the generated music
    const audioFileName = `${babyName.toLowerCase().replace(/\s+/g, '-')}-${style}-${nanoid(8)}.mp3`;
    const audioFilePath = path.join(audioDir, audioFileName);
    
    // In a real implementation, we would download the generated audio file
    // and save it to the audioFilePath
    
    // Return a mock URL for demo purposes
    return {
      url: `/uploads/audio/${audioFileName}`,
    };
  } catch (error) {
    console.error("Error generating music:", error);
    throw new Error("Failed to generate music");
  }
}
