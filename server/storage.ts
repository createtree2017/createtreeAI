import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, eq, desc, and } from "@shared/schema";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// 임시 이미지 저장을 위한 경로
const TEMP_IMAGE_DIR = path.join(process.cwd(), 'uploads', 'temp');

// 임시 이미지를 파일로 저장하고 URL 경로를 반환하는 함수
async function saveTemporaryImage(imageUrl: string, title: string): Promise<string> {
  try {
    // 임시 디렉토리가 없으면 생성
    if (!fs.existsSync(TEMP_IMAGE_DIR)) {
      fs.mkdirSync(TEMP_IMAGE_DIR, { recursive: true });
    }
    
    // 파일 이름 생성 (타임스탬프 추가)
    const timestamp = Date.now();
    const filename = `temp_${timestamp}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
    const filepath = path.join(TEMP_IMAGE_DIR, filename);
    
    // 이미지가 base64 인코딩된 경우
    if (imageUrl.startsWith('data:image')) {
      const base64Data = imageUrl.split(',')[1];
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
      console.log(`임시 이미지가 로컬에 저장되었습니다: ${filepath}`);
      return filepath;
    } 
    // 일반 URL인 경우
    else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
      console.log(`임시 이미지가 로컬에 저장되었습니다: ${filepath}`);
      return filepath;
    }
  } catch (error) {
    console.error('임시 이미지 저장 중 오류:', error);
    throw error;
  }
}

export const storage = {
  // 임시 이미지 관련 함수들
  async saveTemporaryImage(imageUrl: string, title: string) {
    const localPath = await saveTemporaryImage(imageUrl, title);
    return { localPath, filename: path.basename(localPath) };
  },
  
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
          console.log(`[Storage] OpenAI GPT-Image-1 transformation succeeded [이미지 데이터 로그 생략]`);
          return transformedImageUrl;
        } else if (transformedImageUrl.includes("safety_system")) {
          // 안전 시스템 필터에 걸린 경우
          console.log(`[Storage] Image transformation rejected by safety system`);
          return "https://placehold.co/1024x1024/A7C1E2/FFF?text=안전+시스템에+의해+이미지+변환이+거부되었습니다.+다른+스타일이나+이미지를+시도해보세요";
        } else {
          // 기타 오류 시 서비스 종료 메시지 반환
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
