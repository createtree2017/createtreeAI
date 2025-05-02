import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, eq, desc, and } from "@shared/schema";
import fs from "fs";
import path from "path";

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
  async transformImage(filePath: string, style: string, customPromptTemplate?: string | null, systemPrompt?: string | null) {
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
      
      let prompt = "";
      // 개선된 prompt 처리 로직
      if (customPromptTemplate && customPromptTemplate.trim() !== "") {
        // 템플릿 변수 처리 (빈 문자열이 아닌 경우에만)
        prompt = processTemplate(customPromptTemplate);
        console.log(`처리된 프롬프트: "${prompt}"`);
      } else if (systemPrompt && systemPrompt.trim() !== "") {
        // 시스템 프롬프트만 있는 경우
        prompt = "Transform the uploaded image using the following instruction: " + systemPrompt;
        console.log(`시스템 프롬프트만 있어 변환 지침으로 사용: "${prompt.substring(0, 100)}..."`);
      } else {
        // 프롬프트와 시스템 프롬프트 모두 없는 경우에는 중단
        console.log(`프롬프트 템플릿과 시스템 프롬프트 모두 비어 있음. 이미지 변환 처리를 중단합니다.`);
        return "https://placehold.co/1024x1024/A7C1E2/FFF?text=비어있는+프롬프트로+이미지를+생성할+수+없습니다";
      }
      
      try {
        // OpenAI GPT-Image-1 호출 (GPT-4o Vision 이미지 분석 포함)
        console.log(`[Storage] Calling OpenAI GPT-Image-1 image transformation service...`);
        if (systemPrompt) {
          console.log(`[Storage] Using system prompt for GPT-4o image analysis: ${systemPrompt.substring(0, 50)}...`);
        }
        const { transformImage } = await import('./services/openai-dalle3'); // 파일명은 호환성 유지
        const transformedImageUrl = await transformImage(
          imageBuffer, 
          style, 
          prompt,
          systemPrompt // 시스템 프롬프트 전달 (GPT-4o Vision의 이미지 분석 지침)
        );
        
        if (!transformedImageUrl.includes("placehold.co")) {
          console.log(`[Storage] OpenAI GPT-Image-1 transformation succeeded, URL: ${transformedImageUrl.substring(0, 30)}...`);
          return transformedImageUrl;
        } else {
          // 오류 시 서비스 종료 메시지 반환
          console.log(`[Storage] OpenAI GPT-Image-1 service unavailable`);
          return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
        }
      } catch (error) {
        console.error(`[Storage] OpenAI GPT-Image-1 error:`, error);
        return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
      }
    } catch (error) {
      console.error(`[Storage] Error in transformImage:`, error);
      // Return service unavailable message in case of error
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
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
