import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, eq, desc, and } from "@shared/schema";
import fs from "fs";
import path from "path";
import { transformImageWithOpenAI } from "./services/openai";

export const storage = {
  // Music related functions
  async saveMusicGeneration(
    babyName: string,
    style: string,
    url: string,
    duration: number
  ) {
    const title = `${babyName}'s ${style.charAt(0).toUpperCase() + style.slice(1)}`;
    
    const [savedMusic] = await db
      .insert(music)
      .values({
        title,
        babyName,
        style,
        url,
        duration,
      })
      .returning();
    
    return savedMusic;
  },
  
  async getMusicList() {
    return db.query.music.findMany({
      orderBy: [desc(music.createdAt)],
    });
  },
  
  // Image related functions
  async transformImage(filePath: string, style: string) {
    // Read the file
    const imageBuffer = fs.readFileSync(filePath);
    
    // Transform the image using OpenAI
    const transformedImageUrl = await transformImageWithOpenAI(imageBuffer, style);
    
    return transformedImageUrl;
  },
  
  async saveImageTransformation(
    originalFilename: string,
    style: string,
    originalPath: string,
    transformedUrl: string
  ) {
    // Extract name without extension
    const nameWithoutExt = path.basename(
      originalFilename,
      path.extname(originalFilename)
    );
    
    // Create a title
    const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
    
    const [savedImage] = await db
      .insert(images)
      .values({
        title,
        style,
        originalUrl: originalPath,
        transformedUrl,
      })
      .returning();
    
    return savedImage;
  },
  
  async getImageList() {
    return db.query.images.findMany({
      orderBy: [desc(images.createdAt)],
    });
  },
  
  // Chat related functions
  async saveUserMessage(content: string) {
    const [message] = await db
      .insert(chatMessages)
      .values({
        role: "user",
        content,
      })
      .returning();
    
    return message;
  },
  
  async saveAssistantMessage(content: string) {
    const [message] = await db
      .insert(chatMessages)
      .values({
        role: "assistant",
        content,
      })
      .returning();
    
    return message;
  },
  
  async getChatHistory() {
    return db.query.chatMessages.findMany({
      orderBy: [music.createdAt],
      limit: 50, // Limit the number of messages to avoid performance issues
    });
  },
  
  // Gallery and Favorites related functions
  async getAllItems() {
    // Get all music items with favorite status
    const musicItems = await db.query.music.findMany({
      orderBy: [desc(music.createdAt)],
      with: {
        favorite: true,
      },
    });
    
    // Transform music items
    const transformedMusic = musicItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: "music" as const,
      url: item.url,
      duration: item.duration,
      createdAt: item.createdAt.toISOString(),
      isFavorite: !!item.favorite,
    }));
    
    // Get all image items with favorite status
    const imageItems = await db.query.images.findMany({
      orderBy: [desc(images.createdAt)],
      with: {
        favorite: true,
      },
    });
    
    // Transform image items
    const transformedImages = imageItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: "image" as const,
      url: item.transformedUrl,
      thumbnailUrl: item.transformedUrl,
      createdAt: item.createdAt.toISOString(),
      isFavorite: !!item.favorite,
    }));
    
    // Combine and sort by creation date
    return [...transformedMusic, ...transformedImages].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },
  
  async getRecentItems() {
    // Get the most recent items (both music and images)
    const allItems = await this.getAllItems();
    return allItems.slice(0, 5); // Return only the 5 most recent items
  },
  
  async getFavoriteItems() {
    // Get all favorite items
    const musicFavorites = await db.query.favorites.findMany({
      where: eq(favorites.itemType, "music"),
      with: {
        music: true,
      },
    });
    
    const imageFavorites = await db.query.favorites.findMany({
      where: eq(favorites.itemType, "image"),
      with: {
        image: true,
      },
    });
    
    // Transform favorites to the common format
    const transformedMusicFavorites = musicFavorites
      .filter((fav) => fav.music) // Filter out any null relations
      .map((fav) => ({
        id: fav.music!.id,
        title: fav.music!.title,
        type: "music" as const,
        url: fav.music!.url,
        duration: fav.music!.duration,
        createdAt: fav.music!.createdAt.toISOString(),
        isFavorite: true,
      }));
    
    const transformedImageFavorites = imageFavorites
      .filter((fav) => fav.image) // Filter out any null relations
      .map((fav) => ({
        id: fav.image!.id,
        title: fav.image!.title,
        type: "image" as const,
        url: fav.image!.transformedUrl,
        thumbnailUrl: fav.image!.transformedUrl,
        createdAt: fav.image!.createdAt.toISOString(),
        isFavorite: true,
      }));
    
    // Combine and sort by creation date
    return [...transformedMusicFavorites, ...transformedImageFavorites].sort(
      (a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    );
  },
  
  async toggleFavorite(itemId: number, itemType: "music" | "image") {
    // Check if the item is already a favorite
    const existingFavorite = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.itemId, itemId),
        eq(favorites.itemType, itemType)
      ),
    });
    
    if (existingFavorite) {
      // If it exists, remove it
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.itemId, itemId),
            eq(favorites.itemType, itemType)
          )
        );
      
      return { id: itemId, type: itemType, isFavorite: false };
    } else {
      // If it doesn't exist, add it
      const [newFavorite] = await db
        .insert(favorites)
        .values({
          itemId,
          itemType,
        })
        .returning();
      
      return { id: itemId, type: itemType, isFavorite: true };
    }
  },
  
  // Media management functions
  async getMediaItem(id: number, type: "music" | "image") {
    if (type === "music") {
      return db.query.music.findFirst({
        where: eq(music.id, id),
      });
    } else {
      return db.query.images.findFirst({
        where: eq(images.id, id),
      });
    }
  },
  
  async createShareLink(id: number, type: "music" | "image") {
    // In a real app, you might generate a secure token, save it to the database,
    // and create a shareable link. For this example, we'll just create a simple URL.
    const baseUrl = process.env.BASE_URL || "https://mommelody.app";
    return `${baseUrl}/share/${type}/${id}`;
  },
  
  // Saved chat functions
  async saveChat(chatData: {
    title: string;
    personaId: string;
    personaName: string;
    personaEmoji: string;
    messages: any[];
    summary: string;
    userMemo?: string;
    mood?: string;
  }) {
    const [savedChat] = await db
      .insert(savedChats)
      .values(chatData)
      .returning();
      
    return savedChat;
  },
  
  async getSavedChats() {
    return db.query.savedChats.findMany({
      orderBy: [desc(savedChats.createdAt)],
    });
  },
  
  async getSavedChat(id: number) {
    return db.query.savedChats.findFirst({
      where: eq(savedChats.id, id),
    });
  },
  
  async deleteSavedChat(id: number) {
    await db
      .delete(savedChats)
      .where(eq(savedChats.id, id));
      
    return { success: true };
  },
};
