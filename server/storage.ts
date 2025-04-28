import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, eq, desc, and } from "@shared/schema";
import fs from "fs";
import path from "path";
import { transformImageWithOpenAI } from "./services/openai";
import { transformImageWithStability } from "./services/stability";

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
  async transformImage(filePath: string, style: string, customPromptTemplate?: string | null) {
    try {
      console.log(`[Storage] Starting image transformation with style: "${style}"`);
      if (customPromptTemplate) {
        console.log(`[Storage] Using custom prompt template: "${customPromptTemplate.substring(0, 100)}..."`);
      } else {
        console.log(`[Storage] No custom prompt template provided, using default`);
      }
      
      // Read the file
      console.log(`[Storage] Reading file from path: ${filePath}`);
      const imageBuffer = fs.readFileSync(filePath);
      console.log(`[Storage] Successfully read image file, size: ${imageBuffer.length} bytes`);
      
      // Convert image buffer to base64 for Stability AI
      const base64Image = imageBuffer.toString('base64');
      
      try {
        // Try Stability AI first (new primary provider)
        console.log(`[Storage] Calling Stability AI image transformation service...`);
        let prompt = "";
        
        // 템플릿 변수를 처리하는 함수
        const processTemplate = (template: string) => {
          // 기본 변수 값 설정 (실제 구현에서는 이미지 분석 또는 사용자 입력을 통해 이 값들을 얻을 수 있음)
          const variables: Record<string, string> = {
            object: "pet dog",  // 기본값 설정
            style: style,
            mood: "happy",
            color: "vibrant",
            theme: "cute",
            setting: "home"
          };
          
          // 템플릿에서 {{variable}} 패턴을 찾아 실제 값으로 대체
          return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
            return variables[variableName] || match; // 변수가 없으면 원래 문자열 유지
          });
        };
        
        if (customPromptTemplate) {
          // 템플릿 변수 처리
          prompt = processTemplate(customPromptTemplate);
          console.log(`처리된 프롬프트: "${prompt}"`);
        } else {
          // Default prompt for the given style if no custom template provided
          prompt = `Transform this image into ${style} art style. Preserve the main subject and composition. Make it beautiful and professional.`;
        }
        
        const transformedImageUrl = await transformImageWithStability(
          base64Image,
          prompt,
          style
        );
        
        if (transformedImageUrl.includes("placehold.co") || transformedImageUrl.includes("Transformed+Image")) {
          console.log(`[Storage] Warning: Stability AI returned placeholder image, trying OpenAI as fallback...`);
          
          // Fallback to OpenAI if Stability fails
          const openaiResult = await transformImageWithOpenAI(imageBuffer, style, customPromptTemplate);
          
          if (openaiResult.includes("placehold.co") || openaiResult.includes("Transformed+Image")) {
            console.log(`[Storage] Warning: Both providers failed, returning placeholder image`);
          } else {
            console.log(`[Storage] OpenAI fallback succeeded, URL returned: ${openaiResult.substring(0, 30)}...`);
            return openaiResult;
          }
        } else {
          console.log(`[Storage] Stability AI transformation succeeded, URL: ${transformedImageUrl.substring(0, 30)}...`);
          return transformedImageUrl;
        }
      } catch (stabilityError) {
        console.error(`[Storage] Stability AI error:`, stabilityError);
        
        // Fallback to OpenAI
        console.log(`[Storage] Falling back to OpenAI due to Stability AI error`);
        const transformedImageUrl = await transformImageWithOpenAI(imageBuffer, style, customPromptTemplate);
        
        if (transformedImageUrl.includes("placehold.co") || transformedImageUrl.includes("Transformed+Image")) {
          console.log(`[Storage] Warning: OpenAI also returned placeholder image`);
        } else {
          console.log(`[Storage] OpenAI transformation succeeded, URL: ${transformedImageUrl.substring(0, 30)}...`);
        }
        
        return transformedImageUrl;
      }
      
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformation+Error";
    } catch (error) {
      console.error(`[Storage] Error in transformImage:`, error);
      // Return a placeholder image URL in case of error
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformation+Error";
    }
  },
  
  async saveImageTransformation(
    originalFilename: string,
    style: string,
    originalPath: string,
    transformedUrl: string,
    variantId?: string | null
  ) {
    // Extract name without extension
    const nameWithoutExt = path.basename(
      originalFilename,
      path.extname(originalFilename)
    );
    
    // Create a title
    const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
    
    // Include the variant ID if it exists (for A/B testing)
    const metadata = variantId ? { variantId } : {};
    
    const [savedImage] = await db
      .insert(images)
      .values({
        title,
        style,
        originalUrl: originalPath,
        transformedUrl,
        metadata: JSON.stringify(metadata),
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
