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
    duration: number,
    userId?: number | null,
    username?: string | null
  ) {
    try {
      const title = `${babyName}'s ${style.charAt(0).toUpperCase() + style.slice(1)}`;
      
      // 사용자 정보가 있는 경우 메타데이터에 포함
      let metadataObj: any = {
        generatedAt: new Date().toISOString(),
        appVersion: '1.0.0'
      };
      
      // 사용자 정보가 있으면 메타데이터와 userId 필드에 추가
      if (userId) {
        metadataObj.userId = userId;
      }
      
      if (username) {
        metadataObj.username = username;
      }
      
      console.log(`음악 생성 저장: ${title}, 사용자 ID=${userId || '없음'}, 이름=${username || '없음'}`);
      
      const [savedMusic] = await db
        .insert(music)
        .values({
          title,
          babyName,
          style,
          url,
          duration,
          userId: userId || null,
          metadata: JSON.stringify(metadataObj),
        })
        .returning();
      
      return savedMusic;
    } catch (error) {
      console.error('음악 저장 오류:', error);
      throw error;
    }
  },
  
  async getMusicList(userId?: number | null, username?: string | null) {
    try {
      console.log(`[Storage] getMusicList 호출됨: 사용자=${username || '없음'}, ID=${userId || '없음'}`);
      
      // 기본 쿼리: 모든 음악 항목 가져오기 (생성 시간 역순, 명시적 필드 선택)
      // user_id 컬럼이 존재하지 않는 오류 수정 - db.query 대신 db.select 사용
      const results = await db.select({
        id: music.id,
        title: music.title,
        babyName: music.babyName,
        style: music.style,
        url: music.url,
        duration: music.duration,
        createdAt: music.createdAt,
        metadata: music.metadata
        // user_id 컬럼도 존재한다면 필요 시 추가할 수 있음
      })
      .from(music)
      .orderBy(desc(music.createdAt));
      
      console.log(`[Storage] 음악 항목 ${results.length}개 로드됨`);
      
      // 데이터 샘플 로깅 (디버깅)
      const sampleItems = results.slice(0, Math.min(3, results.length));
      sampleItems.forEach((item, idx) => {
        let metadataLog = '없음';
        if (item.metadata) {
          try {
            const metadata = typeof item.metadata === 'string' 
              ? JSON.parse(item.metadata) 
              : item.metadata;
            metadataLog = JSON.stringify(metadata);
          } catch (error) {
            metadataLog = `파싱 오류: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        console.log(`[음악 샘플 ${idx+1}] ID: ${item.id}, 제목: "${item.title}", 메타데이터: ${metadataLog}`);
      });
      
      // 사용자 ID 또는 사용자명이 제공된 경우, 메타데이터로 필터링
      let filteredResults = results;
      if (userId || username) {
        filteredResults = results.filter(item => {
          let isMatch = false;
          let matchReason = "불일치";
          
          // 메타데이터 필터링
          try {
            if (item.metadata) {
              const metadata = typeof item.metadata === 'string' 
                ? JSON.parse(item.metadata) 
                : item.metadata;
              
              // 1. userId 비교 (문자열로 변환)
              if (userId && metadata && metadata.userId) {
                const metadataUserIdStr = String(metadata.userId);
                const currentUserIdStr = String(userId);
                
                if (metadataUserIdStr === currentUserIdStr) {
                  isMatch = true;
                  matchReason = `메타데이터 userId 일치: ${metadataUserIdStr}`;
                }
              }
              
              // 2. username 비교
              if (!isMatch && username && metadata && metadata.username) {
                if (metadata.username === username) {
                  isMatch = true;
                  matchReason = `메타데이터 username 일치: ${metadata.username}`;
                }
              }
            }
            
            // 3. 제목 기반 매칭 (백업)
            if (!isMatch && item.title && username) {
              // 사용자명 포함 패턴 확인
              const pattern1 = `[${username}]`; 
              const pattern2 = `${username}의`;
              const pattern3 = ` by ${username}`;
              
              if (item.title.includes(pattern1) || 
                  item.title.includes(pattern2) || 
                  item.title.includes(pattern3)) {
                isMatch = true;
                matchReason = `제목에 사용자명 포함: ${item.title}`;
              }
            }
            
            // 디버깅을 위해 일부 항목만 로깅
            if (isMatch || item.id % 5 === 0) {
              console.log(`[음악 필터링] ID: ${item.id}, 일치: ${isMatch}, 이유: ${matchReason}`);
            }
            
            return isMatch;
          } catch (error) {
            console.error(`[음악 ID ${item.id}] 메타데이터 파싱 오류:`, 
              error instanceof Error ? error.message : String(error));
            return false;
          }
        });
        
        console.log(`[Storage] 사용자 필터링 후 음악 항목 ${filteredResults.length}개 남음`);
      }
      
      // 메타데이터 처리 및 반환
      return filteredResults.map(item => {
        // 메타데이터 필드가 있으면 파싱
        try {
          if (item.metadata && typeof item.metadata === 'string') {
            const metadata = JSON.parse(item.metadata);
            
            // 메타데이터에 사용자 정보 추가 (없을 경우)
            if (userId && !metadata.userId) {
              metadata.userId = userId.toString();
            }
            if (username && !metadata.username) {
              metadata.username = username;
            }
            
            // 메타데이터를 포함한 항목 반환
            return {
              ...item,
              metadata: JSON.stringify(metadata)
            };
          }
        } catch (error) {
          console.error('음악 메타데이터 파싱 오류:', error);
        }
        
        // 메타데이터 없는 경우, 그대로 반환
        return item;
      });
    } catch (error) {
      console.error('[Storage] 음악 목록 조회 오류:', error);
      return []; // 오류 발생 시 빈 배열 반환
    }
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
    
    // Create a title with user information for proper filtering
    let title;
    if (username) {
      // 사용자 이름을 제목에 명확하게 포함하여 필터링 용이성 증가
      title = `[${username}] ${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
      // 한글 사용자 이름이라면 "사용자명의" 형식도 추가
      if (/[가-힣]/.test(username)) {
        title = `${username}의 ${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
      }
    } else {
      title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${nameWithoutExt}`;
    }
    
    // Include the variant ID and aspectRatio if they exist
    const metadata: Record<string, any> = {};
    if (variantId) metadata.variantId = variantId;
    if (aspectRatio) metadata.aspectRatio = aspectRatio;
    if (username) metadata.username = username;
    // 사용자 ID는 항상 문자열로 저장하여 일관성 유지
    if (userId) metadata.userId = userId.toString();
    
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
          // 필드 이름은 데이터베이스 컬럼과 일치해야 합니다.
          // 실제 DB에 없는 username, originalFilename 필드는 제거
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
      
      // 메타데이터 분석
      if (results && results.length > 0) {
        console.log(`[Storage] 최신 이미지 ${results.length}개 조회됨, 가장 최근 ID: ${results[0].id}, 생성일: ${results[0].createdAt}`);
        
        // 메타데이터 로깅 (디버깅용)
        const sampleImages = results.slice(0, 3);
        sampleImages.forEach(img => {
          // 메타데이터 구조 확인 로깅
          let metadataLog = "없음";
          
          if (img.metadata) {
            try {
              const metadata = typeof img.metadata === 'string' 
                ? JSON.parse(img.metadata) 
                : img.metadata;
              
              metadataLog = `{userId: ${metadata.userId || '없음'}, username: ${metadata.username || '없음'}}`;
            } catch (error) {
              metadataLog = `파싱 오류: ${error instanceof Error ? error.message : String(error)}`;
            }
          }
          
          console.log(`[Storage] 이미지 샘플 - ID: ${img.id}, 제목: "${img.title}", 메타데이터: ${metadataLog}`);
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
  async getPaginatedImageList(page: number = 1, limit: number = 10, userId?: number | null, username?: string | null) {
    try {
      console.log(`[Storage] getPaginatedImageList 호출됨: page=${page}, limit=${limit}, userId=${userId || '없음'}, username=${username || '없음'}, ${new Date().toISOString()}`);
      
      // 전체 이미지 수 계산을 위한 기본 쿼리
      const countQuery = db.select({ count: count() }).from(images);
      const countResult = await countQuery;
      const total = countResult[0].count;
      
      console.log(`[Storage] 전체 이미지 총 개수: ${total}`);
      
      // 기본 쿼리 구성
      let query = db.select({
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
      
      // 모든 이미지 가져오기
      const allImages = await query.execute();
      
      // 데이터 샘플 로깅 (디버깅)
      const sampleItems = allImages.slice(0, Math.min(3, allImages.length));
      sampleItems.forEach((item, idx) => {
        let metadataLog = '없음';
        if (item.metadata) {
          try {
            const metadata = typeof item.metadata === 'string' 
              ? JSON.parse(item.metadata) 
              : item.metadata;
            metadataLog = JSON.stringify(metadata);
          } catch (error) {
            metadataLog = `파싱 오류: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        console.log(`[이미지 샘플 ${idx+1}] ID: ${item.id}, 제목: "${item.title}", 메타데이터: ${metadataLog}`);
      });
      
      // 사용자 ID 또는 이름 기준으로 필터링 적용
      let results = allImages;
      
      if (userId || username) {
        console.log(`[Storage] 사용자 필터링 적용 - ID: ${userId || '없음'}, 이름: ${username || '없음'}`);
        
        // 사용자 메타데이터 기반 필터링 - userId와 username 모두 활용
        results = allImages.filter(item => {
          let isMatch = false;
          let matchReason = "불일치";
          
          try {
            if (!item.metadata) return false;
            
            const metadata = typeof item.metadata === 'string' 
              ? JSON.parse(item.metadata) 
              : item.metadata;
            
            // 1. userId 비교 (문자열로 변환)
            if (userId && metadata && metadata.userId) {
              const metadataUserIdStr = String(metadata.userId);
              const currentUserIdStr = String(userId);
              
              if (metadataUserIdStr === currentUserIdStr) {
                isMatch = true;
                matchReason = `메타데이터 userId 일치: ${metadataUserIdStr}`;
              }
            }
            
            // 2. username 비교
            if (!isMatch && username && metadata && metadata.username) {
              if (metadata.username === username) {
                isMatch = true;
                matchReason = `메타데이터 username 일치: ${metadata.username}`;
              }
            }
            
            // 3. 제목 기반 매칭 (백업)
            if (!isMatch && item.title && username) {
              // 사용자명 포함 패턴 확인
              const pattern1 = `[${username}]`; 
              const pattern2 = `${username}의`;
              const pattern3 = ` by ${username}`;
              const pattern4 = `(${username})`;
              
              if (item.title.includes(pattern1) || 
                  item.title.includes(pattern2) || 
                  item.title.includes(pattern3) ||
                  item.title.includes(pattern4)) {
                isMatch = true;
                matchReason = `제목에 사용자명 포함: ${item.title}`;
              }
            }
            
            // 디버깅을 위해 일부 항목만 로깅
            if (isMatch || item.id % 10 === 0) {
              console.log(`[이미지 필터링] ID: ${item.id}, 일치: ${isMatch}, 이유: ${matchReason}`);
            }
            
            return isMatch;
          } catch (error) {
            // 메타데이터 파싱 오류 시 false 반환
            console.error(`[이미지 ID ${item.id}] 메타데이터 파싱 오류:`, 
              error instanceof Error ? error.message : String(error));
            return false;
          }
        });
        
        console.log(`[Storage] 사용자 기반 필터링 후 ${results.length}개 이미지 남음`);
        
        // 필터링 결과가 너무 적을 경우에만 모든 이미지를 보여주는 대신,
        // 로그인한 사용자의 이미지만 보여주도록 유지
        // 해시 기반 필터링 방식은 더 이상 사용하지 않음
        console.log(`[Storage] 사용자 ID ${userId}를 위한 ${results.length}개 이미지 필터링 완료`);
        
        // 개발 모드에서 빈 결과 확인용 메시지
        if (results.length === 0) {
          console.log(`[Storage] 경고: 사용자 ${username}(ID:${userId})의 이미지가 없습니다.`);
        }
      }
      
      // 페이지네이션 적용
      results = results.slice((page - 1) * limit, page * limit);
      
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
