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
