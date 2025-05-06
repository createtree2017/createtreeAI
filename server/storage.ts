import { db } from "@db";
import { music, images, chatMessages, favorites, savedChats, imageTemplates, eq, desc, and, asc } from "@shared/schema";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// 임시 이미지 저장을 위한 경로
const TEMP_IMAGE_DIR = path.join(process.cwd(), 'uploads', 'temp');

// 파일 경로를 웹 접근 가능한 URL로 변환하는 함수
function convertPathToUrl(filePath: string): string {
  // 기본 디렉토리 경로 제거
  const basePath = process.cwd();
  let relativePath = filePath.replace(basePath, '');
  
  // 경로 구분자를 웹에서 사용하는 슬래시(/)로 변경
  relativePath = relativePath.replace(/\\/g, '/');
  
  // 맨 앞에 슬래시가 없으면 추가
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  
  return relativePath;
}

// 임시 이미지를 파일로 저장하고 URL 경로를 반환하는 함수
async function saveTemporaryImage(imageUrl: string, title: string): Promise<{ localPath: string, webUrl: string }> {
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
      
      // 웹 접근 가능한 URL로 변환
      const webUrl = convertPathToUrl(filepath);
      return { localPath: filepath, webUrl };
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
        
        // 웹 접근 가능한 URL로 변환
        const webUrl = convertPathToUrl(filepath);
        return { localPath: filepath, webUrl };
      } catch (fetchError) {
        console.error(`이미지 다운로드 중 오류 발생 (${url}):`, fetchError);
        
        // 다운로드 실패 시 빈 파일이라도 생성 (나중에 처리)
        fs.writeFileSync(filepath, Buffer.from(''));
        console.warn(`빈 임시 파일 생성됨: ${filepath} - 이후 다운로드 재시도 필요`);
        
        // 웹 접근 가능한 URL로 변환
        const webUrl = convertPathToUrl(filepath);
        return { localPath: filepath, webUrl };
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
    const { localPath, webUrl } = await saveTemporaryImage(imageUrl, title);
    return { localPath, webUrl, filename: path.basename(localPath) };
  },
  
  // 이미지 템플릿 관련 함수들
  async createImageTemplate(templateData: {
    title: string;
    description: string | null;
    templateImageUrl: string;
    templateType: string;
    promptTemplate: string;
    maskArea?: any;
    thumbnailUrl?: string;
    categoryId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
  }) {
    try {
      console.log(`[Storage] 이미지 템플릿 생성 시작: "${templateData.title}"`);
      
      // 로컬에 템플릿 이미지 저장
      const { localPath, webUrl } = await this.saveTemporaryImage(
        templateData.templateImageUrl,
        `template_${templateData.title.replace(/\s+/g, '_')}`
      );
      
      // 썸네일이 제공되지 않은 경우 템플릿 이미지를 썸네일로 사용
      if (!templateData.thumbnailUrl) {
        templateData.thumbnailUrl = webUrl;
      }
      
      const [savedTemplate] = await db
        .insert(imageTemplates)
        .values({
          title: templateData.title,
          description: templateData.description,
          templateImageUrl: webUrl,
          templateType: templateData.templateType,
          promptTemplate: templateData.promptTemplate,
          maskArea: templateData.maskArea ? templateData.maskArea : null,
          thumbnailUrl: templateData.thumbnailUrl,
          // categoryId가 null이거나 빈 문자열이면 명시적으로 null로 설정
          categoryId: templateData.categoryId && templateData.categoryId !== "" ? templateData.categoryId : null,
          isActive: templateData.isActive !== undefined ? templateData.isActive : true,
          isFeatured: templateData.isFeatured !== undefined ? templateData.isFeatured : false,
          sortOrder: templateData.sortOrder !== undefined ? templateData.sortOrder : 0,
        })
        .returning();
      
      console.log(`[Storage] 이미지 템플릿 생성 완료: ID ${savedTemplate.id}, 타이틀: "${savedTemplate.title}"`);
      return savedTemplate;
    } catch (error) {
      console.error(`[Storage] 이미지 템플릿 생성 중 오류 발생:`, error);
      throw error;
    }
  },
  
  async getImageTemplateList() {
    try {
      const templates = await db.query.imageTemplates.findMany({
        orderBy: [asc(imageTemplates.sortOrder), desc(imageTemplates.createdAt)],
      });
      
      if (templates.length > 0) {
        console.log(`이미지 템플릿 ${templates.length}개 조회됨`);
      } else {
        console.log('저장된 이미지 템플릿이 없습니다.');
      }
      
      return templates;
    } catch (error) {
      console.error("이미지 템플릿 조회 중 오류:", error);
      return [];
    }
  },
  
  async getImageTemplateById(id: number) {
    try {
      const template = await db.query.imageTemplates.findFirst({
        where: eq(imageTemplates.id, id),
      });
      
      if (!template) {
        console.log(`ID ${id}의 이미지 템플릿이 존재하지 않습니다.`);
        return null;
      }
      
      return template;
    } catch (error) {
      console.error(`ID ${id}의 이미지 템플릿 조회 중 오류:`, error);
      return null;
    }
  },
  
  async updateImageTemplate(id: number, updateData: Partial<typeof imageTemplates.$inferInsert>) {
    try {
      console.log(`[Storage] 이미지 템플릿 업데이트 시작: ID ${id}`);
      
      // 기존 템플릿 확인
      const existingTemplate = await this.getImageTemplateById(id);
      if (!existingTemplate) {
        throw new Error(`ID ${id}의 이미지 템플릿이 존재하지 않습니다.`);
      }
      
      // templateImageUrl이 변경된 경우 새 이미지 저장
      if (updateData.templateImageUrl && updateData.templateImageUrl !== existingTemplate.templateImageUrl) {
        const { localPath } = await this.saveTemporaryImage(
          updateData.templateImageUrl,
          `template_${(updateData.title || existingTemplate.title).replace(/\s+/g, '_')}`
        );
        updateData.templateImageUrl = localPath;
      }
      
      // categoryId가 null이거나 빈 문자열이면 명시적으로 null로 설정
      if (updateData.categoryId === "" || (typeof updateData.categoryId === 'string' && updateData.categoryId.trim() === "")) {
        updateData.categoryId = null;
      }
      
      const [updatedTemplate] = await db
        .update(imageTemplates)
        .set(updateData)
        .where(eq(imageTemplates.id, id))
        .returning();
      
      console.log(`[Storage] 이미지 템플릿 업데이트 완료: ID ${updatedTemplate.id}`);
      return updatedTemplate;
    } catch (error) {
      console.error(`[Storage] 이미지 템플릿 업데이트 중 오류 발생:`, error);
      throw error;
    }
  },
  
  async deleteImageTemplate(id: number) {
    try {
      console.log(`[Storage] 이미지 템플릿 삭제 시작: ID ${id}`);
      
      // 삭제 전 템플릿 정보 가져오기
      const template = await this.getImageTemplateById(id);
      if (!template) {
        throw new Error(`ID ${id}의 이미지 템플릿이 존재하지 않습니다.`);
      }
      
      // 템플릿 삭제
      await db
        .delete(imageTemplates)
        .where(eq(imageTemplates.id, id));
      
      console.log(`[Storage] 이미지 템플릿 삭제 완료: ID ${id}`);
      return { success: true, id };
    } catch (error) {
      console.error(`[Storage] 이미지 템플릿 삭제 중 오류 발생:`, error);
      throw error;
    }
  },
  
  async compositeImageWithTemplate(userImagePath: string, templateId: number) {
    try {
      console.log(`[Storage] 이미지 합성 시작: 템플릿 ID ${templateId}`);
      
      // 템플릿 정보 가져오기
      const template = await this.getImageTemplateById(templateId);
      if (!template) {
        throw new Error(`ID ${templateId}의 이미지 템플릿이 존재하지 않습니다.`);
      }
      
      // 사용자 이미지 읽기
      const userImageBuffer = fs.readFileSync(userImagePath);
      
      // 템플릿 이미지 읽기
      const templateImageBuffer = fs.readFileSync(template.templateImageUrl);
      
      console.log(`[Storage] 템플릿 및 사용자 이미지 로드 완료, OpenAI API 호출 준비`);
      
      // 템플릿 프롬프트 처리
      let prompt = template.promptTemplate;
      
      // OpenAI API를 통한 이미지 합성
      const { compositeImages } = await import('./services/openai-composite');
      const compositedImageUrl = await compositeImages(
        userImageBuffer,
        templateImageBuffer,
        template.templateType,
        prompt,
        template.maskArea
      );
      
      if (!compositedImageUrl.includes("placehold.co")) {
        console.log(`[Storage] 이미지 합성 성공`);
        return compositedImageUrl;
      } else {
        console.log(`[Storage] 이미지 합성 실패`);
        return "https://placehold.co/1024x1024/A7C1E2/FFF?text=이미지+합성+실패.+다시+시도해+주세요.";
      }
    } catch (error) {
      console.error(`[Storage] 이미지 합성 중 오류 발생:`, error);
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=이미지+합성+서비스+오류.+다시+시도해+주세요.";
    }
  },
  
  async saveCompositedImage(
    originalFilename: string,
    templateId: number,
    originalPath: string,
    compositedUrl: string,
    facePositions?: any
  ) {
    try {
      // 템플릿 정보 가져오기
      const template = await this.getImageTemplateById(templateId);
      if (!template) {
        throw new Error(`ID ${templateId}의 이미지 템플릿이 존재하지 않습니다.`);
      }
      
      // 파일명에서 확장자 제거
      const nameWithoutExt = path.basename(
        originalFilename,
        path.extname(originalFilename)
      );
      
      // 제목 생성
      const title = `${template.title} ${nameWithoutExt}`;
      
      // 메타데이터 생성
      const metadata: Record<string, any> = {
        templateTitle: template.title,
        templateType: template.templateType
      };
      
      console.log(`[Storage] 합성 이미지 저장 시작: "${title}", 템플릿: ${template.title}`);
      
      const [savedImage] = await db
        .insert(images)
        .values({
          title,
          style: template.title, // 스타일에 템플릿 제목 사용
          originalUrl: originalPath,
          transformedUrl: compositedUrl,
          isComposite: true,
          templateId: templateId,
          facePositions: facePositions,
          metadata: JSON.stringify(metadata),
        })
        .returning();
      
      console.log(`[Storage] 합성 이미지 저장 완료: ID ${savedImage.id}, 타이틀: "${savedImage.title}"`);
      return savedImage;
    } catch (error) {
      console.error(`[Storage] 합성 이미지 저장 중 오류 발생:`, error);
      throw error;
    }
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
      if (customPromptTemplate) {
        console.log(`[Storage] Using custom prompt template: "${customPromptTemplate.substring(0, 100)}..."`);
      } else {
        console.log(`[Storage] No custom prompt template provided, using default`);
      }
      
      if (aspectRatio) {
        console.log(`[Storage] Using custom aspect ratio: ${aspectRatio}`);
      } else {
        console.log(`[Storage] No custom aspect ratio provided, using default 1:1`);
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
