import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateChatResponse } from "./services/openai";
import { generateMusic } from "./services/replicate";
import { 
  music, 
  images, 
  personas, 
  personaCategories,
  concepts,
  conceptCategories,
  abTests,
  abTestVariants,
  abTestResults,
  insertConceptSchema,
  insertConceptCategorySchema,
  eq,
  asc,
  and,
  sql
} from "../shared/schema";
import { db } from "../db";

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

// Schema for persona creation/update
const personaSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  name: z.string().min(1, "Name is required"),
  avatarEmoji: z.string().min(1, "Avatar emoji is required"),
  description: z.string().min(1, "Description is required"),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  primaryColor: z.string().min(1, "Primary color is required"),
  secondaryColor: z.string().min(1, "Secondary color is required"),
  
  // Additional fields (optional)
  personality: z.string().optional(),
  tone: z.string().optional(),
  usageContext: z.string().optional(),
  emotionalKeywords: z.array(z.string()).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "all"]).default("all"),
  
  // Admin fields (optional with defaults)
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  
  // Categories
  categories: z.array(z.string()).optional(),
});

// Schema for persona category creation/update
const personaCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  emoji: z.string().min(1, "Emoji is required"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Schema for concept category creation/update
const conceptCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Schema for concept creation/update
const conceptSchema = z.object({
  conceptId: z.string().min(1, "Concept ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  promptTemplate: z.string().min(1, "Prompt template is required"),
  thumbnailUrl: z.string().optional(),
  tagSuggestions: z.array(z.string()).optional(),
  variables: z.array(
    z.object({
      name: z.string().min(1, "Variable name is required"),
      description: z.string().optional(),
      type: z.enum(["text", "number", "select", "color"]),
      defaultValue: z.string().optional(),
      options: z.array(
        z.object({
          label: z.string(),
          value: z.string()
        })
      ).optional()
    })
  ).optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
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
      
      // Check if this is a specific variant request for A/B testing
      const variantId = req.body.variant;
      let promptTemplate = null;
      
      if (variantId) {
        // Get the active test for this concept/style
        const activeTest = await db.query.abTests.findFirst({
          where: and(
            eq(abTests.conceptId, style),
            eq(abTests.isActive, true)
          ),
        });
        
        if (activeTest) {
          // Find the requested variant
          const variant = await db.query.abTestVariants.findFirst({
            where: and(
              eq(abTestVariants.testId, activeTest.testId),
              eq(abTestVariants.variantId, variantId)
            ),
          });
          
          if (variant) {
            promptTemplate = variant.promptTemplate;
          }
        }
      }
      
      // Process image using AI service (transforming to specified art style)
      const filePath = req.file.path;
      // Pass the variant's prompt template if available
      const transformedImageUrl = await storage.transformImage(filePath, style, promptTemplate);
      
      // Save to database
      const savedImage = await storage.saveImageTransformation(
        req.file.originalname,
        style,
        filePath,
        transformedImageUrl,
        variantId // Store which variant was used, if any
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
      
      const downloadUrl = type === "music" 
        ? (mediaItem as typeof music.$inferSelect).url 
        : (mediaItem as typeof images.$inferSelect).transformedUrl;
      
      // For a direct download, redirect to the URL
      // This is more efficient than proxying the content through our server
      return res.redirect(downloadUrl);
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

  // Admin-only persona management endpoints
  // Note: In a production app, these would need authentication/authorization
  
  // Get all personas
  app.get("/api/admin/personas", async (req, res) => {
    try {
      const allPersonas = await db.query.personas.findMany({
        orderBy: (personas, { asc }) => [asc(personas.order)]
      });
      return res.json(allPersonas);
    } catch (error) {
      console.error("Error fetching personas:", error);
      return res.status(500).json({ error: "Failed to fetch personas" });
    }
  });
  
  // Get a specific persona
  app.get("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      const persona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!persona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      return res.json(persona);
    } catch (error) {
      console.error("Error fetching persona:", error);
      return res.status(500).json({ error: "Failed to fetch persona" });
    }
  });
  
  // Create a new persona
  app.post("/api/admin/personas", async (req, res) => {
    try {
      const validatedData = personaSchema.parse(req.body);
      
      // Check if persona with this ID already exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, validatedData.personaId)
      });
      
      if (existingPersona) {
        return res.status(409).json({ error: "A persona with this ID already exists" });
      }
      
      // Insert new persona
      const [newPersona] = await db.insert(personas).values({
        personaId: validatedData.personaId,
        name: validatedData.name,
        avatarEmoji: validatedData.avatarEmoji,
        description: validatedData.description,
        welcomeMessage: validatedData.welcomeMessage,
        systemPrompt: validatedData.systemPrompt,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        personality: validatedData.personality,
        tone: validatedData.tone,
        usageContext: validatedData.usageContext,
        emotionalKeywords: validatedData.emotionalKeywords,
        timeOfDay: validatedData.timeOfDay,
        isActive: validatedData.isActive,
        isFeatured: validatedData.isFeatured,
        order: validatedData.order,
        categories: validatedData.categories,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newPersona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating persona:", error);
      return res.status(500).json({ error: "Failed to create persona" });
    }
  });
  
  // Update an existing persona
  app.put("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      const validatedData = personaSchema.parse(req.body);
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Update persona
      const [updatedPersona] = await db.update(personas)
        .set({
          personaId: validatedData.personaId,
          name: validatedData.name,
          avatarEmoji: validatedData.avatarEmoji,
          description: validatedData.description,
          welcomeMessage: validatedData.welcomeMessage,
          systemPrompt: validatedData.systemPrompt,
          primaryColor: validatedData.primaryColor,
          secondaryColor: validatedData.secondaryColor,
          personality: validatedData.personality,
          tone: validatedData.tone,
          usageContext: validatedData.usageContext,
          emotionalKeywords: validatedData.emotionalKeywords,
          timeOfDay: validatedData.timeOfDay,
          isActive: validatedData.isActive,
          isFeatured: validatedData.isFeatured,
          order: validatedData.order,
          categories: validatedData.categories,
          updatedAt: new Date(),
        })
        .where(eq(personas.personaId, personaId))
        .returning();
      
      return res.json(updatedPersona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating persona:", error);
      return res.status(500).json({ error: "Failed to update persona" });
    }
  });
  
  // Delete a persona
  app.delete("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Delete persona
      await db.delete(personas).where(eq(personas.personaId, personaId));
      
      return res.json({ success: true, message: "Persona deleted successfully" });
    } catch (error) {
      console.error("Error deleting persona:", error);
      return res.status(500).json({ error: "Failed to delete persona" });
    }
  });
  
  // Batch import personas (admin-only)
  app.post("/api/admin/personas/batch", async (req, res) => {
    try {
      // Parse as array of persona objects
      const personaBatchSchema = z.array(personaSchema);
      const personaList = personaBatchSchema.parse(req.body);
      
      const results = [];
      const actions = [];
      
      // Process each persona in the batch
      for (const validatedData of personaList) {
        try {
          // Check if persona with this ID already exists
          const existingPersona = await db.query.personas.findFirst({
            where: eq(personas.personaId, validatedData.personaId)
          });
          
          let result;
          let action;
          
          if (existingPersona) {
            // Update existing persona
            const [updatedPersona] = await db.update(personas)
              .set({
                name: validatedData.name,
                avatarEmoji: validatedData.avatarEmoji,
                description: validatedData.description,
                welcomeMessage: validatedData.welcomeMessage,
                systemPrompt: validatedData.systemPrompt,
                primaryColor: validatedData.primaryColor,
                secondaryColor: validatedData.secondaryColor,
                personality: validatedData.personality,
                tone: validatedData.tone,
                usageContext: validatedData.usageContext,
                emotionalKeywords: validatedData.emotionalKeywords,
                timeOfDay: validatedData.timeOfDay,
                isActive: validatedData.isActive,
                isFeatured: validatedData.isFeatured,
                order: validatedData.order,
                categories: validatedData.categories,
                updatedAt: new Date(),
              })
              .where(eq(personas.personaId, validatedData.personaId))
              .returning();
              
            result = updatedPersona;
            action = 'updated';
          } else {
            // Create new persona
            const [newPersona] = await db.insert(personas).values({
              personaId: validatedData.personaId,
              name: validatedData.name,
              avatarEmoji: validatedData.avatarEmoji,
              description: validatedData.description,
              welcomeMessage: validatedData.welcomeMessage,
              systemPrompt: validatedData.systemPrompt,
              primaryColor: validatedData.primaryColor,
              secondaryColor: validatedData.secondaryColor,
              personality: validatedData.personality,
              tone: validatedData.tone,
              usageContext: validatedData.usageContext,
              emotionalKeywords: validatedData.emotionalKeywords,
              timeOfDay: validatedData.timeOfDay,
              isActive: validatedData.isActive,
              isFeatured: validatedData.isFeatured,
              order: validatedData.order,
              useCount: 0,
              categories: validatedData.categories,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            
            result = newPersona;
            action = 'created';
          }
          
          results.push(result);
          actions.push(action);
        } catch (error) {
          console.error(`Error processing persona ${validatedData.personaId}:`, error);
          // Continue processing the rest of the batch even if one fails
          results.push({ error: `Failed to process persona ${validatedData.personaId}` });
          actions.push('failed');
        }
      }
      
      return res.status(201).json({
        success: true,
        count: results.length,
        created: actions.filter(a => a === 'created').length,
        updated: actions.filter(a => a === 'updated').length,
        failed: actions.filter(a => a === 'failed').length,
        results
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error in batch import:", error);
      return res.status(500).json({ error: "Failed to process personas in batch import" });
    }
  });
  
  // Admin-only persona category management endpoints
  
  // Get all categories
  app.get("/api/admin/categories", async (req, res) => {
    try {
      const allCategories = await db.query.personaCategories.findMany({
        orderBy: (personaCategories, { asc }) => [asc(personaCategories.order)]
      });
      return res.json(allCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  
  // Get a specific category
  app.get("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const category = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.status(500).json({ error: "Failed to fetch category" });
    }
  });
  
  // Create a new category
  app.post("/api/admin/categories", async (req, res) => {
    try {
      const validatedData = personaCategorySchema.parse(req.body);
      
      // Check if category with this ID already exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, validatedData.categoryId)
      });
      
      if (existingCategory) {
        return res.status(409).json({ error: "A category with this ID already exists" });
      }
      
      // Insert new category
      const [newCategory] = await db.insert(personaCategories).values({
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        description: validatedData.description,
        emoji: validatedData.emoji,
        order: validatedData.order,
        isActive: validatedData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating category:", error);
      return res.status(500).json({ error: "Failed to create category" });
    }
  });
  
  // Update an existing category
  app.put("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const validatedData = personaCategorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Update category
      const [updatedCategory] = await db.update(personaCategories)
        .set({
          categoryId: validatedData.categoryId,
          name: validatedData.name,
          description: validatedData.description,
          emoji: validatedData.emoji,
          order: validatedData.order,
          isActive: validatedData.isActive,
          updatedAt: new Date(),
        })
        .where(eq(personaCategories.categoryId, categoryId))
        .returning();
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating category:", error);
      return res.status(500).json({ error: "Failed to update category" });
    }
  });
  
  // Delete a category
  app.delete("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Delete category
      await db.delete(personaCategories).where(eq(personaCategories.categoryId, categoryId));
      
      return res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ error: "Failed to delete category" });
    }
  });
  
  // API to increment usage count for a persona (for recommendation engine)
  app.post("/api/personas/:id/use", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Increment use count
      const [updatedPersona] = await db.update(personas)
        .set({
          useCount: (existingPersona.useCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(personas.personaId, personaId))
        .returning();
      
      return res.json({ success: true, useCount: updatedPersona.useCount });
    } catch (error) {
      console.error("Error incrementing persona use count:", error);
      return res.status(500).json({ error: "Failed to increment persona use count" });
    }
  });
  
  // API to recommend personas based on various factors
  app.get("/api/personas/recommend", async (req, res) => {
    try {
      // Get query parameters
      const timeOfDay = req.query.timeOfDay as string || 
                        (() => {
                          const hour = new Date().getHours();
                          if (hour >= 5 && hour < 12) return "morning";
                          if (hour >= 12 && hour < 17) return "afternoon";
                          if (hour >= 17 && hour < 21) return "evening";
                          return "night";
                        })();
      
      // Get emotion keywords from query if provided
      const emotions = req.query.emotions 
                      ? (req.query.emotions as string).split(',') 
                      : [];
      
      // Get all active personas
      const allPersonas = await db.query.personas.findMany({
        where: eq(personas.isActive, true)
      });
      
      // Score each persona based on recommendation factors
      const scoredPersonas = allPersonas.map(persona => {
        let score = 0;
        
        // Factor 1: Time of day match
        if (persona.timeOfDay === timeOfDay || persona.timeOfDay === "all") {
          score += 10;
        }
        
        // Factor 2: Emotional keyword match
        const personaEmotions = persona.emotionalKeywords as string[] || [];
        emotions.forEach(emotion => {
          if (personaEmotions.includes(emotion)) {
            score += 5;
          }
        });
        
        // Factor 3: Featured status
        if (persona.isFeatured) {
          score += 15;
        }
        
        // Factor 4: Popularity (use count)
        score += Math.min(persona.useCount || 0, 50) / 5;
        
        return { persona, score };
      });
      
      // Sort by score (descending) and return top results
      scoredPersonas.sort((a, b) => b.score - a.score);
      
      // Return top recommendations with scores
      return res.json({
        timeOfDay,
        emotions,
        recommendations: scoredPersonas.slice(0, 5).map(({ persona, score }) => ({
          id: persona.personaId,
          name: persona.name,
          avatarEmoji: persona.avatarEmoji,
          description: persona.description,
          score: Math.round(score),
          categories: persona.categories as string[] || [],
        }))
      });
    } catch (error) {
      console.error("Error getting persona recommendations:", error);
      return res.status(500).json({ error: "Failed to get persona recommendations" });
    }
  });

  // AI Image Generation Concept Management
  
  // Get all concept categories
  app.get("/api/admin/concept-categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(conceptCategories).orderBy(asc(conceptCategories.order));
      return res.json(allCategories);
    } catch (error) {
      console.error("Error fetching concept categories:", error);
      return res.status(500).json({ error: "Failed to fetch concept categories" });
    }
  });
  
  // Get a specific concept category
  app.get("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const category = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      console.error("Error fetching concept category:", error);
      return res.status(500).json({ error: "Failed to fetch concept category" });
    }
  });
  
  // Create a new concept category
  app.post("/api/admin/concept-categories", async (req, res) => {
    try {
      const validatedData = conceptCategorySchema.parse(req.body);
      
      // Check if category with this ID already exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, validatedData.categoryId)
      });
      
      if (existingCategory) {
        return res.status(409).json({ error: "A concept category with this ID already exists" });
      }
      
      // Insert new category
      const [newCategory] = await db.insert(conceptCategories).values({
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        description: validatedData.description,
        order: validatedData.order,
        isActive: validatedData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating concept category:", error);
      return res.status(500).json({ error: "Failed to create concept category" });
    }
  });
  
  // Update a concept category
  app.put("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const validatedData = conceptCategorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      // Update category
      const [updatedCategory] = await db.update(conceptCategories)
        .set({
          name: validatedData.name,
          description: validatedData.description,
          order: validatedData.order,
          isActive: validatedData.isActive,
          updatedAt: new Date(),
        })
        .where(eq(conceptCategories.categoryId, categoryId))
        .returning();
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating concept category:", error);
      return res.status(500).json({ error: "Failed to update concept category" });
    }
  });
  
  // Delete a concept category
  app.delete("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      // Delete category
      await db.delete(conceptCategories).where(eq(conceptCategories.categoryId, categoryId));
      
      return res.json({ success: true, message: "Concept category deleted successfully" });
    } catch (error) {
      console.error("Error deleting concept category:", error);
      return res.status(500).json({ error: "Failed to delete concept category" });
    }
  });
  
  // Get all concepts
  app.get("/api/admin/concepts", async (req, res) => {
    try {
      const allConcepts = await db.select().from(concepts).orderBy(asc(concepts.order));
      return res.json(allConcepts);
    } catch (error) {
      console.error("Error fetching concepts:", error);
      return res.status(500).json({ error: "Failed to fetch concepts" });
    }
  });
  
  // Get a specific concept
  app.get("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      
      const concept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      return res.json(concept);
    } catch (error) {
      console.error("Error fetching concept:", error);
      return res.status(500).json({ error: "Failed to fetch concept" });
    }
  });
  
  // Create a new concept
  app.post("/api/admin/concepts", async (req, res) => {
    try {
      const validatedData = conceptSchema.parse(req.body);
      
      // Check if concept with this ID already exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, validatedData.conceptId)
      });
      
      if (existingConcept) {
        return res.status(409).json({ error: "A concept with this ID already exists" });
      }
      
      // Insert new concept
      const [newConcept] = await db.insert(concepts).values({
        conceptId: validatedData.conceptId,
        title: validatedData.title,
        description: validatedData.description,
        promptTemplate: validatedData.promptTemplate,
        thumbnailUrl: validatedData.thumbnailUrl,
        tagSuggestions: validatedData.tagSuggestions,
        variables: validatedData.variables,
        categoryId: validatedData.categoryId,
        isActive: validatedData.isActive,
        isFeatured: validatedData.isFeatured,
        order: validatedData.order,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newConcept);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating concept:", error);
      return res.status(500).json({ error: "Failed to create concept" });
    }
  });
  
  // Update a concept
  app.put("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      const validatedData = conceptSchema.parse(req.body);
      
      // Check if concept exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!existingConcept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Update concept
      const [updatedConcept] = await db.update(concepts)
        .set({
          title: validatedData.title,
          description: validatedData.description,
          promptTemplate: validatedData.promptTemplate,
          thumbnailUrl: validatedData.thumbnailUrl,
          tagSuggestions: validatedData.tagSuggestions,
          variables: validatedData.variables,
          categoryId: validatedData.categoryId,
          isActive: validatedData.isActive,
          isFeatured: validatedData.isFeatured,
          order: validatedData.order,
          updatedAt: new Date(),
        })
        .where(eq(concepts.conceptId, conceptId))
        .returning();
      
      return res.json(updatedConcept);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating concept:", error);
      return res.status(500).json({ error: "Failed to update concept" });
    }
  });
  
  // Delete a concept
  app.delete("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      
      // Check if concept exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!existingConcept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Delete concept
      await db.delete(concepts).where(eq(concepts.conceptId, conceptId));
      
      return res.json({ success: true, message: "Concept deleted successfully" });
    } catch (error) {
      console.error("Error deleting concept:", error);
      return res.status(500).json({ error: "Failed to delete concept" });
    }
  });

  // Internationalization (i18n) API endpoints
  
  // Upload translations for a specific language
  app.post("/api/admin/translations/:lang", async (req, res) => {
    try {
      const lang = req.params.lang;
      const translations = req.body;
      
      if (!translations || typeof translations !== 'object') {
        return res.status(400).json({ error: "Invalid translations format. Expected JSON object with key-value pairs." });
      }
      
      // In a real implementation, we would store these in a database or file system
      // For now, we'll just return a success response
      
      return res.json({ 
        success: true, 
        message: `Successfully uploaded translations for ${lang}`,
        count: Object.keys(translations).length
      });
    } catch (error) {
      console.error("Error uploading translations:", error);
      return res.status(500).json({ error: "Failed to upload translations" });
    }
  });
  
  // Get available languages
  app.get("/api/languages", async (req, res) => {
    try {
      // In a real implementation, we would retrieve this from a database
      // For now, we'll just return a predefined list
      return res.json([
        { code: "en", name: "English", isDefault: true },
        { code: "ko", name: "Korean" }
      ]);
    } catch (error) {
      console.error("Error fetching languages:", error);
      return res.status(500).json({ error: "Failed to fetch languages" });
    }
  });

  // Thumbnail upload endpoint for concepts
  app.post("/api/admin/upload/thumbnail", upload.single("thumbnail"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Generate a public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      return res.status(500).json({ error: "Failed to upload thumbnail" });
    }
  });
  
  // A/B Testing routes
  // Get all A/B tests
  app.get("/api/admin/abtests", async (req, res) => {
    try {
      const allTests = await db.query.abTests.findMany({
        orderBy: [asc(abTests.name)],
      });
      
      return res.json(allTests);
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
      return res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });
  
  // Get a single A/B test with its variants
  app.get("/api/admin/abtests/:id", async (req, res) => {
    try {
      const testId = req.params.id;
      
      const test = await db.query.abTests.findFirst({
        where: eq(abTests.testId, testId),
      });
      
      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      
      const variants = await db.query.abTestVariants.findMany({
        where: eq(abTestVariants.testId, testId),
      });
      
      return res.json({
        ...test,
        variants
      });
    } catch (error) {
      console.error("Error fetching A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch A/B test" });
    }
  });
  
  // Create an A/B test
  app.post("/api/admin/abtests", async (req, res) => {
    try {
      const abTestSchema = z.object({
        testId: z.string().min(1, "Test ID is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        conceptId: z.string().min(1, "Concept ID is required"),
        isActive: z.boolean().default(true),
        variants: z.array(z.object({
          variantId: z.string().min(1, "Variant ID is required"),
          name: z.string().min(1, "Name is required"),
          promptTemplate: z.string().min(1, "Prompt template is required"),
          variables: z.array(z.any()).optional(),
        })).min(2, "At least two variants are required")
      });
      
      const validatedData = abTestSchema.parse(req.body);
      
      // Check if concept exists
      const concept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, validatedData.conceptId)
      });
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Create test
      const [newTest] = await db.insert(abTests).values({
        testId: validatedData.testId,
        name: validatedData.name,
        description: validatedData.description || null,
        conceptId: validatedData.conceptId,
        isActive: validatedData.isActive,
        startDate: new Date(),
      }).returning();
      
      // Create variants
      const variants = await Promise.all(
        validatedData.variants.map(async (variant) => {
          const [newVariant] = await db.insert(abTestVariants).values({
            testId: validatedData.testId,
            variantId: variant.variantId,
            name: variant.name,
            promptTemplate: variant.promptTemplate,
            variables: variant.variables || [],
          }).returning();
          
          return newVariant;
        })
      );
      
      return res.status(201).json({
        ...newTest,
        variants
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating A/B test:", error);
      return res.status(500).json({ error: "Failed to create A/B test" });
    }
  });
  
  // Get active A/B test for a specific concept/style
  app.get("/api/abtests/active/:conceptId", async (req, res) => {
    try {
      const { conceptId } = req.params;
      
      const activeTest = await db.query.abTests.findFirst({
        where: and(
          eq(abTests.conceptId, conceptId),
          eq(abTests.isActive, true)
        ),
        with: {
          variants: true
        }
      });
      
      if (!activeTest) {
        return res.status(404).json({ error: "No active A/B test found for this concept" });
      }
      
      return res.json(activeTest);
    } catch (error) {
      console.error("Error fetching active A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch active A/B test" });
    }
  });
  
  // Record A/B test result
  app.post("/api/abtests/result", async (req, res) => {
    try {
      const resultSchema = z.object({
        testId: z.string().min(1, "Test ID is required"),
        selectedVariantId: z.string().min(1, "Selected variant ID is required"),
        userId: z.number().int().optional(),
        context: z.record(z.any()).optional(),
      });
      
      const validatedData = resultSchema.parse(req.body);
      
      // Record the result
      const [result] = await db.insert(abTestResults).values({
        testId: validatedData.testId,
        selectedVariantId: validatedData.selectedVariantId,
        userId: validatedData.userId || null,
        context: validatedData.context || {},
      }).returning();
      
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error recording A/B test result:", error);
      return res.status(500).json({ error: "Failed to record A/B test result" });
    }
  });
  
  // Get active A/B test for a concept
  app.get("/api/concepts/:conceptId/abtest", async (req, res) => {
    try {
      const conceptId = req.params.conceptId;
      
      // Find active A/B test for the concept
      const activeTest = await db.query.abTests.findFirst({
        where: and(
          eq(abTests.conceptId, conceptId),
          eq(abTests.isActive, true)
        ),
      });
      
      if (!activeTest) {
        return res.status(404).json({ error: "No active A/B test found for this concept" });
      }
      
      // Get variants for the test
      const variants = await db.query.abTestVariants.findMany({
        where: eq(abTestVariants.testId, activeTest.testId),
      });
      
      return res.json({
        ...activeTest,
        variants
      });
    } catch (error) {
      console.error("Error fetching active A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch active A/B test" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
