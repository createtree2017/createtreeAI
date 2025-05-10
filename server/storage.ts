import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, concepts, conceptCategories, eq, desc, and } from "@shared/schema";
import { count, like } from "drizzle-orm";
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
      // URL이 http로 시작하지 않으면 추가
      const url = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'image/*,*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
        console.log(`임시 이미지가 로컬에 저장되었습니다: ${filepath} (크기: ${Buffer.from(arrayBuffer).length} 바이트)`);
        return filepath;
      } catch (fetchError) {
        console.error(`이미지 다운로드 중 오류 발생 (${url}):`, fetchError);
        
        // 다운로드 실패 시 빈 파일이라도 생성 (나중에 처리)
        fs.writeFileSync(filepath, Buffer.from(''));
        console.warn(`빈 임시 파일 생성됨: ${filepath} - 이후 다운로드 재시도 필요`);
        return filepath;
      }
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
  async transformImage(filePath: string, style: string, customPromptTemplate?: string | null, systemPrompt?: string | null, aspectRatio?: string | null) {
    try {
      console.log(`[Storage] Starting image transformation with style: "${style}"`);
      
      // 캐시를 사용하지 않고 매번 최신 데이터를 조회하도록 수정
      console.log(`[Storage] 콘셉트 데이터 실시간 조회: ${style}`);
      
      // 스타일 ID로 Concept 데이터 조회
      const concept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, style)
      });
      
      // 디버깅을 위해 조회된 콘셉트 정보 확인
      if (concept) {
        console.log(`[Storage] 콘셉트 조회 결과: ID: ${concept.id}, conceptId: ${concept.conceptId}`);
      } else {
        console.log(`[Storage] 콘셉트 조회 결과 없음: ${style}`);
      }
      
      if (customPromptTemplate) {
        console.log(`[Storage] Using custom prompt template: "${customPromptTemplate.substring(0, 100)}..."`);
      } else {
        console.log(`[Storage] Using ${concept ? 'concept' : 'default'} template`);
      }
      
      if (aspectRatio) {
        console.log(`[Storage] Using custom aspect ratio: ${aspectRatio}`);
      } else {
        console.log(`[Storage] Using default aspect ratio: 1:1`);
      }
      
      // Read the file
      console.log(`[Storage] Reading file from path: ${filePath}`);
      
      // 템플릿 변수를 처리하는 함수
      const processTemplate = (template: string) => {
        // 기본 변수 값 설정 (실제 구현에서는 이미지 분석 또는 사용자 입력을 통해 이 값들을 얻을 수 있음)
        const variables: Record<string, string> = {
          object: "pregnant woman",  // 기본값을 임산부로 변경
          style: style,
          mood: "happy",
          color: "vibrant",
          theme: "maternity",
          setting: "portrait"
        };
        
        // 템플릿에서 {{variable}} 패턴을 찾아 실제 값으로 대체
        return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
          return variables[variableName] || match; // 변수가 없으면 원래 문자열 유지
        });
      };
      
      let prompt = "";
      // 프롬프트 준비
      if (customPromptTemplate && customPromptTemplate.trim() !== "") {
        // 템플릿 변수 처리 (빈 문자열이 아닌 경우에만)
        prompt = processTemplate(customPromptTemplate);
        console.log(`처리된 커스텀 프롬프트: "${prompt}"`);
      } else if (systemPrompt && systemPrompt.trim() !== "") {
        // 시스템 프롬프트만 있는 경우
        prompt = "Transform the uploaded image using the following instruction: " + systemPrompt;
        console.log(`시스템 프롬프트 사용: "${prompt.substring(0, 100)}..."`);
      } else if (concept && concept.promptTemplate) {
        // 컨셉의 프롬프트 템플릿 사용
        prompt = processTemplate(concept.promptTemplate);
        console.log(`컨셉 프롬프트 사용: "${prompt.substring(0, 100)}..."`);
      } else {
        // 기본 프롬프트
        prompt = `A beautiful pregnant woman portrait in ${style} style, maintaining facial features, high quality`;
        console.log(`기본 프롬프트 사용: "${prompt}"`);
      }
      
      try {
        // OpenAI 이미지 생성 API 사용
        console.log(`[Storage] OpenAI GPT-Image-1 모델 사용하여 이미지 생성...`);
        const imageBuffer = fs.readFileSync(filePath);
        const { transformImage } = await import('./services/openai-dalle3'); 
        const transformedImageUrl = await transformImage(
          imageBuffer, 
          style, 
          prompt,
          systemPrompt 
        );
        
        if (!transformedImageUrl.includes("placehold.co")) {
          console.log(`[Storage] OpenAI 이미지 생성 성공 [이미지 데이터 로그 생략]`);
          return transformedImageUrl;
        } else {
          console.log(`[Storage] OpenAI 이미지 생성 실패: ${transformedImageUrl}`);
          return transformedImageUrl;
        }
      } catch (error) {
        console.error(`[Storage] 이미지 변환 과정에서 오류 발생:`, error);
        return "https://placehold.co/1024x1024/A7C1E2/FFF?text=이미지+변환+서비스가+응답하지+않습니다.+다시+시도해+주세요";
      }
    } catch (error) {
      console.error(`[Storage] Error in transformImage:`, error);
      // Return service unavailable message in case of error
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=이미지+변환+서비스가+응답하지+않습니다.+다시+시도해+주세요";
    }
  },
  
  async saveImageTransformation(
    originalFilename: string,
    style: string,
    originalPath: string,
    transformedUrl: string,
    userId?: number | null,
    username?: string | null,
    variantId?: string | null,
    aspectRatio?: string | null
  ) {
    // Extract name without extension
    const nameWithoutExt = path.basename(
      originalFilename,
      path.extname(originalFilename)
    );
    
    // Create a title
    const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
    
    // Include the variant ID and aspectRatio if they exist
    const metadata: Record<string, any> = {};
    if (variantId) metadata.variantId = variantId;
    if (aspectRatio) metadata.aspectRatio = aspectRatio;
    
    try {
      console.log(`[Storage] 새 이미지 저장 시작: "${title}", 스타일: ${style}, 사용자: ${username || '없음'}, 사용자ID: ${userId || '없음'}`);
      
      const [savedImage] = await db
        .insert(images)
        .values({
          title,
          style,
          originalUrl: originalPath,
          transformedUrl,
          metadata: JSON.stringify(metadata),
          // userId 필드 제거: user_id 컬럼이 데이터베이스에 없음
          username: username || undefined,
          originalFilename,
        })
        .returning();
      
      console.log(`[Storage] 이미지 저장 완료: ID ${savedImage.id}, 타이틀: "${savedImage.title}", 사용자: ${username || '없음'}`);
      return savedImage;
    } catch (error) {
      console.error(`[Storage] 이미지 저장 중 오류 발생:`, error);
      throw error;
    }
  },
  
  // 수정된 getImageList 함수 (전체 이미지 목록 불러오기)
  async getImageList() {
    try {
      console.log(`[Storage] getImageList 호출됨: ${new Date().toISOString()}`);
      
      // 명시적으로 필요한 필드만 선택하여 userId 참조 제거 (스키마 업데이트 전까지)
      const results = await db.select({
        id: images.id,
        title: images.title,
        style: images.style,
        originalUrl: images.originalUrl,
        transformedUrl: images.transformedUrl,
        createdAt: images.createdAt,
        metadata: images.metadata
      })
      .from(images)
      .orderBy(desc(images.createdAt));
      
      // 결과 데이터 검증 및 로깅
      console.log(`[Storage] 이미지 조회 결과: ${results ? results.length : 0}개 이미지 찾음`);
      
      // 최신 생성 이미지 로그 출력 (디버깅용)
      if (results && results.length > 0) {
        console.log(`[Storage] 최신 이미지 ${results.length}개 조회됨, 가장 최근 ID: ${results[0].id}, 생성일: ${results[0].createdAt}`);
        
        // 이미지 URL 유효성 검사
        const sampleImages = results.slice(0, 3);
        sampleImages.forEach(img => {
          console.log(`[Storage] 이미지 샘플 - ID: ${img.id}, 제목: "${img.title}", 변환 URL: ${img.transformedUrl ? '있음' : '없음'}`);
        });
      } else {
        console.log('[Storage] 저장된 이미지가 없습니다.');
      }
      
      return results || [];
    } catch (error) {
      console.error("[Storage] 이미지 목록 조회 중 오류 발생:", error);
      return [];
    }
  },
  
  // 데이터베이스 수준에서 페이지네이션을 적용한 이미지 목록 조회
  async getPaginatedImageList(page: number = 1, limit: number = 10, userId?: number | null) {
    try {
      console.log(`[Storage] getPaginatedImageList 호출됨: page=${page}, limit=${limit}, userId=${userId || '없음'}, ${new Date().toISOString()}`);
      
      // 현재 사용자의 이미지만 필터링할 조건 설정 (임시 비활성화: user_id 컬럼이 데이터베이스에 없음)
      let whereCondition = undefined;
      if (userId) {
        console.log(`[Storage] 사용자 ID ${userId}로 이미지 필터링 적용 - 필터링 비활성화됨`);
        // whereCondition = eq(images.userId, userId); 
      }
      
      // 사용자 필터링이 적용된 이미지 카운트를 위한 쿼리
      const countQuery = db.select({ count: count() }).from(images);
      if (whereCondition) {
        countQuery.where(whereCondition);
      }
      const countResult = await countQuery;
      const total = countResult[0].count;
      
      console.log(`[Storage] 해당 조건의 이미지 총 개수: ${total}`);
      
      // 기본 쿼리 구성
      let query = db.select({
        id: images.id,
        title: images.title,
        style: images.style,
        originalUrl: images.originalUrl,
        transformedUrl: images.transformedUrl,
        createdAt: images.createdAt,
        metadata: images.metadata,
        username: images.username
        // userId 필드 제거: user_id 컬럼이 데이터베이스에 없음
      })
      .from(images);
      
      // 사용자 ID 필터링 적용
      if (whereCondition) {
        query = query.where(whereCondition);
      }
      
      // 정렬 및 페이지네이션 적용
      const results = await query
        .orderBy(desc(images.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
      
      console.log(`[Storage] 페이지네이션 이미지 조회 결과: ${results.length}개 (page=${page}, limit=${limit}, userId=${userId || '없음'})`);
      
      return {
        images: results || [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("[Storage] 페이지네이션 이미지 목록 조회 중 오류 발생:", error);
      return {
        images: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }
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
    try {
      let transformedMusic: any[] = [];
      let transformedImages: any[] = [];
      
      // Get all music items with favorite status (임시 해결책: userId 필드 제외)
      try {
        const musicItems = await db.select({
          id: music.id,
          title: music.title,
          url: music.url,
          duration: music.duration,
          createdAt: music.createdAt
        })
        .from(music)
        .orderBy(desc(music.createdAt));
        
        // Transform music items
        transformedMusic = musicItems.map((item) => ({
          id: item.id,
          title: item.title,
          type: "music" as const,
          url: item.url,
          duration: item.duration,
          createdAt: item.createdAt.toISOString(),
          isFavorite: false, // 임시로 즐겨찾기 false로 설정
        }));
      } catch (musicError) {
        console.error("[Storage] 음악 아이템 조회 중 오류:", musicError);
      }
      
      // Get all image items (임시 해결책: userId 필드 제외)
      try {
        const imageItems = await db.select({
          id: images.id,
          title: images.title,
          style: images.style,
          transformedUrl: images.transformedUrl,
          createdAt: images.createdAt
        })
        .from(images)
        .orderBy(desc(images.createdAt));
        
        // Transform image items
        transformedImages = imageItems.map((item) => ({
          id: item.id,
          title: item.title,
          type: "image" as const,
          url: item.transformedUrl,
          thumbnailUrl: item.transformedUrl,
          createdAt: item.createdAt.toISOString(),
          isFavorite: false, // 임시로 즐겨찾기 false로 설정
        }));
      } catch (imageError) {
        console.error("[Storage] 이미지 아이템 조회 중 오류:", imageError);
      }
      
      // Combine and sort by creation date
      return [...transformedMusic, ...transformedImages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      console.error("[Storage] getAllItems 조회 중 오류 발생:", error);
      return []; // 오류 발생 시 빈 배열 반환
    }
  },
  
  async getRecentItems() {
    // Get the most recent items (both music and images)
    const allItems = await this.getAllItems();
    return allItems.slice(0, 5); // Return only the 5 most recent items
  },
  
  async getFavoriteItems(username?: string) {
    try {
      // 수정: username 파라미터로 사용자별 필터링 기능 추가
      
      // 음악 즐겨찾기 가져오기
      let transformedMusicFavorites: any[] = [];
      try {
        // 직접 조인 쿼리로 필요한 필드만 명시적으로 선택
        const musicFavs = await db.select({
          id: favorites.id,
          itemId: favorites.itemId,
          // 명시적으로 music 테이블에서 필요한 필드만 선택
          music_id: music.id,
          music_title: music.title,
          music_url: music.url,
          music_duration: music.duration,
          music_createdAt: music.createdAt
        })
        .from(favorites)
        .innerJoin(music, eq(favorites.itemId, music.id))
        .where(eq(favorites.itemType, "music"))
        .orderBy(desc(music.createdAt))
        .limit(10);
        
        // 음악 항목 변환
        transformedMusicFavorites = musicFavs.map(item => ({
          id: item.music_id,
          title: item.music_title,
          type: "music" as const,
          url: item.music_url,
          duration: item.music_duration,
          createdAt: item.music_createdAt.toISOString(),
          isFavorite: true
        }));
      } catch (musicError) {
        console.error("음악 즐겨찾기 조회 오류:", musicError);
      }
      
      // 이미지 즐겨찾기 가져오기 (사용자별)
      let transformedImageFavorites: any[] = [];
      try {
        // 가장 단순한 접근: 즐겨찾기 조회 후 사용자 이름으로 제목 필터링
        // 모든 즐겨찾기 조회 (데이터베이스에서 인덱스 사용 최적화)
        const allImageFavs = await db.select({
          id: favorites.id,
          itemId: favorites.itemId,
          image_id: images.id,
          image_title: images.title,
          image_url: images.transformedUrl,
          image_createdAt: images.createdAt
        })
        .from(favorites)
        .innerJoin(images, eq(favorites.itemId, images.id))
        .where(eq(favorites.itemType, "image"))
        .orderBy(desc(images.createdAt))
        .limit(username ? 30 : 10);  // 사용자별 필터링할 경우 더 많이 가져와서 클라이언트에서 필터링
        
        // 사용자 이름이 있는 경우에만 제목 기준 필터링 적용
        let imageFavsFiltered = allImageFavs;
        if (username) {
          console.log(`사용자 ${username}의 즐겨찾기 이미지 필터링 적용 (직접 필터링)`);
          // 제목에 사용자 이름이 포함된 항목만 필터링 (대소문자 무시)
          imageFavsFiltered = allImageFavs.filter(item => 
            item.image_title.toLowerCase().includes(username.toLowerCase())
          );
          
          // 필터링 결과가 없으면 필터 없이 원래 결과 일부만 반환
          if (imageFavsFiltered.length === 0) {
            console.log("사용자 이름으로 필터링된 결과 없음 - 기본 결과 표시");
            imageFavsFiltered = allImageFavs.slice(0, 5);
          } else {
            // 너무 많으면 10개로 제한
            imageFavsFiltered = imageFavsFiltered.slice(0, 10);
          }
        }
        
        // 이미지 항목 변환
        transformedImageFavorites = imageFavsFiltered.map(item => ({
          id: item.image_id,
          title: item.image_title,
          type: "image" as const,
          url: item.image_url,
          thumbnailUrl: item.image_url,
          createdAt: item.image_createdAt.toISOString(),
          isFavorite: true
        }));
      } catch (imageError) {
        console.error("이미지 즐겨찾기 조회 오류:", imageError);
      }
      
      // 결합 및 정렬
      return [...transformedMusicFavorites, ...transformedImageFavorites].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      console.error("즐겨찾기 조회 오류:", error);
      return []; // 오류 발생 시 빈 배열 반환
    }
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
