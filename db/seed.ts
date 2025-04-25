import { db } from "./index";
import * as schema from "@shared/schema";
import { format } from "date-fns";

async function seed() {
  try {
    // Clear previous data for fresh seed
    console.log("Clearing previous data...");
    await db.delete(schema.favorites);
    await db.delete(schema.chatMessages);
    await db.delete(schema.images);
    await db.delete(schema.music);
    // We don't delete personas and categories since we want to preserve user data

    // Seed persona categories
    console.log("Seeding persona categories...");
    const defaultCategories = [
      {
        categoryId: "all",
        name: "All Characters",
        description: "Browse all available companion characters",
        emoji: "✨",
        order: 0,
        isActive: true
      },
      {
        categoryId: "popular",
        name: "Popular",
        description: "Most-loved companion characters",
        emoji: "🌟",
        order: 1,
        isActive: true
      },
      {
        categoryId: "pregnancy",
        name: "Pregnancy",
        description: "Companions focused on prenatal support",
        emoji: "🤰",
        order: 2,
        isActive: true
      },
      {
        categoryId: "postpartum",
        name: "Postpartum",
        description: "Support for the fourth trimester",
        emoji: "👶",
        order: 3,
        isActive: true
      },
      {
        categoryId: "cultural",
        name: "Cultural",
        description: "Characters with cultural perspectives",
        emoji: "🌏",
        order: 4,
        isActive: true
      },
      {
        categoryId: "seasonal",
        name: "Seasonal",
        description: "Special themed characters",
        emoji: "🍁",
        order: 5,
        isActive: true
      }
    ];
    
    for (const category of defaultCategories) {
      // Check if category already exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: schema.eq(schema.personaCategories.categoryId, category.categoryId)
      });
      
      if (!existingCategory) {
        // Create new category
        await db.insert(schema.personaCategories).values({
          categoryId: category.categoryId,
          name: category.name,
          description: category.description,
          emoji: category.emoji,
          order: category.order,
          isActive: category.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }
    
    // Seed default personas
    console.log("Seeding default personas...");
    const defaultPersonas = [
      {
        personaId: "maternal-guide",
        name: "Maternal Guide",
        avatarEmoji: "👩‍⚕️",
        description: "A caring and knowledgeable maternal health specialist who provides evidence-based advice.",
        welcomeMessage: "안녕하세요! I'm your maternal companion. Share your feelings, ask questions, or simply chat. I'm here to provide emotional support during your motherhood journey. Your conversation is private and won't be permanently saved.",
        systemPrompt: "You are MomMelody's Maternal Guide, a supportive AI companion for pregnant women and young mothers. Your role is to provide empathetic, informative, and encouraging responses to help mothers through their journey. Always be warm, patient, and positive in your tone. Provide practical advice when asked, but remember you're not a replacement for medical professionals. Keep responses concise (under 150 words) and appropriate for a mobile interface.",
        primaryColor: "#7c3aed",
        secondaryColor: "#ddd6fe",
        personality: "Warm, caring, balanced",
        tone: "Supportive and informative",
        usageContext: "For mothers needing general guidance",
        emotionalKeywords: ["uncertain", "curious", "confused"],
        timeOfDay: "all",
        isActive: true,
        isFeatured: true,
        order: 0,
        categories: ["popular", "pregnancy", "postpartum"]
      },
      {
        personaId: "postpartum-angel",
        name: "Postpartum Angel",
        avatarEmoji: "👼",
        description: "A soft and nurturing persona for emotional recovery after birth",
        welcomeMessage: "Hello beautiful mama. I'm here to hold space for you during this tender time of healing. There's no right way to feel right now - I'm here to support you exactly as you are.",
        systemPrompt: "You are a gentle, nurturing support companion for mothers in the postpartum period. Your primary focus is emotional wellbeing and reassurance. You validate feelings, normalize postpartum challenges, and offer gentle encouragement. You are especially attuned to signs of postpartum depression and anxiety, and you encourage self-compassion and reaching out for help. You speak in a soft, warm voice with short, simple sentences - never overwhelming. You recognize the mother's strength while acknowledging that rest and healing are equally important forms of strength. You never give medical advice but do encourage speaking with healthcare providers about concerns.",
        primaryColor: "#f9a8d4",
        secondaryColor: "#fdf2f8",
        personality: "Warm, empathetic, gentle",
        tone: "Reassuring and calm",
        usageContext: "For moms struggling emotionally after birth",
        emotionalKeywords: ["anxious", "overwhelmed", "tired"],
        timeOfDay: "night",
        isActive: true,
        isFeatured: true,
        order: 1,
        categories: ["popular", "postpartum"]
      },
      {
        personaId: "taemyeong-companion",
        name: "태명 Companion",
        avatarEmoji: "🌱",
        description: "A Korean-focused companion who discusses taemyeong and cultural traditions for expecting mothers.",
        welcomeMessage: "안녕하세요! I'm your 태명 (Taemyeong) Companion. I can help you choose a beautiful prenatal nickname for your baby and discuss Korean pregnancy traditions. How can I assist you today?",
        systemPrompt: "You are MomMelody's 태명 (Taemyeong) Companion, an AI specializing in Korean pregnancy traditions, especially taemyeong (prenatal nicknames). You're knowledgeable about Korean culture, traditional pregnancy practices, and naming customs. You help mothers choose meaningful taemyeong based on their hopes, dreams, or baby's characteristics. You incorporate Korean words naturally and explain traditions like 태교 (prenatal education). Your tone is culturally respectful and warm. Include both Korean characters and romanization when using Korean terms. Keep responses concise (under 150 words) while being informative about Korean maternal traditions.",
        primaryColor: "#10b981",
        secondaryColor: "#d1fae5",
        personality: "Culturally informed, thoughtful",
        tone: "Respectful and warm",
        usageContext: "For mothers interested in Korean traditions",
        emotionalKeywords: ["curious", "multicultural", "tradition"],
        timeOfDay: "all",
        isActive: true,
        isFeatured: false,
        order: 2,
        categories: ["cultural", "pregnancy"]
      }
    ];
    
    for (const persona of defaultPersonas) {
      // Check if persona already exists
      const existingPersona = await db.query.personas.findFirst({
        where: schema.eq(schema.personas.personaId, persona.personaId)
      });
      
      if (!existingPersona) {
        // Create new persona
        await db.insert(schema.personas).values({
          personaId: persona.personaId,
          name: persona.name,
          avatarEmoji: persona.avatarEmoji,
          description: persona.description,
          welcomeMessage: persona.welcomeMessage,
          systemPrompt: persona.systemPrompt,
          primaryColor: persona.primaryColor,
          secondaryColor: persona.secondaryColor,
          personality: persona.personality,
          tone: persona.tone,
          usageContext: persona.usageContext,
          emotionalKeywords: persona.emotionalKeywords,
          timeOfDay: persona.timeOfDay,
          isActive: persona.isActive,
          isFeatured: persona.isFeatured,
          order: persona.order,
          useCount: 0,
          categories: persona.categories,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created persona: ${persona.name}`);
      } else {
        console.log(`Persona already exists: ${persona.name}`);
      }
    }

    console.log("Seeding music data...");
    // Seed music data
    const musicData = [
      {
        title: "Minjun's Lullaby",
        babyName: "Minjun",
        style: "lullaby",
        url: "/uploads/audio/minjun-lullaby-sample.mp3",
        duration: 63, // 1:03
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        title: "My Little Star",
        babyName: "Little Star",
        style: "playful",
        url: "/uploads/audio/little-star-playful-sample.mp3",
        duration: 135, // 2:15
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    ];

    const insertedMusic = await db.insert(schema.music).values(musicData).returning();
    console.log(`Inserted ${insertedMusic.length} music items`);

    console.log("Seeding image data...");
    // Seed image data
    const imageData = [
      {
        title: "Watercolor Memory",
        style: "watercolor",
        originalUrl: "/uploads/images/original-family-photo1.jpg",
        transformedUrl: "https://images.unsplash.com/photo-1586075235068-40a30ab642c8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        title: "Family Sketch",
        style: "sketch",
        originalUrl: "/uploads/images/original-family-photo2.jpg",
        transformedUrl: "https://images.unsplash.com/photo-1579783901674-66f7f0cc0c27?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
    ];

    const insertedImages = await db.insert(schema.images).values(imageData).returning();
    console.log(`Inserted ${insertedImages.length} image items`);

    console.log("Seeding chat messages...");
    // Seed chat messages
    const chatData = [
      {
        role: "assistant",
        content: "Hello there! How are you feeling today? I'm here to support you through your journey.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        role: "user",
        content: "I'm feeling a bit tired today. My baby was up a lot last night.",
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
      },
      {
        role: "assistant",
        content: "I understand how exhausting that can be. Sleep deprivation is one of the hardest parts of early parenthood. Would you like some gentle tips for managing your energy today, or would you prefer we talk about strategies to help your baby sleep better tonight?",
        createdAt: new Date(Date.now() - 1.4 * 60 * 60 * 1000), // 1.4 hours ago
      },
    ];

    const insertedChat = await db.insert(schema.chatMessages).values(chatData).returning();
    console.log(`Inserted ${insertedChat.length} chat messages`);

    console.log("Seeding favorites...");
    // Seed favorites
    const favoriteData = [
      {
        itemId: insertedImages[0].id,
        itemType: "image",
        createdAt: new Date(),
      },
    ];

    const insertedFavorites = await db.insert(schema.favorites).values(favoriteData).returning();
    console.log(`Inserted ${insertedFavorites.length} favorites`);

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
