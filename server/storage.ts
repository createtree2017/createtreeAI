import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, concepts, conceptCategories, eq, desc, and } from "@shared/schema";
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
        console.log(`[Storage] 콘셉트 조회 결과: 
          ID: ${concept.id} 
          conceptId: ${concept.conceptId}
          usePhotoMaker: ${concept.usePhotoMaker}
          referenceImageUrl: ${concept.referenceImageUrl || '없음'}`);
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
      
      // 콘셉트의 전체 데이터를 로그로 출력하여 디버깅
      console.log(`[Storage] 콘셉트 전체 데이터:`, JSON.stringify(concept, null, 2));
      
      // PhotoMaker 모드 확인 (개념이 존재하고 usePhotoMaker가 true인 경우)
      console.log(`[Storage] usePhotoMaker 값 확인: ${concept?.usePhotoMaker} (타입: ${typeof concept?.usePhotoMaker}, JSON: ${JSON.stringify(concept?.usePhotoMaker)})`);
      
      // 자세한 디버깅을 위해 확인 과정 추가
      const isTrue = concept?.usePhotoMaker === true;
      const isStringTrue = concept?.usePhotoMaker === "true";
      const isTrueString = String(concept?.usePhotoMaker) === "true";
      
      console.log(`[Storage] usePhotoMaker 비교 결과: === true (${isTrue}), === "true" (${isStringTrue}), String() === "true" (${isTrueString})`);
      
      // PostgreSQL은 boolean 값을 't'로 반환할 수 있음
      const isPgTrue = concept?.usePhotoMaker === 't';
      const isPgTrueString = String(concept?.usePhotoMaker) === 't';
      
      console.log(`[Storage] PostgreSQL 비교: === 't' (${isPgTrue}), String() === 't' (${isPgTrueString})`);
      
      // 최종 결정: 문자열 't', boolean true, 또는 문자열 "true" 중 하나라도 true면 사용
      const usePhotoMaker = isTrue || isStringTrue || isTrueString || isPgTrue || isPgTrueString;
      const customPhotoMakerPrompt = concept?.photoMakerPrompt;
      const customPhotoMakerNegativePrompt = concept?.photoMakerNegativePrompt;
      const customPhotoMakerStrength = concept?.photoMakerStrength;
      const hasReferenceImage = concept?.referenceImageUrl && concept.referenceImageUrl.trim() !== '';
      
      console.log(`[Storage] 변환된 usePhotoMaker 최종값: ${usePhotoMaker} (참조 이미지 있음: ${hasReferenceImage})`);
      
      try {
        // 리플리케이트 API 토큰 확인 (길이만 출력)
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        console.log(`[Storage] REPLICATE_API_TOKEN ${replicateToken ? `존재함 (길이: ${replicateToken.length})` : '없음'}`);
        
        // PhotoMaker 사용 가능 여부 로깅
        if (usePhotoMaker) {
          console.log(`[Storage] PhotoMaker 모드 활성화됨 (우선 사용)`);
          if (customPhotoMakerPrompt) {
            console.log(`[Storage] PhotoMaker 커스텀 프롬프트 사용: ${customPhotoMakerPrompt.substring(0, 50)}...`);
          }
          if (customPhotoMakerNegativePrompt) {
            console.log(`[Storage] PhotoMaker 네거티브 프롬프트 사용: ${customPhotoMakerNegativePrompt.substring(0, 50)}...`);
          }
          if (customPhotoMakerStrength) {
            console.log(`[Storage] PhotoMaker 강도 설정: ${customPhotoMakerStrength}`);
          }
        } else {
          console.log(`[Storage] PhotoMaker 모드 비활성화됨 (OpenAI GPT-Image-1 사용)`);
        }
        
        // 1. PhotoMaker 얼굴 합성 모드 (레퍼런스 이미지가 있는 경우)
        if (usePhotoMaker && hasReferenceImage) {
          console.log(`[Storage] 레퍼런스 이미지로 PhotoMaker 얼굴 합성 모드 시작...`);
          console.log(`[Storage] 레퍼런스 이미지: ${concept.referenceImageUrl}`);
          
          // 레퍼런스 이미지 경로 확인
          let refImagePath = concept.referenceImageUrl || '';
          if (refImagePath.startsWith('/')) {
            refImagePath = path.join(process.cwd(), refImagePath);
          }
          
          // 파일 존재 확인
          if (fs.existsSync(refImagePath)) {
            try {
              // photo-maker 서비스의 얼굴 합성 함수 호출
              const { mergeUserFaceWithReference } = await import('./services/photo-maker');
              const transformedImagePath = await mergeUserFaceWithReference(
                filePath, 
                refImagePath, 
                style,
                customPhotoMakerPrompt ? String(customPhotoMakerPrompt) : undefined,
                customPhotoMakerNegativePrompt ? String(customPhotoMakerNegativePrompt) : undefined,
                customPhotoMakerStrength ? String(customPhotoMakerStrength) : undefined
              );
              
              if (transformedImagePath && fs.existsSync(transformedImagePath)) {
                console.log(`[Storage] PhotoMaker 얼굴 합성 성공 [이미지 데이터 로그 생략]`);
                const relativePath = transformedImagePath.replace(process.cwd(), '');
                return relativePath;
              }
            } catch (photoMakerError) {
              console.error(`[Storage] PhotoMaker 얼굴 합성 오류:`, photoMakerError);
              // PhotoMaker 일반 모드로 폴백
            }
          } else {
            console.error(`[Storage] 레퍼런스 이미지 파일이 존재하지 않습니다: ${refImagePath}`);
          }
        }
        
        // 2. PhotoMaker 일반 변환 모드 (usePhotoMaker가 true이고 레퍼런스 이미지가 없거나 얼굴 합성에 실패한 경우)
        if (usePhotoMaker) {
          console.log(`[Storage] PhotoMaker 일반 이미지 변환 모드 시작...`);
          
          try {
            const { generateStylizedImage } = await import('./services/photo-maker');
            const effectivePrompt = customPhotoMakerPrompt || prompt;
            console.log(`[Storage] PhotoMaker 사용 프롬프트: ${effectivePrompt.substring(0, 50)}...`);
            
            const transformedImagePath = await generateStylizedImage(
              filePath, 
              style, 
              effectivePrompt,
              customPhotoMakerNegativePrompt ? String(customPhotoMakerNegativePrompt) : undefined,
              customPhotoMakerStrength ? String(customPhotoMakerStrength) : undefined
            );
            
            if (transformedImagePath && fs.existsSync(transformedImagePath)) {
              console.log(`[Storage] PhotoMaker 이미지 변환 성공 [이미지 데이터 로그 생략]`);
              const relativePath = transformedImagePath.replace(process.cwd(), '');
              return relativePath;
            }
          } catch (photoMakerError) {
            console.error(`[Storage] PhotoMaker 일반 변환 오류:`, photoMakerError);
            console.log(`[Storage] OpenAI GPT-Image-1로 폴백...`);
            // OpenAI 폴백
          }
        }
        
        // 3. OpenAI 이미지 생성 API 사용 (PhotoMaker가 비활성화되었거나 실패한 경우)
        console.log(`[Storage] OpenAI 이미지 생성 API 사용...`);
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
      console.log(`[Storage] 새 이미지 저장 시작: "${title}", 스타일: ${style}`);
      
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
      
      console.log(`[Storage] 이미지 저장 완료: ID ${savedImage.id}, 타이틀: "${savedImage.title}"`);
      return savedImage;
    } catch (error) {
      console.error(`[Storage] 이미지 저장 중 오류 발생:`, error);
      throw error;
    }
  },
  
  async getImageList() {
    try {
      // 데이터베이스에서 이미지를 최신순으로 가져옴
      const results = await db.query.images.findMany({
        orderBy: [desc(images.createdAt)],
      });
      
      // 최신 생성 이미지 로그 출력 (디버깅용)
      if (results.length > 0) {
        console.log(`최신 이미지 ${results.length}개 조회됨, 가장 최근 ID: ${results[0].id}, 생성일: ${results[0].createdAt}`);
      } else {
        console.log('저장된 이미지가 없습니다.');
      }
      
      return results;
    } catch (error) {
      console.error("Error fetching images:", error);
      return [];
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
