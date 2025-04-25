import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateChatResponse } from "./services/openai";
import { generateMusic } from "./services/replicate";
import { music, images } from "../shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage2,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/heic"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and HEIC images are allowed"));
    }
    cb(null, true);
  },
});

// Schema for music generation request
const musicGenerationSchema = z.object({
  babyName: z.string().min(1, "Baby name is required"),
  style: z.string().min(1, "Music style is required"),
  duration: z.number().int().min(30).max(180),
});

// Schema for chat message
const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  personaSystemPrompt: z.string().optional(),
});

// Schema for favorite toggle
const favoriteToggleSchema = z.object({
  itemId: z.number().int().positive(),
  type: z.enum(["music", "image"]),
});

// Schema for media sharing
const mediaShareSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(["music", "image"]),
});

// Schema for saving chat
const saveChatSchema = z.object({
  title: z.string().min(1, "Title is required"),
  personaId: z.string().min(1, "Persona ID is required"),
  personaName: z.string().min(1, "Persona name is required"),
  personaEmoji: z.string().min(1, "Persona emoji is required"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
    })
  ).min(1, "At least one message is required"),
  summary: z.string().min(1, "Summary is required"),
  userMemo: z.string().optional(),
  mood: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve embed script for iframe integration
  app.get('/embed.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/public/embed.js'));
  });
  
  // API routes

  // Music endpoints
  app.post("/api/music/generate", async (req, res) => {
    try {
      const validatedData = musicGenerationSchema.parse(req.body);
      
      // Generate music using AI service
      const musicData = await generateMusic(
        validatedData.babyName,
        validatedData.style,
        validatedData.duration
      );
      
      // Save to database
      const savedMusic = await storage.saveMusicGeneration(
        validatedData.babyName,
        validatedData.style,
        musicData.url,
        validatedData.duration
      );
      
      return res.status(201).json(savedMusic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating music:", error);
      return res.status(500).json({ error: "Failed to generate music" });
    }
  });

  app.get("/api/music", async (req, res) => {
    try {
      const musicList = await storage.getMusicList();
      return res.json(musicList);
    } catch (error) {
      console.error("Error fetching music list:", error);
      return res.status(500).json({ error: "Failed to fetch music list" });
    }
  });

  // Image transformation endpoints
  app.post("/api/image/transform", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }
      
      const { style } = req.body;
      if (!style) {
        return res.status(400).json({ error: "No style selected" });
      }
      
      // Process image using AI service (transforming to specified art style)
      const filePath = req.file.path;
      const transformedImageUrl = await storage.transformImage(filePath, style);
      
      // Save to database
      const savedImage = await storage.saveImageTransformation(
        req.file.originalname,
        style,
        filePath,
        transformedImageUrl
      );
      
      return res.status(201).json(savedImage);
    } catch (error) {
      console.error("Error transforming image:", error);
      return res.status(500).json({ error: "Failed to transform image" });
    }
  });

  app.get("/api/image", async (req, res) => {
    try {
      const imageList = await storage.getImageList();
      return res.json(imageList);
    } catch (error) {
      console.error("Error fetching image list:", error);
      return res.status(500).json({ error: "Failed to fetch image list" });
    }
  });

  // Chat endpoints
  app.post("/api/chat/message", async (req, res) => {
    try {
      const validatedData = chatMessageSchema.parse(req.body);
      
      // Check if this is an ephemeral request
      const isEphemeral = req.query.ephemeral === 'true';
      
      let userMessage, assistantMessage;
      
      // Generate AI response with persona's system prompt if provided
      const aiResponse = await generateChatResponse(
        validatedData.message,
        validatedData.personaSystemPrompt
      );
      
      if (isEphemeral) {
        // For ephemeral messages, we don't save to database
        // Just create response objects with the content
        userMessage = {
          id: Date.now(),
          role: "user",
          content: validatedData.message,
          createdAt: new Date().toISOString(),
        };
        
        assistantMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: aiResponse,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Save user message
        userMessage = await storage.saveUserMessage(validatedData.message);
        
        // Save AI response
        assistantMessage = await storage.saveAssistantMessage(aiResponse);
      }
      
      return res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error sending chat message:", error);
      return res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    try {
      const chatHistory = await storage.getChatHistory();
      return res.json(chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      return res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Gallery endpoints
  app.get("/api/gallery", async (req, res) => {
    try {
      const filter = req.query.filter as string | undefined;
      let galleryItems;
      
      if (filter === "recent") {
        galleryItems = await storage.getRecentItems();
      } else if (filter === "music") {
        galleryItems = await storage.getMusicList();
      } else if (filter === "image") {
        galleryItems = await storage.getImageList();
      } else if (filter === "favorite") {
        galleryItems = await storage.getFavoriteItems();
      } else {
        galleryItems = await storage.getAllItems();
      }
      
      return res.json(galleryItems);
    } catch (error) {
      console.error("Error fetching gallery items:", error);
      return res.status(500).json({ error: "Failed to fetch gallery items" });
    }
  });

  app.post("/api/gallery/favorite", async (req, res) => {
    try {
      const validatedData = favoriteToggleSchema.parse(req.body);
      
      const updated = await storage.toggleFavorite(
        validatedData.itemId,
        validatedData.type
      );
      
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error toggling favorite:", error);
      return res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  // Media management endpoints
  app.get("/api/media/download/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      
      if (type !== "music" && type !== "image") {
        return res.status(400).json({ error: "Invalid media type" });
      }
      
      const mediaItem = await storage.getMediaItem(parseInt(id), type);
      
      if (!mediaItem) {
        return res.status(404).json({ error: "Media not found" });
      }
      
      // For actual download, we'd stream the file or redirect to its URL
      // For this example, we'll return different URLs based on media type
      const downloadUrl = type === "music" 
        ? (mediaItem as typeof music.$inferSelect).url 
        : (mediaItem as typeof images.$inferSelect).transformedUrl;
      
      return res.json({ downloadUrl });
    } catch (error) {
      console.error("Error downloading media:", error);
      return res.status(500).json({ error: "Failed to download media" });
    }
  });

  app.post("/api/media/share", async (req, res) => {
    try {
      const validatedData = mediaShareSchema.parse(req.body);
      
      // Generate a share link or token
      const shareLink = await storage.createShareLink(
        validatedData.id,
        validatedData.type
      );
      
      return res.json({ shareLink });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error sharing media:", error);
      return res.status(500).json({ error: "Failed to share media" });
    }
  });
  
  // Saved chat endpoints
  app.post("/api/chat/save", async (req, res) => {
    try {
      const validatedData = saveChatSchema.parse(req.body);
      
      // Save the chat to the database
      const savedChat = await storage.saveChat(validatedData);
      
      return res.status(201).json(savedChat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error saving chat:", error);
      return res.status(500).json({ error: "Failed to save chat" });
    }
  });
  
  app.get("/api/chat/saved", async (req, res) => {
    try {
      const savedChats = await storage.getSavedChats();
      return res.json(savedChats);
    } catch (error) {
      console.error("Error fetching saved chats:", error);
      return res.status(500).json({ error: "Failed to fetch saved chats" });
    }
  });
  
  app.get("/api/chat/saved/:id", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      if (isNaN(chatId)) {
        return res.status(400).json({ error: "Invalid chat ID" });
      }
      
      const savedChat = await storage.getSavedChat(chatId);
      
      if (!savedChat) {
        return res.status(404).json({ error: "Saved chat not found" });
      }
      
      return res.json(savedChat);
    } catch (error) {
      console.error("Error fetching saved chat:", error);
      return res.status(500).json({ error: "Failed to fetch saved chat" });
    }
  });
  
  app.delete("/api/chat/saved/:id", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      if (isNaN(chatId)) {
        return res.status(400).json({ error: "Invalid chat ID" });
      }
      
      const result = await storage.deleteSavedChat(chatId);
      return res.json(result);
    } catch (error) {
      console.error("Error deleting saved chat:", error);
      return res.status(500).json({ error: "Failed to delete saved chat" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
