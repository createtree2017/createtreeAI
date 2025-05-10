import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import 'express-session';
import { DevHistoryManager } from "./services/dev-history-manager";

// Express session 타입 확장
declare module 'express-session' {
  interface SessionData {
    tempImage?: {
      id: number;
      title: string;
      style: string;
      originalUrl: string;
      transformedUrl: string;
      createdAt: string;
      isTemporary: boolean;
      localFilePath?: string; // 로컬 파일 시스템 경로 추가
      aspectRatio?: string; // 이미지 종횡비 추가
      dbImageId?: number; // 실제 DB에 저장된 ID도 추가
    };
  }
}
// Chat 시스템에서는 simple 버전으로 import하고, 이미지는 DALL-E 3 버전을 사용
import { generateChatResponse } from "./services/openai-simple";
import { generateMusic } from "./services/replicate";
import { generateContent } from "./services/gemini";
import { 
  generateAiMusic, 
  getAvailableMusicStyles, 
  getAvailableDurations 
} from "./services/topmedia-music";
import { exportChatHistoryAsHtml, exportChatHistoryAsText } from "./services/export-logs";
import { exportDevChatAsHtml, exportDevChatAsText } from "./services/dev-chat-export";
import { AutoChatSaver } from "./services/auto-chat-saver";
import superAdminRoutes from './routes/superAdmin';
import { 
  music, 
  images, 
  personas, 
  personaCategories,
  concepts,
  conceptCategories,
  abTests,
  abTestVariants,
  abTestResults,
  hospitals,
  banners,
  styleCards,
  serviceCategories,
  favorites,
  savedChats,
  insertConceptSchema,
  insertConceptCategorySchema,
  insertBannerSchema,
  insertStyleCardSchema,
  insertServiceCategorySchema,
  and,
  sql,
  like
} from "../shared/schema";
import { db } from "../db";
import { or, eq, desc, asc } from "drizzle-orm";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage2,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/heic"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and HEIC images are allowed"));
    }
    cb(null, true);
  },
});

// Schema for music generation request
const musicGenerationSchema = z.object({
  babyName: z.string().min(1, "Baby name is required"),
  style: z.string().min(1, "Music style is required"),
  duration: z.number().int().min(30).max(180),
});

// Schema for TopMediai AI music generation request
const aiMusicGenerationSchema = z.object({
  lyrics: z.string().min(1, "Lyrics or phrase is required"),
  style: z.string().min(1, "Music style is required"),
  duration: z.string().min(2, "Duration is required"),
});

// Schema for chat message
const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  personaSystemPrompt: z.string().optional(),
});

// Schema for favorite toggle
const favoriteToggleSchema = z.object({
  itemId: z.number().int().positive(),
  type: z.enum(["music", "image"]),
});

// Schema for media sharing
const mediaShareSchema = z.object({
  id: z.number().int(), // -1 값도 허용
  type: z.enum(["music", "image"]),
});

// Schema for saving chat
const saveChatSchema = z.object({
  title: z.string().min(1, "Title is required"),
  personaId: z.string().min(1, "Persona ID is required"),
  personaName: z.string().min(1, "Persona name is required"),
  personaEmoji: z.string().min(1, "Persona emoji is required"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
    })
  ).min(1, "At least one message is required"),
  summary: z.string().min(1, "Summary is required"),
  userMemo: z.string().optional(),
  mood: z.string().optional(),
});

// Schema for persona creation/update
const personaSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  name: z.string().min(1, "Name is required"),
  avatarEmoji: z.string().min(1, "Avatar emoji is required"),
  description: z.string().min(1, "Description is required"),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  primaryColor: z.string().min(1, "Primary color is required"),
  secondaryColor: z.string().min(1, "Secondary color is required"),
  
  // Additional fields (optional)
  personality: z.string().optional(),
  tone: z.string().optional(),
  usageContext: z.string().optional(),
  emotionalKeywords: z.array(z.string()).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "all"]).default("all"),
  
  // Admin fields (optional with defaults)
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  
  // Categories
  categories: z.array(z.string()).optional(),
});

// Schema for persona category creation/update
const personaCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  emoji: z.string().min(1, "Emoji is required"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Schema for concept category creation/update
const conceptCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  systemPrompt: z.string().optional(), // GPT-4o 이미지 분석 지침 필드 추가
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// Schema for image generation request
const imageGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

// Schema for concept creation/update
const conceptSchema = z.object({
  conceptId: z.string().min(1, "Concept ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  promptTemplate: z.string().min(1, "Prompt template is required"),
  systemPrompt: z.string().optional(), // GPT-4o 이미지 분석 지침 필드 추가
  thumbnailUrl: z.string().optional(),
  tagSuggestions: z.array(z.string()).optional(),
  variables: z.array(
    z.object({
      name: z.string().min(1, "Variable name is required"),
      description: z.string().optional(),
      type: z.enum(["text", "number", "select", "color"]),
      defaultValue: z.string().optional(),
      options: z.array(
        z.object({
          label: z.string(),
          value: z.string()
        })
      ).optional()
    })
  ).optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  // OpenAI 이미지 생성 관련 필드만 유지
});

// 인증 라우트 가져오기
import authRoutes from "./routes/auth";
// 인증 서비스 가져오기
import { initPassport } from "./services/auth";
import cookieParser from "cookie-parser";
import session from "express-session";

export async function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 미들웨어 등록
  app.use(cookieParser());
  
  // 세션 미들웨어 등록
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
  }));
  
  // Passport 초기화 및 미들웨어 등록
  const passport = initPassport();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // 인증 라우트 등록
  app.use("/api/auth", authRoutes);
  
  // 슈퍼관리자 라우트 등록
  app.use("/api/super", superAdminRoutes);
  
  // 일반 사용자를 위한 병원 목록 API (로그인 필요없이 접근 가능)
  app.get("/api/hospitals", async (req, res) => {
    try {
      const activeHospitals = await db.select().from(hospitals).where(eq(hospitals.isActive, true)).orderBy(hospitals.name);
      return res.status(200).json(activeHospitals);
    } catch (error) {
      console.error('병원 목록 조회 오류:', error);
      return res.status(500).json({ error: '병원 목록을 가져오는 중 오류가 발생했습니다.' });
    }
  });
  
  // 개발 대화 기록을 관리하기 위한 인스턴스 생성
  const devHistoryManager = new DevHistoryManager();
  
  // Serve uploaded files from the uploads directory
  app.use('/uploads', (req, res, next) => {
    // 정적 파일 제공 - 직접 파일 읽고 제공
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    console.log(`Serving static file: ${filePath}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error serving static file: ${filePath}`, err);
        next();
      }
    });
  });
  
  // 임시 이미지 파일 제공 (별도 라우트로 처리)
  app.use('/uploads/temp', (req, res, next) => {
    // 임시 파일 제공
    const tempFilePath = path.join(process.cwd(), 'uploads', 'temp', req.path);
    console.log(`Serving temporary file: ${tempFilePath}`);
    res.sendFile(tempFilePath, (err) => {
      if (err) {
        console.error(`Error serving temporary file: ${tempFilePath}`, err);
        next();
      }
    });
  });
  // Serve embed script for iframe integration
  app.get('/embed.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/public/embed.js'));
  });
  
  // 개발 대화 내보내기 페이지 제공
  app.get('/dev-chat-export', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/public/dev-chat-export.html'));
  });
  
  // 개발 대화 히스토리 관리 페이지 제공
  app.get('/dev-history', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/public/dev-history.html'));
  });
  
  // API routes

  // Music endpoints
  app.post("/api/music/generate", async (req, res) => {
    try {
      const validatedData = musicGenerationSchema.parse(req.body);
      
      // Generate music using AI service
      const musicData = await generateMusic(
        validatedData.babyName,
        validatedData.style,
        validatedData.duration
      );
      
      // Save to database
      const savedMusic = await storage.saveMusicGeneration(
        validatedData.babyName,
        validatedData.style,
        musicData.url,
        validatedData.duration
      );
      
      return res.status(201).json(savedMusic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating music:", error);
      return res.status(500).json({ error: "Failed to generate music" });
    }
  });

  app.get("/api/music", async (req, res) => {
    try {
      const musicList = await storage.getMusicList();
      return res.json(musicList);
    } catch (error) {
      console.error("Error fetching music list:", error);
      return res.status(500).json({ error: "Failed to fetch music list" });
    }
  });
  
  // TopMediai AI Music Generation endpoint
  app.post("/api/generate-music", async (req, res) => {
    try {
      const validatedData = aiMusicGenerationSchema.parse(req.body);
      
      console.log("Generating music with TopMediai AI:", validatedData);
      
      // Generate music using TopMediai AI service
      const musicData = await generateAiMusic(
        validatedData.lyrics,
        validatedData.style,
        validatedData.duration
      );
      
      // Optional: Save to database if needed
      // For now, we're just returning the direct result
      
      return res.status(200).json({
        url: musicData.url,
        metadata: musicData.metadata,
        success: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating AI music:", error);
      return res.status(500).json({ 
        error: "Failed to generate music", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get available music styles endpoint
  app.get("/api/music-styles", async (req, res) => {
    try {
      const styles = getAvailableMusicStyles();
      return res.json(styles);
    } catch (error) {
      console.error("Error fetching music styles:", error);
      return res.status(500).json({ error: "Failed to fetch music styles" });
    }
  });
  
  // Get available music durations endpoint
  app.get("/api/music-durations", async (req, res) => {
    try {
      const durations = getAvailableDurations();
      return res.json(durations);
    } catch (error) {
      console.error("Error fetching music durations:", error);
      return res.status(500).json({ error: "Failed to fetch music durations" });
    }
  });

  // Image transformation endpoints
  app.post("/api/image/transform", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }
      
      const { style, aspectRatio } = req.body;
      if (!style) {
        return res.status(400).json({ error: "No style selected" });
      }
      
      // 기본값 1:1로 설정하고, 제공된 경우 해당 값 사용
      const selectedAspectRatio = aspectRatio || "1:1";
      
      // Check if this is a specific variant request for A/B testing
      const variantId = req.body.variant;
      let promptTemplate = null;
      let categorySystemPrompt = null;  // 변수 미리 정의 (scope 문제 해결)
      
      if (variantId) {
        // Get the active test for this concept/style
        const activeTest = await db.query.abTests.findFirst({
          where: and(
            eq(abTests.conceptId, style),
            eq(abTests.isActive, true)
          ),
        });
        
        if (activeTest) {
          // Find the requested variant
          const variant = await db.query.abTestVariants.findFirst({
            where: and(
              eq(abTestVariants.testId, activeTest.testId),
              eq(abTestVariants.variantId, variantId)
            ),
          });
          
          if (variant) {
            promptTemplate = variant.promptTemplate;
            
            // 변형 테스트에도 시스템 프롬프트 지원 추가
            // 원본 컨셉의 systemPrompt 또는 카테고리 systemPrompt 가져오기
            const concept = await db.query.concepts.findFirst({
              where: eq(concepts.conceptId, style)
            });
            
            if (concept) {
              if (concept.systemPrompt) {
                categorySystemPrompt = concept.systemPrompt;
                console.log(`A/B 테스트용 컨셉 '${concept.title}'의 시스템 프롬프트 적용: ${categorySystemPrompt.substring(0, 50)}...`);
              } else if (concept.categoryId) {
                const category = await db.query.conceptCategories.findFirst({
                  where: eq(conceptCategories.categoryId, concept.categoryId)
                });
                
                if (category && category.systemPrompt) {
                  categorySystemPrompt = category.systemPrompt;
                  console.log(`A/B 테스트용 카테고리 '${category.name}'의 시스템 프롬프트 적용: ${categorySystemPrompt.substring(0, 50)}...`);
                }
              }
            }
          }
        }
      } 
      else {
        // Check if this is a custom concept from the database
        const concept = await db.query.concepts.findFirst({
          where: eq(concepts.conceptId, style)
        });
        
        // 카테고리 정보와 시스템 프롬프트 가져오기 (이미지 분석 지침용)
        if (concept && concept.categoryId) {
          const category = await db.query.conceptCategories.findFirst({
            where: eq(conceptCategories.categoryId, concept.categoryId)
          });
          
          if (category && category.systemPrompt) {
            categorySystemPrompt = category.systemPrompt;
            console.log(`카테고리 '${category.name}'의 시스템 프롬프트 적용: ${categorySystemPrompt.substring(0, 50)}...`);
          }
        }
        
        if (concept) {
          // Use the prompt template from the concept
          promptTemplate = concept.promptTemplate;
          // 컨셉 자체의 systemPrompt가 있다면 우선 적용
          if (concept.systemPrompt) {
            categorySystemPrompt = concept.systemPrompt;
            console.log(`컨셉 '${concept.title}'의 시스템 프롬프트 적용: ${categorySystemPrompt.substring(0, 50)}...`);
          }
        }
      }
      
      // Process image using AI service (transforming to specified art style)
      const filePath = req.file.path;
      // Pass the variant's prompt template, category's system prompt, and aspect ratio
      const transformedImageUrl = await storage.transformImage(
        filePath, 
        style, 
        promptTemplate, 
        categorySystemPrompt,
        selectedAspectRatio
      );
      
      // Check if this is a request from admin panel or if it's a variant test
      // Admin 요청이거나 A/B 테스트 변형일 경우에만 데이터베이스에 저장
      const isAdmin = req.query.admin === 'true' || req.headers['x-admin-request'] === 'true';
      const isVariantTest = !!variantId;
      
      let savedImage;
      let dbSavedImage;
      
      try {
        // 현재 로그인한 사용자 정보 가져오기
        const user = req.user;
        const userId = user?.id;
        const username = user?.username;
        
        // 사용자 정보 로그 출력
        if (userId && username) {
          console.log(`이미지 변환 요청: 로그인 사용자 ${username} (ID: ${userId})`);
        } else {
          console.log('이미지 변환 요청: 로그인 없음 (익명 사용자)');
        }
        
        // 모든 이미지 요청은 데이터베이스에 저장 (사용자 정보 포함)
        dbSavedImage = await storage.saveImageTransformation(
          req.file.originalname,
          style,
          filePath,
          transformedImageUrl,
          userId || null,
          username || null,
          variantId // Store which variant was used, if any
        );
        
        if (isAdmin || isVariantTest) {
          // 관리자 패널이나 A/B 테스트 요청은 DB 이미지 직접 반환
          savedImage = dbSavedImage;
          console.log(`관리자 요청: 이미지가 데이터베이스에 저장됨 (ID: ${dbSavedImage.id})`);
        } else {
          // 일반 사용자 요청인 경우 - 데이터베이스에 저장은 했지만 임시 객체로 응답
          console.log(`일반 사용자 이미지: DB에 저장됨 (ID: ${dbSavedImage.id}), 사용자에게는 임시 이미지로 제공`);
          
          // 긴 base64 문자열을 로컬 파일로 저장 (세션에 저장하는 대신)
          const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${path.basename(req.file.originalname, path.extname(req.file.originalname))}`;
          const tempImageResult = await storage.saveTemporaryImage(transformedImageUrl, title);
          
          // 임시 응답 객체 생성 (로컬 파일 경로를 사용)
          savedImage = {
            id: -1, // -1은 저장되지 않은 임시 ID
            title,
            style,
            originalUrl: filePath,
            transformedUrl: `/uploads/temp/${tempImageResult.filename}`, // 로컬 파일 경로
            localFilePath: tempImageResult.localPath, // 전체 파일 경로 (내부 사용)
            createdAt: new Date().toISOString(),
            isTemporary: true, // 클라이언트에서 임시 여부 식별을 위한 플래그
            dbImageId: dbSavedImage.id, // 실제 DB에 저장된 ID (필요시 사용)
            aspectRatio: selectedAspectRatio // 사용된 비율 정보 추가
          };
          
          // 세션에 임시 이미지 정보 저장 (다운로드 처리를 위해)
          if (req.session) {
            req.session.tempImage = savedImage;
            console.log("임시 이미지 정보를 세션에 저장했습니다:", savedImage.title);
          } else {
            console.warn("세션 객체가 없어 임시 이미지를 저장할 수 없습니다.");
          }
        }
      } catch (error) {
        console.error("이미지 저장 중 오류:", error);
        // 오류 발생 시 기본 응답 객체 생성
        savedImage = {
          id: -1,
          title: `오류: ${style} 이미지`,
          style,
          originalUrl: filePath,
          transformedUrl: transformedImageUrl,
          createdAt: new Date().toISOString(),
          isTemporary: true,
          aspectRatio: selectedAspectRatio // 선택된 비율 정보 추가
        };
      }
      
      return res.status(201).json(savedImage);
    } catch (error) {
      console.error("Error transforming image:", error);
      return res.status(500).json({ error: "Failed to transform image" });
    }
  });

  app.get("/api/image", async (req, res) => {
    try {
      // 캐싱 방지 헤더 추가
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      // 현재 로그인한 사용자 정보 확인
      const user = req.user;
      const userId = user?.id;
      
      // 페이지네이션 처리를 위한 파라미터 추출
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // 사용자 ID로 이미지 필터링 여부 설정
      const filterByUser = req.query.filterByUser === 'true';
      
      if (user && filterByUser) {
        console.log(`[이미지 탭] 사용자 ${user.username}`);
      } else {
        console.log(`[이미지 탭] 사용자 필터링 없음 (전체 이미지 표시)`);
      }
      
      // 데이터베이스 수준에서 페이지네이션 적용하여 데이터 가져오기
      // 로그인 상태이고 사용자 필터링이 활성화된 경우에만 사용자 정보로 필터링
      const result = await storage.getPaginatedImageList(
        page, 
        limit, 
        (user && filterByUser) ? userId : null,
        (user && filterByUser) ? user.username : null
      );
      
      // 전체 이미지 수 로그 출력
      console.log(`전체 이미지 ${result.pagination.total}개 로드됨`);
      
      // 결과 반환
      return res.json(result);
    } catch (error) {
      console.error("Error fetching image list:", error);
      return res.status(500).json({ error: "Failed to fetch image list" });
    }
  });
  
  // 최근 이미지만 가져오는 API (사용자 메모리 컬렉션용)
  app.get("/api/image/recent", async (req, res) => {
    try {
      // 캐싱 방지 헤더 추가
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      // 현재 로그인한 사용자 정보 확인
      const user = req.user;
      const userId = user?.id;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // 사용자 ID로 이미지 필터링 여부 설정
      const filterByUser = req.query.filterByUser !== 'false';
      
      if (user && filterByUser) {
        console.log(`[최근 이미지 API] 사용자 ${user.username}의 이미지만 필터링`);
      } else {
        console.log(`[최근 이미지 API] 사용자 필터링 없음 (전체 이미지 표시)`);
      }
      
      // 페이지네이션 적용하여 데이터베이스에서 최근 이미지 가져오기
      // 로그인 상태이고 사용자 필터링이 활성화된 경우에만 사용자 정보로 필터링
      const result = await storage.getPaginatedImageList(
        1, // 첫 페이지 
        limit, 
        (user && filterByUser) ? userId : null,
        (user && filterByUser) ? user.username : null
      );
      
      // 1시간 이내 생성된 이미지만 필터링 (사용자에게 보여줄 이미지)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1시간 전 타임스탬프
      
      const recentImages = result.images
        .filter(img => {
          // createdAt이 1시간 이내인 이미지만 포함
          const createTime = new Date(img.createdAt);
          return createTime > oneHourAgo;
        });
      
      console.log(`최근 이미지 API: 전체 ${result.images.length}개 중 1시간 이내 이미지 ${recentImages.length}개 반환`);
      
      return res.json(recentImages);
    } catch (error) {
      console.error("Error fetching recent images:", error);
      return res.status(500).json({ error: "Failed to fetch recent images" });
    }
  });

  // Image generation endpoint (using OpenAI DALL-E)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const validatedData = imageGenerationSchema.parse(req.body);
      const { style } = req.body; // 스타일 옵션 추가 (선택사항)
      
      // OpenAI DALL-E 3를 사용하여 이미지 생성
      try {
        console.log("Generating image with OpenAI DALL-E 3");
        const { generateImage } = await import('./services/openai-dalle3');
        
        // 스타일 정보가 있으면 프롬프트에 반영
        let enhancedPrompt = validatedData.prompt;
        if (style) {
          enhancedPrompt = `${validatedData.prompt} (in ${style} style)`;
        }
        
        const imageUrl = await generateImage(enhancedPrompt);
        
        return res.status(200).json({ 
          imageUrl,
          prompt: enhancedPrompt,
          provider: "openai"
        });
      } catch (openaiError) {
        console.error("Error with DALL-E:", openaiError);
        
        // DALL-E 실패 시 서비스 종료 메시지 반환
        console.log("DALL-E service unavailable");
        return res.status(503).json({ 
          imageUrl: "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다",
          prompt: validatedData.prompt,
          provider: "none",
          error: "이미지생성 서비스가 금일 종료되었습니다"
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating image:", error);
      return res.status(500).json({ 
        error: "Failed to generate image", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Chat endpoints
  app.post("/api/chat/message", async (req, res) => {
    try {
      const validatedData = chatMessageSchema.parse(req.body);
      
      // Check if this is an ephemeral request
      const isEphemeral = req.query.ephemeral === 'true';
      
      let userMessage, assistantMessage;
      
      // Generate AI response with persona's system prompt if provided
      const aiResponse = await generateChatResponse(
        validatedData.message,
        validatedData.personaSystemPrompt
      );
      
      if (isEphemeral) {
        // For ephemeral messages, we don't save to database
        // Just create response objects with the content
        userMessage = {
          id: Date.now(),
          role: "user",
          content: validatedData.message,
          createdAt: new Date().toISOString(),
        };
        
        assistantMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: aiResponse,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Save user message
        userMessage = await storage.saveUserMessage(validatedData.message);
        
        // Save AI response
        assistantMessage = await storage.saveAssistantMessage(aiResponse);
      }
      
      return res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error sending chat message:", error);
      return res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    try {
      const chatHistory = await storage.getChatHistory();
      return res.json(chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      return res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Gallery endpoints
  app.get("/api/gallery", async (req, res) => {
    try {
      // 요청 시작 시간 기록 (성능 측정용)
      const startTime = Date.now();
      
      // 로그인 체크 - 갤러리는 로그인 없이도 조회 가능하게 변경
      // 로그인한 경우 사용자별 필터링, 로그인하지 않은 경우 모든 갤러리 항목 표시
      const user = req.user;
      const userId = user ? user.id : null;
      const username = user ? user.username : null;
      
      // 로그인 상태 로깅
      console.log(`갤러리 API 요청 - 로그인 상태: ${!!user}, 사용자 ID: ${userId}, 사용자명: ${username || '없음'}`);
      
      // 필터링 옵션
      const filter = req.query.filter as string | undefined;
      const usernameFilter = req.query.username as string | undefined;
      let galleryItems = [];
      
      // 사용자명 필터 우선 적용 (관리자 기능 대비)
      if (usernameFilter) {
        console.log(`사용자명 필터 적용: ${usernameFilter}`);
      }
      
      // 로그에 사용자 정보 출력
      console.log(`갤러리 항목 로딩 - 사용자: ${username} (ID: ${userId})`);
      
      // 일시적 해결책: 한글 인코딩 수정을 위한 유틸리티 함수 import
      const { decodeKoreanInObject, decodeKoreanText } = await import('./utils');
      
      // 사용자 ID로 필터링 추가 (임시: 사용자 구분 기능이 완전히 구현될 때까지 간단한 솔루션)
      if (filter === "chat") {
        // 채팅 데이터 - 직접 쿼리로 조회 (사용자 필터링 추가)
        // 로그인 상태와 관계 없이 모든 채팅을 가져온 후 클라이언트에서 필터링
        const chatQuery = db.select({
          id: savedChats.id,
          title: savedChats.title,
          personaEmoji: savedChats.personaEmoji,
          createdAt: savedChats.createdAt
        })
        .from(savedChats)
        .orderBy(desc(savedChats.createdAt))
        .limit(100); // 더 많은 항목을 가져온 후 필터링
        
        // 쿼리 실행
        const allChatItems = await chatQuery;
        
        // 로그인한 경우 클라이언트에서 사용자별 필터링을 위한 정보 추가
        const chatItems = userId 
          ? allChatItems.filter(chat => {
              // 현재는 필터링 기준이 없으므로 모든 항목 표시
              // 향후 대화 내용이나 제목에 사용자 정보가 포함되면 필터링 가능
              return true;
            })
          : allChatItems.slice(0, 5); // 로그인하지 않은 경우 5개만 표시
        
        console.log(`채팅 항목 조회 결과: ${chatItems.length}개, 로그인 상태: ${!!userId}`);
        
        galleryItems = chatItems.map(chat => ({
          id: chat.id,
          title: decodeKoreanText(chat.title || '저장된 대화'),
          type: "chat" as const,
          url: `/chat?id=${chat.id}`,
          createdAt: chat.createdAt.toISOString(),
          isFavorite: false,
          personaEmoji: chat.personaEmoji || '💬',
          userId: userId, // 현재 로그인한 사용자 ID 사용
          isOwner: true // 임시로 모든 사용자가 소유한 것처럼 표시
        }));
      } else if (filter === "music") {
        // 음악 필터링
        const musicItems = await storage.getMusicList();
        // 임시: 로그인한 사용자의 음악으로 가정
        // 실제 사용자 데이터가 있으면 아래 주석 해제
        // const userMusicItems = musicItems.filter(item => item.userId === userId);
        const userMusicItems = musicItems.slice(0, 5); // 임시: 최근 5개만 표시
        
        // 한글 디코딩 적용
        galleryItems = userMusicItems.map(item => ({
          ...item,
          title: decodeKoreanText(item.title)
          // userId 필드 임시 제거 - 데이터베이스 스키마 업데이트 전까지
        }));
      } else if (filter === "image") {
        try {
          // 이미지 탭에서 사용자별 필터링 구현
          console.log(`[이미지 탭] 사용자 ID: ${userId}, 이름: ${username || '없음'}`);
          
          // 통합된 getPaginatedImageList 함수 사용
          const imageResult = await storage.getPaginatedImageList(
            1, // 첫 페이지
            100, // 충분히 많은 수량 (하지만 너무 많으면 성능에 영향)
            userId, // 사용자 ID
            username // 사용자 이름 (필터링용)
          );
          
          // 결과 필터링 없이 바로 사용
          let filteredImages = imageResult.images;
          
          console.log(`[갤러리 API] 이미지 탭: ${filteredImages.length}개 이미지 로드됨`);
          
          // 결과가 없는 경우 메시지 준비
          if (filteredImages.length === 0) {
            console.log(`[갤러리 API] 사용자 ${username}의 이미지가 없습니다.`);
          }
          
          // 필터링된 이미지 변환
          galleryItems = filteredImages.map(item => {
            // 한글 디코딩 더 강화하여 적용
            const decodedTitle = decodeKoreanText(item.title || '');
            
            // 메타데이터 파싱
            let metaUserId = null;
            let metaUsername = null;
            if (item.metadata) {
              try {
                const meta = JSON.parse(item.metadata);
                metaUserId = meta.userId;
                metaUsername = meta.username;
              } catch (e) {
                // 파싱 오류는 무시
              }
            }
            
            console.log(`이미지 항목: ID=${item.id}, 제목=${decodedTitle}, 메타데이터 사용자 ID=${metaUserId}, 메타데이터 사용자명=${metaUsername}`);
            
            return {
              id: item.id,
              title: decodedTitle,
              type: "image" as const,
              url: item.transformedUrl,
              thumbnailUrl: item.transformedUrl,
              createdAt: item.createdAt.toISOString(),
              isFavorite: false,
              userId: metaUserId, // 메타데이터에서 추출한 사용자 ID 추가
              isOwner: userId === metaUserId // 현재 로그인한 사용자가 소유자인지 여부
            };
          });
          
          console.log(`갤러리에 표시할 이미지 ${galleryItems.length}개 준비됨`);
        } catch (imageError) {
          console.error("이미지 데이터 조회 중 오류:", imageError);
          galleryItems = [];
        }
      } else if (filter === "favorite") {
        // 즐겨찾기 필터링 (사용자별)
        const username = req.user?.username;
        console.log(`[즐겨찾기 필터] 사용자 ${username || '없음'} 필터링 적용`);
        
        // 사용자 이름으로 필터링된 즐겨찾기 목록 가져오기
        const favoriteItems = await storage.getFavoriteItems(username);
        
        // 한글 디코딩 적용
        galleryItems = favoriteItems.map(item => {
          // decodeKoreanInObject 대신 decodeKoreanText 사용하여 통일
          const decodedTitle = decodeKoreanText(typeof item.title === 'string' ? item.title : '');
          console.log(`즐겨찾기 항목 디코딩 전: ${item.title}, 디코딩 후: ${decodedTitle}`);
          return {
            ...item,
            title: decodedTitle
            // userId 필드 임시 제거 - 데이터베이스 스키마 업데이트 전까지
          };
        });
      } else {
        // 전체 컨텐츠 필터링 - 사용자별 컨텐츠 관리 개선
        try {
          // 타입 명시적 선언으로 오류 해결
          let processedItems: Array<{
            id: number;
            title: string;
            type: "music" | "image" | "chat";
            url: string;
            thumbnailUrl?: string;
            duration?: number;
            createdAt: string;
            isFavorite: boolean;
            personaEmoji?: string;
          }> = [];
          const username = req.user?.username;
          
          // 음악 항목 (공유 - 모든 사용자 음악)
          try {
            const musicItems = await db.select({
              id: music.id,
              title: music.title,
              url: music.url,
              duration: music.duration,
              createdAt: music.createdAt
            })
            .from(music)
            .orderBy(desc(music.createdAt))
            .limit(3);
            
            const formattedMusicItems = musicItems.map(item => {
              // decodeKoreanInObject 대신 decodeKoreanText 사용하여 통일
              const decodedTitle = decodeKoreanText(typeof item.title === 'string' ? item.title : '');
              console.log(`음악 항목 디코딩 전: ${item.title}, 디코딩 후: ${decodedTitle}`);
              return {
                id: item.id,
                title: decodedTitle,
                type: "music" as const,
                url: item.url,
                duration: item.duration,
                createdAt: item.createdAt.toISOString(),
                isFavorite: false,
                userId: null, // TODO: 음악에도 사용자 ID 필드 추가 필요
                isOwner: userId ? true : false // 현재는 모든 음악이 현재 사용자의 것으로 간주
              };
            });
            
            processedItems = [...processedItems, ...formattedMusicItems];
          } catch (musicError) {
            console.error("음악 조회 오류:", musicError);
          }
          
          // 이미지 항목 (통합된 사용자별 필터링)
          try {
            console.log(`[갤러리 API] 전체 컨텐츠: 사용자 ID: ${userId}, 이름: ${username || '없음'}`);
            
            // 통합된 getPaginatedImageList 함수 사용
            const imageResult = await storage.getPaginatedImageList(
              1, // 첫 페이지
              10, // 최대 10개만 표시
              userId, // 사용자 ID
              username // 사용자 이름 (필터링용)
            );
            
            // 결과 바로 사용
            let filteredImages = imageResult.images;
            
            console.log(`[갤러리 API] 전체 탭: ${filteredImages.length}개 이미지 로드됨`);
            
            if (filteredImages.length > 0) {
              // 이미지를 갤러리 형식으로 변환
              const formattedImageItems = filteredImages.map(item => {
                // 한글 디코딩 더 강화하여 적용
                const decodedTitle = decodeKoreanText(item.title || '');
                
                // 메타데이터 파싱
                let metaUserId = null;
                let metaUsername = null;
                if (item.metadata) {
                  try {
                    const meta = JSON.parse(item.metadata);
                    metaUserId = meta.userId;
                    metaUsername = meta.username;
                  } catch (e) {
                    // 파싱 오류는 무시
                  }
                }
                
                // 현재 로그인 사용자와 연관된 이미지인지 확인
                const isUserImage = (metaUserId && metaUserId === userId) || 
                                   (metaUsername && metaUsername === username);
                                   
                if (isUserImage) {
                  console.log(`사용자 소유 이미지 발견: ID=${item.id}, 제목=${decodedTitle}`);
                }
                
                return {
                  id: item.id,
                  title: decodedTitle,
                  type: "image" as const,
                  url: item.transformedUrl,
                  thumbnailUrl: item.transformedUrl,
                  createdAt: item.createdAt.toISOString(),
                  isFavorite: false,
                  userId: metaUserId, // 메타데이터에서 추출한 사용자 ID 추가
                  isOwner: isUserImage // 소유 여부 표시
                };
              });
              
              processedItems = [...processedItems, ...formattedImageItems];
              console.log(`갤러리에 이미지 ${formattedImageItems.length}개 추가됨`);
            } else {
              console.log("이미지가 없습니다");
            }
          } catch (imageError) {
            console.error("이미지 조회 오류:", imageError);
          }
          
          // 채팅 항목 (공유 - 모든 사용자 채팅)
          try {
            // 직접 쿼리를 사용하여 savedChats에서 데이터 조회
            const chatItems = await db.select({
              id: savedChats.id,
              title: savedChats.title,
              personaEmoji: savedChats.personaEmoji,
              createdAt: savedChats.createdAt
            })
            .from(savedChats)
            .orderBy(desc(savedChats.createdAt))
            .limit(3);
            
            const formattedChatItems = chatItems.map(chat => {
              // decodeKoreanInObject 대신 decodeKoreanText 사용하여 통일
              const decodedTitle = decodeKoreanText(typeof chat.title === 'string' ? chat.title : '저장된 대화');
              console.log(`채팅 항목 디코딩 전: ${chat.title}, 디코딩 후: ${decodedTitle}`);
              return {
                id: chat.id,
                title: decodedTitle,
                type: "chat" as const,
                url: `/chat?id=${chat.id}`,
                createdAt: chat.createdAt.toISOString(),
                isFavorite: false,
                personaEmoji: chat.personaEmoji || '💬'
              };
            });
            
            processedItems = [...processedItems, ...formattedChatItems];
          } catch (chatError) {
            console.error("채팅 조회 오류:", chatError);
          }
          
          // 결과 정렬
          galleryItems = processedItems.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        } catch (allError) {
          console.error("전체 항목 조회 오류:", allError);
          galleryItems = [];
        }
      }
      
      // 결과 반환 전 처리 시간 계산 및 메타데이터 추가
      const processingTime = Date.now() - startTime;
      
      // 디버깅 정보 추가
      console.log(`갤러리 API 응답 준비 완료 - ${galleryItems.length}개 항목, 처리 시간: ${processingTime}ms`);
      
      // 응답에 메타데이터 포함
      return res.json({
        items: galleryItems,
        meta: {
          filter: filter || 'all',
          count: galleryItems.length,
          userId: userId,
          username: username,
          processingTimeMs: processingTime
        }
      });
    } catch (error) {
      console.error("Error fetching gallery items:", error);
      return res.status(500).json({ error: "Failed to fetch gallery items" });
    }
  });

  app.post("/api/gallery/favorite", async (req, res) => {
    try {
      const validatedData = favoriteToggleSchema.parse(req.body);
      
      const updated = await storage.toggleFavorite(
        validatedData.itemId,
        validatedData.type
      );
      
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error toggling favorite:", error);
      return res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  // Media management endpoints
  // OPTIONS 요청을 위한 헤더 추가
  app.options("/api/media/download/:type/:id", (req, res) => {
    res.header('Allow', 'GET, HEAD, OPTIONS');
    res.status(200).end();
  });
  
  // HEAD 요청 처리 추가 (다운로드 검증용)
  app.head("/api/media/download/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      const parsedId = parseInt(id);
      
      if (type !== "music" && type !== "image") {
        return res.status(400).end();
      }
      
      // 세션 이미지 확인 또는 DB 조회
      let url = '';
      let contentType = '';
      
      if (type === "image" && parsedId === -1 && req.session && req.session.tempImage) {
        url = req.session.tempImage.transformedUrl;
        contentType = 'image/jpeg';
        
        // 로컬 파일이 있으면 성공 응답
        if (req.session.tempImage.localFilePath && fs.existsSync(req.session.tempImage.localFilePath)) {
          res.setHeader('Content-Type', contentType);
          return res.status(200).end();
        }
      } else {
        // DB 조회
        const mediaItem = await storage.getMediaItem(parsedId, type);
        if (!mediaItem) {
          return res.status(404).end();
        }
        
        if (type === "music") {
          url = (mediaItem as typeof music.$inferSelect).url;
          contentType = 'audio/mpeg';
        } else {
          url = (mediaItem as typeof images.$inferSelect).transformedUrl;
          contentType = 'image/jpeg';
          
          // 로컬 파일 확인
          const urlBasename = path.basename(url);
          const possibleLocalPaths = [
            path.join(process.cwd(), 'uploads', urlBasename),
            path.join(process.cwd(), 'uploads', 'temp', urlBasename)
          ];
          
          for (const localPath of possibleLocalPaths) {
            if (fs.existsSync(localPath)) {
              res.setHeader('Content-Type', contentType);
              return res.status(200).end();
            }
          }
        }
      }
      
      // 로컬 파일이 없는 경우 원격 URL 확인
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'Accept': 'image/*,audio/*,*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          return res.status(502).json({ 
            error: "원격 서버에서 파일을 찾을 수 없습니다",
            url: url
          });
        }
        
        // 성공 시 컨텐츠 타입 설정
        res.setHeader('Content-Type', response.headers.get('content-type') || contentType);
        return res.status(200).end();
      } catch (error) {
        return res.status(502).json({ 
          error: "원격 URL에 접근할 수 없습니다",
          url: url,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error in HEAD request:", error);
      return res.status(500).end();
    }
  });
  
  // GET 요청 처리 (실제 다운로드)
  app.get("/api/media/download/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      const parsedId = parseInt(id);
      
      // CORS 헤더 추가
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
      
      if (type !== "music" && type !== "image") {
        return res.status(400).json({ error: "Invalid media type" });
      }
      
      // 임시 이미지 처리 (-1 ID인 경우 임시 캐시에서 찾기)
      let url = '';
      let filename = '';
      let mediaItem;
      
      // 세션에서 임시 이미지 확인 (ID가 -1인 경우)
      if (type === "image" && parsedId === -1 && req.session && req.session.tempImage) {
        console.log("임시 이미지 다운로드 요청 처리 중:", req.session.tempImage.title);
        
        // 로컬 파일 경로가 있으면 직접 파일을 읽어서 반환
        if (req.session.tempImage.localFilePath) {
          try {
            console.log(`로컬 파일에서 읽기: ${req.session.tempImage.localFilePath}`);
            const imageBuffer = fs.readFileSync(req.session.tempImage.localFilePath);
            filename = `${req.session.tempImage.title || 'transformed_image'}.jpg`;
            
            // 응답 헤더 설정
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            
            // 파일 데이터 전송
            return res.send(imageBuffer);
          } catch (fileError) {
            console.error('로컬 파일 읽기 실패:', fileError);
            // 파일 읽기 실패 시 원래 URL 사용
            url = req.session.tempImage.transformedUrl;
            filename = `${req.session.tempImage.title || 'transformed_image'}.jpg`;
          }
        } else {
          // 기존 방식으로 URL에서 읽기
          url = req.session.tempImage.transformedUrl;
          filename = `${req.session.tempImage.title || 'transformed_image'}.jpg`;
        }
      } else {
        // 정상적인 데이터베이스 조회
        try {
          mediaItem = await storage.getMediaItem(parsedId, type);
          
          if (!mediaItem) {
            return res.status(404).json({ error: "Media not found" });
          }
          
          if (type === "music") {
            const musicItem = mediaItem as typeof music.$inferSelect;
            url = musicItem.url;
            filename = `${musicItem.title || 'music'}.mp3`;
          } else {
            const imageItem = mediaItem as typeof images.$inferSelect;
            url = imageItem.transformedUrl;
            filename = `${imageItem.title || 'transformed_image'}.jpg`;
            
            // uploads 폴더 내에 이미지 파일이 존재하는지 확인
            const urlBasename = path.basename(imageItem.transformedUrl);
            const possibleLocalPaths = [
              path.join(process.cwd(), 'uploads', urlBasename),
              path.join(process.cwd(), 'uploads', 'temp', urlBasename)
            ];
            
            for (const localPath of possibleLocalPaths) {
              if (fs.existsSync(localPath)) {
                console.log(`로컬에서 이미지 파일 찾음: ${localPath}`);
                try {
                  const imageBuffer = fs.readFileSync(localPath);
                  // 응답 헤더 설정
                  res.setHeader('Content-Type', 'image/jpeg');
                  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
                  // 파일 데이터 전송
                  return res.send(imageBuffer);
                } catch (fileError) {
                  console.error('로컬 파일 읽기 실패:', fileError);
                  // 파일 읽기 실패 시 계속 진행 (원격 URL 시도)
                  break;
                }
              }
            }
          }
        } catch (dbError) {
          console.error("DB에서 미디어 조회 실패:", dbError);
          return res.status(500).json({ error: "데이터베이스 조회 실패", message: dbError instanceof Error ? dbError.message : String(dbError) });
        }
      }
      
      // 이미지 없이 바로 클라이언트에게 URL 반환하는 방식으로 변경
      if (url) {
        // URL이 로컬 파일 경로인 경우, 해당 파일 직접 전송
        if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
          try {
            // 로컬 파일 존재 확인
            if (fs.existsSync(url)) {
              const fileBuffer = fs.readFileSync(url);
              const contentType = type === 'image' ? 'image/jpeg' : 'audio/mpeg';
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
              return res.send(fileBuffer);
            }
          } catch (localFileError) {
            console.error("로컬 파일 읽기 실패:", localFileError);
          }
        }

        // 안전한 URL 형식 확인
        if (!url.startsWith('http')) {
          url = `https://${url}`;
        }
        
        // URL이 placeholder인 경우 확인
        if (url.includes('placehold.co')) {
          return res.redirect(url);
        }
        
        console.log(`클라이언트에게 URL 전달: ${url}`);
        return res.json({
          success: true,
          url: url,
          filename: filename,
          message: "다운로드 URL입니다. 브라우저에서 이 URL을 열어주세요."
        });
      } else {
        return res.status(404).json({ error: "다운로드할 URL을 찾을 수 없습니다." });
      }
    } catch (error) {
      console.error("Error downloading media:", error);
      return res.status(500).json({ 
        error: "Failed to download media", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/media/share", async (req, res) => {
    try {
      console.log("미디어 공유 요청 수신:", req.body);
      const validatedData = mediaShareSchema.parse(req.body);
      
      // CORS 헤더 추가
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
      
      try {
        // 임시 이미지 처리 (ID가 -1인 경우)
        if (validatedData.type === 'image' && validatedData.id === -1 && req.session && req.session.tempImage) {
          console.log("임시 이미지 공유 시도:", req.session.tempImage.title);
          
          // 임시 이미지의 URL 생성
          let shareUrl = '';
          if (req.session.tempImage.localFilePath) {
            // 현재 도메인 기반으로 URL 생성
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const relativePath = req.session.tempImage.localFilePath.replace(process.cwd(), '');
            shareUrl = `${baseUrl}${relativePath.replace(/\\/g, '/').replace('/uploads', '/uploads')}`;
            console.log("임시 이미지 공유 URL 생성:", shareUrl);
            
            // URL이 올바른 형식인지 확인
            if (!shareUrl.includes('://')) {
              shareUrl = `${req.protocol}://${req.get('host')}${shareUrl.startsWith('/') ? '' : '/'}${shareUrl}`;
            }
            
            return res.json({ 
              shareUrl,
              message: "임시 이미지 URL이 생성되었습니다. 이 URL을 통해 미디어를 공유할 수 있습니다."
            });
          }
        }
        
        // 미디어 아이템 조회
        console.log(`미디어 조회 시도 - ID: ${validatedData.id}, 타입: ${validatedData.type}`);
        const mediaItem = await storage.getMediaItem(
          validatedData.id,
          validatedData.type
        );
        
        if (!mediaItem) {
          console.error(`미디어 항목을 찾을 수 없음 - ID: ${validatedData.id}, 타입: ${validatedData.type}`);
          return res.status(404).json({ 
            error: "Media not found",
            message: "공유할 미디어 항목을 찾을 수 없습니다."
          });
        }
        
        console.log("미디어 항목 찾음:", mediaItem);
        
        // 미디어 타입에 따라 URL 직접 반환
        let shareUrl = '';
        if (validatedData.type === 'image') {
          const imageItem = mediaItem as typeof images.$inferSelect;
          shareUrl = imageItem.transformedUrl;
          
          // URL이 로컬 파일 경로인 경우 웹 접근 가능한 URL로 변환
          if (!shareUrl.includes('://')) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            shareUrl = `${baseUrl}${shareUrl.startsWith('/') ? '' : '/'}${shareUrl}`;
          }
        } else if (validatedData.type === 'music') {
          const musicItem = mediaItem as typeof music.$inferSelect;
          shareUrl = musicItem.url;
          
          // URL이 로컬 파일 경로인 경우 웹 접근 가능한 URL로 변환
          if (!shareUrl.includes('://')) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            shareUrl = `${baseUrl}${shareUrl.startsWith('/') ? '' : '/'}${shareUrl}`;
          }
        }
        
        // URL이 있는 경우 직접 반환
        if (shareUrl) {
          return res.json({ 
            shareUrl,
            message: "미디어 URL이 생성되었습니다. 이 URL을 통해 미디어를 공유할 수 있습니다." 
          });
        }
        
        // 없는 경우에는 기존 로직 진행
        const shareLink = await storage.createShareLink(
          validatedData.id,
          validatedData.type
        );
        
        return res.json({ shareUrl: shareLink });
      } catch (lookupError) {
        console.error("미디어 조회 실패:", lookupError);
        return res.status(500).json({ 
          error: "Media lookup failed",
          message: "미디어 정보를 불러오는 데 실패했습니다." 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error sharing media:", error);
      return res.status(500).json({ error: "Failed to share media" });
    }
  });
  
  // Saved chat endpoints
  app.post("/api/chat/save", async (req, res) => {
    try {
      const validatedData = saveChatSchema.parse(req.body);
      
      // Save the chat to the database
      const savedChat = await storage.saveChat(validatedData);
      
      return res.status(201).json(savedChat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error saving chat:", error);
      return res.status(500).json({ error: "Failed to save chat" });
    }
  });
  
  app.get("/api/chat/saved", async (req, res) => {
    try {
      const savedChats = await storage.getSavedChats();
      return res.json(savedChats);
    } catch (error) {
      console.error("Error fetching saved chats:", error);
      return res.status(500).json({ error: "Failed to fetch saved chats" });
    }
  });
  
  app.get("/api/chat/saved/:id", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      if (isNaN(chatId)) {
        return res.status(400).json({ error: "Invalid chat ID" });
      }
      
      const savedChat = await storage.getSavedChat(chatId);
      
      if (!savedChat) {
        return res.status(404).json({ error: "Saved chat not found" });
      }
      
      return res.json(savedChat);
    } catch (error) {
      console.error("Error fetching saved chat:", error);
      return res.status(500).json({ error: "Failed to fetch saved chat" });
    }
  });
  
  app.delete("/api/chat/saved/:id", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      if (isNaN(chatId)) {
        return res.status(400).json({ error: "Invalid chat ID" });
      }
      
      const result = await storage.deleteSavedChat(chatId);
      return res.json(result);
    } catch (error) {
      console.error("Error deleting saved chat:", error);
      return res.status(500).json({ error: "Failed to delete saved chat" });
    }
  });
  
  // Milestone and Pregnancy Profile endpoints
  
  // Get or update the pregnancy profile
  app.get("/api/pregnancy-profile", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      
      // 인증 확인 - 인증되지 않은 경우에도 기본 페이지는 보여주되 프로필 생성을 유도
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      console.log(`[마일스톤] 프로필 조회 요청: 사용자 ID ${userId}`);
      
      const { getOrCreatePregnancyProfile } = await import("./services/milestones");
      const profile = await getOrCreatePregnancyProfile(userId);
      
      if (profile) {
        console.log(`[마일스톤] 프로필 발견: 임신 ${profile.currentWeek}주차, 출산예정일: ${profile.dueDate}`);
        return res.json(profile);
      } else {
        console.log(`[마일스톤] 프로필이 없음: 사용자 ID ${userId}`);
        return res.json({ error: "No profile found" });
      }
    } catch (error) {
      console.error("Error fetching pregnancy profile:", error);
      return res.status(500).json({ error: "Failed to fetch pregnancy profile" });
    }
  });
  
  app.post("/api/pregnancy-profile", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      
      // 인증 확인 - 인증되지 않은 경우에도 기본 페이지는 보여주되 프로필 생성을 유도
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      const { updatePregnancyProfile } = await import("./services/milestones");
      const profileData = req.body;
      
      // 로그 추가 - 데이터 확인
      console.log(`[마일스톤] 프로필 업데이트 요청: 사용자 ID ${userId}`);
      console.log(`[마일스톤] 출산예정일(원본): ${profileData.dueDate}`);
      
      // Ensure dueDate is a proper Date object if provided
      if (profileData.dueDate) {
        try {
          profileData.dueDate = new Date(profileData.dueDate);
          console.log(`[마일스톤] 출산예정일(변환): ${profileData.dueDate}`);
        } catch (err) {
          console.error(`[마일스톤] 출산예정일 변환 오류:`, err);
          return res.status(400).json({ error: "Invalid date format" });
        }
      }
      
      const profile = await updatePregnancyProfile(userId, profileData);
      
      if (!profile) {
        console.log(`[마일스톤] 프로필 업데이트 실패: 출산예정일 누락`);
        return res.status(400).json({ error: "Failed to update profile - dueDate is required" });
      }
      
      console.log(`[마일스톤] 프로필 업데이트 성공: 임신 ${profile.currentWeek}주차, 출산예정일: ${profile.dueDate}`);
      return res.json(profile);
    } catch (error) {
      console.error("Error updating pregnancy profile:", error);
      return res.status(500).json({ error: "Failed to update pregnancy profile" });
    }
  });
  
  // Milestone endpoints
  app.get("/api/milestones", async (req, res) => {
    try {
      const { getAllMilestones } = await import("./services/milestones");
      const milestones = await getAllMilestones();
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      return res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });
  
  app.get("/api/milestones/available", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      console.log(`[마일스톤] 가능한 마일스톤 조회: 사용자 ID ${userId}`);
      
      const { getAvailableMilestones } = await import("./services/milestones");
      const milestones = await getAvailableMilestones(userId);
      
      console.log(`[마일스톤] 가능한 마일스톤 ${milestones.length}개 조회됨`);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching available milestones:", error);
      return res.status(500).json({ error: "Failed to fetch available milestones" });
    }
  });
  
  app.get("/api/milestones/completed", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      console.log(`[마일스톤] 완료된 마일스톤 조회: 사용자 ID ${userId}`);
      
      const { getUserCompletedMilestones } = await import("./services/milestones");
      const milestones = await getUserCompletedMilestones(userId);
      
      console.log(`[마일스톤] 완료된 마일스톤 ${milestones.length}개 조회됨`);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching completed milestones:", error);
      return res.status(500).json({ error: "Failed to fetch completed milestones" });
    }
  });
  
  app.post("/api/milestones/:milestoneId/complete", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      const { milestoneId } = req.params;
      const { notes } = req.body;
      // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
      
      console.log(`[마일스톤] 마일스톤 완료 처리: 사용자 ID ${userId}, 마일스톤 ID ${milestoneId}`);
      
      const { completeMilestone } = await import("./services/milestones");
      const result = await completeMilestone(userId, milestoneId, notes);
      
      console.log(`[마일스톤] 마일스톤 완료 처리 결과:`, result ? "성공" : "실패");
      return res.json(result);
    } catch (error) {
      console.error("Error completing milestone:", error);
      return res.status(500).json({ error: "Failed to complete milestone" });
    }
  });
  
  app.get("/api/milestones/stats", async (req, res) => {
    try {
      // 로그인한 사용자 정보 가져오기
      const user = req.user;
      const userId = user?.id || 1; // 로그인이 안 된 경우 기본값 사용 (개발용)
      
      console.log(`[마일스톤] 성취 통계 조회: 사용자 ID ${userId}`);
      
      const { getUserAchievementStats } = await import("./services/milestones");
      const stats = await getUserAchievementStats(userId);
      
      console.log(`[마일스톤] 성취 통계 조회 결과: 완료 ${stats.totalCompleted}/${stats.totalAvailable} (${Math.round(stats.completionRate)}%)`);
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching achievement stats:", error);
      return res.status(500).json({ error: "Failed to fetch achievement stats" });
    }
  });

  // Admin-only persona management endpoints
  // Note: In a production app, these would need authentication/authorization
  
  // Get all personas
  app.get("/api/admin/personas", async (req, res) => {
    try {
      const allPersonas = await db.query.personas.findMany({
        orderBy: (personas, { asc }) => [asc(personas.order)]
      });
      return res.json(allPersonas);
    } catch (error) {
      console.error("Error fetching personas:", error);
      return res.status(500).json({ error: "Failed to fetch personas" });
    }
  });
  
  // Get a specific persona
  app.get("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      const persona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!persona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      return res.json(persona);
    } catch (error) {
      console.error("Error fetching persona:", error);
      return res.status(500).json({ error: "Failed to fetch persona" });
    }
  });
  
  // Create a new persona
  app.post("/api/admin/personas", async (req, res) => {
    try {
      const validatedData = personaSchema.parse(req.body);
      
      // Check if persona with this ID already exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, validatedData.personaId)
      });
      
      if (existingPersona) {
        return res.status(409).json({ error: "A persona with this ID already exists" });
      }
      
      // Insert new persona
      const [newPersona] = await db.insert(personas).values({
        personaId: validatedData.personaId,
        name: validatedData.name,
        avatarEmoji: validatedData.avatarEmoji,
        description: validatedData.description,
        welcomeMessage: validatedData.welcomeMessage,
        systemPrompt: validatedData.systemPrompt,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        personality: validatedData.personality,
        tone: validatedData.tone,
        usageContext: validatedData.usageContext,
        emotionalKeywords: validatedData.emotionalKeywords,
        timeOfDay: validatedData.timeOfDay,
        isActive: validatedData.isActive,
        isFeatured: validatedData.isFeatured,
        order: validatedData.order,
        categories: validatedData.categories,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newPersona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating persona:", error);
      return res.status(500).json({ error: "Failed to create persona" });
    }
  });
  
  // Update an existing persona
  app.put("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      const validatedData = personaSchema.parse(req.body);
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Update persona
      const [updatedPersona] = await db.update(personas)
        .set({
          personaId: validatedData.personaId,
          name: validatedData.name,
          avatarEmoji: validatedData.avatarEmoji,
          description: validatedData.description,
          welcomeMessage: validatedData.welcomeMessage,
          systemPrompt: validatedData.systemPrompt,
          primaryColor: validatedData.primaryColor,
          secondaryColor: validatedData.secondaryColor,
          personality: validatedData.personality,
          tone: validatedData.tone,
          usageContext: validatedData.usageContext,
          emotionalKeywords: validatedData.emotionalKeywords,
          timeOfDay: validatedData.timeOfDay,
          isActive: validatedData.isActive,
          isFeatured: validatedData.isFeatured,
          order: validatedData.order,
          categories: validatedData.categories,
          updatedAt: new Date(),
        })
        .where(eq(personas.personaId, personaId))
        .returning();
      
      return res.json(updatedPersona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating persona:", error);
      return res.status(500).json({ error: "Failed to update persona" });
    }
  });
  
  // Delete a persona
  app.delete("/api/admin/personas/:id", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Delete persona
      await db.delete(personas).where(eq(personas.personaId, personaId));
      
      return res.json({ success: true, message: "Persona deleted successfully" });
    } catch (error) {
      console.error("Error deleting persona:", error);
      return res.status(500).json({ error: "Failed to delete persona" });
    }
  });
  
  // Batch import personas (admin-only)
  app.post("/api/admin/personas/batch", async (req, res) => {
    try {
      // Parse as array of persona objects
      const personaBatchSchema = z.array(personaSchema);
      const personaList = personaBatchSchema.parse(req.body);
      
      const results = [];
      const actions = [];
      
      // Process each persona in the batch
      for (const validatedData of personaList) {
        try {
          // Check if persona with this ID already exists
          const existingPersona = await db.query.personas.findFirst({
            where: eq(personas.personaId, validatedData.personaId)
          });
          
          let result;
          let action;
          
          if (existingPersona) {
            // Update existing persona
            const [updatedPersona] = await db.update(personas)
              .set({
                name: validatedData.name,
                avatarEmoji: validatedData.avatarEmoji,
                description: validatedData.description,
                welcomeMessage: validatedData.welcomeMessage,
                systemPrompt: validatedData.systemPrompt,
                primaryColor: validatedData.primaryColor,
                secondaryColor: validatedData.secondaryColor,
                personality: validatedData.personality,
                tone: validatedData.tone,
                usageContext: validatedData.usageContext,
                emotionalKeywords: validatedData.emotionalKeywords,
                timeOfDay: validatedData.timeOfDay,
                isActive: validatedData.isActive,
                isFeatured: validatedData.isFeatured,
                order: validatedData.order,
                categories: validatedData.categories,
                updatedAt: new Date(),
              })
              .where(eq(personas.personaId, validatedData.personaId))
              .returning();
              
            result = updatedPersona;
            action = 'updated';
          } else {
            // Create new persona
            const [newPersona] = await db.insert(personas).values({
              personaId: validatedData.personaId,
              name: validatedData.name,
              avatarEmoji: validatedData.avatarEmoji,
              description: validatedData.description,
              welcomeMessage: validatedData.welcomeMessage,
              systemPrompt: validatedData.systemPrompt,
              primaryColor: validatedData.primaryColor,
              secondaryColor: validatedData.secondaryColor,
              personality: validatedData.personality,
              tone: validatedData.tone,
              usageContext: validatedData.usageContext,
              emotionalKeywords: validatedData.emotionalKeywords,
              timeOfDay: validatedData.timeOfDay,
              isActive: validatedData.isActive,
              isFeatured: validatedData.isFeatured,
              order: validatedData.order,
              useCount: 0,
              categories: validatedData.categories,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            
            result = newPersona;
            action = 'created';
          }
          
          results.push(result);
          actions.push(action);
        } catch (error) {
          console.error(`Error processing persona ${validatedData.personaId}:`, error);
          // Continue processing the rest of the batch even if one fails
          results.push({ error: `Failed to process persona ${validatedData.personaId}` });
          actions.push('failed');
        }
      }
      
      return res.status(201).json({
        success: true,
        count: results.length,
        created: actions.filter(a => a === 'created').length,
        updated: actions.filter(a => a === 'updated').length,
        failed: actions.filter(a => a === 'failed').length,
        results
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error in batch import:", error);
      return res.status(500).json({ error: "Failed to process personas in batch import" });
    }
  });
  
  // Admin-only persona category management endpoints
  
  // Get all categories
  app.get("/api/admin/categories", async (req, res) => {
    try {
      const allCategories = await db.query.personaCategories.findMany({
        orderBy: (personaCategories, { asc }) => [asc(personaCategories.order)]
      });
      return res.json(allCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  
  // Get a specific category
  app.get("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const category = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.status(500).json({ error: "Failed to fetch category" });
    }
  });
  
  // Create a new category
  app.post("/api/admin/categories", async (req, res) => {
    try {
      const validatedData = personaCategorySchema.parse(req.body);
      
      // Check if category with this ID already exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, validatedData.categoryId)
      });
      
      if (existingCategory) {
        return res.status(409).json({ error: "A category with this ID already exists" });
      }
      
      // Insert new category
      const [newCategory] = await db.insert(personaCategories).values({
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        description: validatedData.description,
        emoji: validatedData.emoji,
        order: validatedData.order,
        isActive: validatedData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating category:", error);
      return res.status(500).json({ error: "Failed to create category" });
    }
  });
  
  // Update an existing category
  app.put("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const validatedData = personaCategorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Update category
      const [updatedCategory] = await db.update(personaCategories)
        .set({
          categoryId: validatedData.categoryId,
          name: validatedData.name,
          description: validatedData.description,
          emoji: validatedData.emoji,
          order: validatedData.order,
          isActive: validatedData.isActive,
          updatedAt: new Date(),
        })
        .where(eq(personaCategories.categoryId, categoryId))
        .returning();
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating category:", error);
      return res.status(500).json({ error: "Failed to update category" });
    }
  });
  
  // Delete a category
  app.delete("/api/admin/categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const existingCategory = await db.query.personaCategories.findFirst({
        where: eq(personaCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Delete category
      await db.delete(personaCategories).where(eq(personaCategories.categoryId, categoryId));
      
      return res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ error: "Failed to delete category" });
    }
  });
  
  // API to increment usage count for a persona (for recommendation engine)
  app.post("/api/personas/:id/use", async (req, res) => {
    try {
      const personaId = req.params.id;
      
      // Check if persona exists
      const existingPersona = await db.query.personas.findFirst({
        where: eq(personas.personaId, personaId)
      });
      
      if (!existingPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      // Increment use count
      const [updatedPersona] = await db.update(personas)
        .set({
          useCount: (existingPersona.useCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(personas.personaId, personaId))
        .returning();
      
      return res.json({ success: true, useCount: updatedPersona.useCount });
    } catch (error) {
      console.error("Error incrementing persona use count:", error);
      return res.status(500).json({ error: "Failed to increment persona use count" });
    }
  });
  
  // API to recommend personas based on various factors
  app.get("/api/personas/recommend", async (req, res) => {
    try {
      // Get query parameters
      const timeOfDay = req.query.timeOfDay as string || 
                        (() => {
                          const hour = new Date().getHours();
                          if (hour >= 5 && hour < 12) return "morning";
                          if (hour >= 12 && hour < 17) return "afternoon";
                          if (hour >= 17 && hour < 21) return "evening";
                          return "night";
                        })();
      
      // Get emotion keywords from query if provided
      const emotions = req.query.emotions 
                      ? (req.query.emotions as string).split(',') 
                      : [];
      
      // Get all active personas
      const allPersonas = await db.query.personas.findMany({
        where: eq(personas.isActive, true)
      });
      
      // Score each persona based on recommendation factors
      const scoredPersonas = allPersonas.map(persona => {
        let score = 0;
        
        // Factor 1: Time of day match
        if (persona.timeOfDay === timeOfDay || persona.timeOfDay === "all") {
          score += 10;
        }
        
        // Factor 2: Emotional keyword match
        const personaEmotions = persona.emotionalKeywords as string[] || [];
        emotions.forEach(emotion => {
          if (personaEmotions.includes(emotion)) {
            score += 5;
          }
        });
        
        // Factor 3: Featured status
        if (persona.isFeatured) {
          score += 15;
        }
        
        // Factor 4: Popularity (use count)
        score += Math.min(persona.useCount || 0, 50) / 5;
        
        return { persona, score };
      });
      
      // Sort by score (descending) and return top results
      scoredPersonas.sort((a, b) => b.score - a.score);
      
      // Return top recommendations with scores
      return res.json({
        timeOfDay,
        emotions,
        recommendations: scoredPersonas.slice(0, 5).map(({ persona, score }) => ({
          id: persona.personaId,
          name: persona.name,
          avatarEmoji: persona.avatarEmoji,
          description: persona.description,
          score: Math.round(score),
          categories: persona.categories as string[] || [],
        }))
      });
    } catch (error) {
      console.error("Error getting persona recommendations:", error);
      return res.status(500).json({ error: "Failed to get persona recommendations" });
    }
  });

  // AI Image Generation Concept Management
  
  // Get all concept categories
  app.get("/api/admin/concept-categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(conceptCategories).orderBy(asc(conceptCategories.order));
      return res.json(allCategories);
    } catch (error) {
      console.error("Error fetching concept categories:", error);
      return res.status(500).json({ error: "Failed to fetch concept categories" });
    }
  });
  
  // Get all active concept categories (public endpoint)
  app.get("/api/concept-categories", async (req, res) => {
    try {
      const activeCategories = await db.select().from(conceptCategories)
        .where(eq(conceptCategories.isActive, true))
        .orderBy(asc(conceptCategories.order));
      return res.json(activeCategories);
    } catch (error) {
      console.error("Error fetching public concept categories:", error);
      return res.status(500).json({ error: "Failed to fetch concept categories" });
    }
  });
  
  // Get a specific concept category
  app.get("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const category = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      console.error("Error fetching concept category:", error);
      return res.status(500).json({ error: "Failed to fetch concept category" });
    }
  });
  
  // Create a new concept category
  app.post("/api/admin/concept-categories", async (req, res) => {
    try {
      const validatedData = conceptCategorySchema.parse(req.body);
      
      // Check if category with this ID already exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, validatedData.categoryId)
      });
      
      if (existingCategory) {
        return res.status(409).json({ error: "A concept category with this ID already exists" });
      }
      
      // Insert new category
      const [newCategory] = await db.insert(conceptCategories).values({
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        description: validatedData.description,
        order: validatedData.order,
        isActive: validatedData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating concept category:", error);
      return res.status(500).json({ error: "Failed to create concept category" });
    }
  });
  
  // Update a concept category
  app.put("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const validatedData = conceptCategorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      // Update category
      const [updatedCategory] = await db.update(conceptCategories)
        .set({
          name: validatedData.name,
          description: validatedData.description,
          systemPrompt: validatedData.systemPrompt,  // 시스템 프롬프트 필드 추가
          order: validatedData.order,
          isActive: validatedData.isActive,
          updatedAt: new Date(),
        })
        .where(eq(conceptCategories.categoryId, categoryId))
        .returning();
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating concept category:", error);
      return res.status(500).json({ error: "Failed to update concept category" });
    }
  });
  
  // Delete a concept category
  app.delete("/api/admin/concept-categories/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const existingCategory = await db.query.conceptCategories.findFirst({
        where: eq(conceptCategories.categoryId, categoryId)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Concept category not found" });
      }
      
      // Delete category
      await db.delete(conceptCategories).where(eq(conceptCategories.categoryId, categoryId));
      
      return res.json({ success: true, message: "Concept category deleted successfully" });
    } catch (error) {
      console.error("Error deleting concept category:", error);
      return res.status(500).json({ error: "Failed to delete concept category" });
    }
  });
  
  // Get all concepts
  app.get("/api/admin/concepts", async (req, res) => {
    try {
      const allConcepts = await db.select().from(concepts).orderBy(asc(concepts.order));
      return res.json(allConcepts);
    } catch (error) {
      console.error("Error fetching concepts:", error);
      return res.status(500).json({ error: "Failed to fetch concepts" });
    }
  });
  
  // Get all active concepts (public endpoint)
  app.get("/api/concepts", async (req, res) => {
    try {
      const activeConcepts = await db.select().from(concepts)
        .where(eq(concepts.isActive, true))
        .orderBy(asc(concepts.order));
      return res.json(activeConcepts);
    } catch (error) {
      console.error("Error fetching public concepts:", error);
      return res.status(500).json({ error: "Failed to fetch concepts" });
    }
  });
  
  // Get a specific concept
  app.get("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      
      const concept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      return res.json(concept);
    } catch (error) {
      console.error("Error fetching concept:", error);
      return res.status(500).json({ error: "Failed to fetch concept" });
    }
  });
  
  // Create a new concept
  app.post("/api/admin/concepts", async (req, res) => {
    try {
      const validatedData = conceptSchema.parse(req.body);
      
      // Check if concept with this ID already exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, validatedData.conceptId)
      });
      
      if (existingConcept) {
        return res.status(409).json({ error: "A concept with this ID already exists" });
      }
      
      // Insert new concept
      const [newConcept] = await db.insert(concepts).values({
        conceptId: validatedData.conceptId,
        title: validatedData.title,
        description: validatedData.description,
        promptTemplate: validatedData.promptTemplate,
        systemPrompt: validatedData.systemPrompt,  // 시스템 프롬프트 필드 추가
        thumbnailUrl: validatedData.thumbnailUrl,
        tagSuggestions: validatedData.tagSuggestions,
        variables: validatedData.variables,
        categoryId: validatedData.categoryId,
        isActive: validatedData.isActive,
        isFeatured: validatedData.isFeatured,
        order: validatedData.order,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(newConcept);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating concept:", error);
      return res.status(500).json({ error: "Failed to create concept" });
    }
  });
  
  // Update a concept
  app.put("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      
      // 요청 데이터 로깅 (디버깅용)
      console.log("컨셉 업데이트 요청 데이터:", JSON.stringify(req.body, null, 2));
      
      const validatedData = conceptSchema.parse(req.body);
      
      // 유효성 검사 통과한 데이터 로깅 (디버깅용)
      console.log("검증된 컨셉 데이터:", JSON.stringify(validatedData, null, 2));
      
      // Check if concept exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!existingConcept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Update concept
      const [updatedConcept] = await db.update(concepts)
        .set({
          title: validatedData.title,
          description: validatedData.description,
          promptTemplate: validatedData.promptTemplate,
          systemPrompt: validatedData.systemPrompt,  // 시스템 프롬프트 필드 추가
          thumbnailUrl: validatedData.thumbnailUrl,
          tagSuggestions: validatedData.tagSuggestions,
          variables: validatedData.variables,
          categoryId: validatedData.categoryId,
          isActive: validatedData.isActive,
          isFeatured: validatedData.isFeatured,
          order: validatedData.order,
          // OpenAI 이미지 생성 관련 필드만 유지
          updatedAt: new Date(),
        })
        .where(eq(concepts.conceptId, conceptId))
        .returning();
      
      return res.json(updatedConcept);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating concept:", error);
      return res.status(500).json({ error: "Failed to update concept" });
    }
  });
  
  // Delete a concept
  app.delete("/api/admin/concepts/:id", async (req, res) => {
    try {
      const conceptId = req.params.id;
      
      // Check if concept exists
      const existingConcept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, conceptId)
      });
      
      if (!existingConcept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Delete concept
      await db.delete(concepts).where(eq(concepts.conceptId, conceptId));
      
      return res.json({ success: true, message: "Concept deleted successfully" });
    } catch (error) {
      console.error("Error deleting concept:", error);
      return res.status(500).json({ error: "Failed to delete concept" });
    }
  });

  // Internationalization (i18n) API endpoints
  
  // Upload translations for a specific language
  app.post("/api/admin/translations/:lang", async (req, res) => {
    try {
      const lang = req.params.lang;
      const translations = req.body;
      
      if (!translations || typeof translations !== 'object') {
        return res.status(400).json({ error: "Invalid translations format. Expected JSON object with key-value pairs." });
      }
      
      // In a real implementation, we would store these in a database or file system
      // For now, we'll just return a success response
      
      return res.json({ 
        success: true, 
        message: `Successfully uploaded translations for ${lang}`,
        count: Object.keys(translations).length
      });
    } catch (error) {
      console.error("Error uploading translations:", error);
      return res.status(500).json({ error: "Failed to upload translations" });
    }
  });
  
  // Get available languages
  app.get("/api/languages", async (req, res) => {
    try {
      // In a real implementation, we would retrieve this from a database
      // For now, we'll just return a predefined list
      return res.json([
        { code: "en", name: "English", isDefault: true },
        { code: "ko", name: "Korean" }
      ]);
    } catch (error) {
      console.error("Error fetching languages:", error);
      return res.status(500).json({ error: "Failed to fetch languages" });
    }
  });

  // Thumbnail upload endpoint for concepts
  app.post("/api/admin/upload/thumbnail", upload.single("thumbnail"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Generate a public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      return res.status(500).json({ error: "Failed to upload thumbnail" });
    }
  });
  
  // Reference image upload endpoint for PhotoMaker
  app.post("/api/admin/upload/reference", upload.single("reference"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Generate a public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error("Error uploading reference image:", error);
      return res.status(500).json({ error: "Failed to upload reference image" });
    }
  });
  
  // A/B Testing routes
  // Get all A/B tests
  app.get("/api/admin/abtests", async (req, res) => {
    try {
      const allTests = await db.query.abTests.findMany({
        orderBy: [asc(abTests.name)],
      });
      
      return res.json(allTests);
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
      return res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });
  
  // Get a single A/B test with its variants
  app.get("/api/admin/abtests/:id", async (req, res) => {
    try {
      const testId = req.params.id;
      
      const test = await db.query.abTests.findFirst({
        where: eq(abTests.testId, testId),
      });
      
      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      
      const variants = await db.query.abTestVariants.findMany({
        where: eq(abTestVariants.testId, testId),
      });
      
      return res.json({
        ...test,
        variants
      });
    } catch (error) {
      console.error("Error fetching A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch A/B test" });
    }
  });
  
  // Create an A/B test
  app.post("/api/admin/abtests", async (req, res) => {
    try {
      const abTestSchema = z.object({
        testId: z.string().min(1, "Test ID is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        conceptId: z.string().min(1, "Concept ID is required"),
        isActive: z.boolean().default(true),
        variants: z.array(z.object({
          variantId: z.string().min(1, "Variant ID is required"),
          name: z.string().min(1, "Name is required"),
          promptTemplate: z.string().min(1, "Prompt template is required"),
          variables: z.array(z.any()).optional(),
        })).min(2, "At least two variants are required")
      });
      
      const validatedData = abTestSchema.parse(req.body);
      
      // Check if concept exists
      const concept = await db.query.concepts.findFirst({
        where: eq(concepts.conceptId, validatedData.conceptId)
      });
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Create test
      const [newTest] = await db.insert(abTests).values({
        testId: validatedData.testId,
        name: validatedData.name,
        description: validatedData.description || null,
        conceptId: validatedData.conceptId,
        isActive: validatedData.isActive,
        startDate: new Date(),
      }).returning();
      
      // Create variants
      const variants = await Promise.all(
        validatedData.variants.map(async (variant) => {
          const [newVariant] = await db.insert(abTestVariants).values({
            testId: validatedData.testId,
            variantId: variant.variantId,
            name: variant.name,
            promptTemplate: variant.promptTemplate,
            variables: variant.variables || [],
          }).returning();
          
          return newVariant;
        })
      );
      
      return res.status(201).json({
        ...newTest,
        variants
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating A/B test:", error);
      return res.status(500).json({ error: "Failed to create A/B test" });
    }
  });
  
  // Get active A/B test for a specific concept/style
  app.get("/api/abtests/active/:conceptId", async (req, res) => {
    try {
      const { conceptId } = req.params;
      
      const activeTest = await db.query.abTests.findFirst({
        where: and(
          eq(abTests.conceptId, conceptId),
          eq(abTests.isActive, true)
        ),
        with: {
          variants: true
        }
      });
      
      if (!activeTest) {
        return res.status(404).json({ error: "No active A/B test found for this concept" });
      }
      
      return res.json(activeTest);
    } catch (error) {
      console.error("Error fetching active A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch active A/B test" });
    }
  });
  
  // Record A/B test result
  app.post("/api/abtests/result", async (req, res) => {
    try {
      const resultSchema = z.object({
        testId: z.string().min(1, "Test ID is required"),
        selectedVariantId: z.string().min(1, "Selected variant ID is required"),
        userId: z.number().int().optional(),
        context: z.record(z.any()).optional(),
      });
      
      const validatedData = resultSchema.parse(req.body);
      
      // Record the result
      const [result] = await db.insert(abTestResults).values({
        testId: validatedData.testId,
        selectedVariantId: validatedData.selectedVariantId,
        userId: validatedData.userId || null,
        context: validatedData.context || {},
      }).returning();
      
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error recording A/B test result:", error);
      return res.status(500).json({ error: "Failed to record A/B test result" });
    }
  });
  
  // Get active A/B test for a concept
  app.get("/api/concepts/:conceptId/abtest", async (req, res) => {
    try {
      const conceptId = req.params.conceptId;
      
      // Find active A/B test for the concept
      const activeTest = await db.query.abTests.findFirst({
        where: and(
          eq(abTests.conceptId, conceptId),
          eq(abTests.isActive, true)
        ),
      });
      
      if (!activeTest) {
        return res.status(404).json({ error: "No active A/B test found for this concept" });
      }
      
      // Get variants for the test
      const variants = await db.query.abTestVariants.findMany({
        where: eq(abTestVariants.testId, activeTest.testId),
      });
      
      return res.json({
        ...activeTest,
        variants
      });
    } catch (error) {
      console.error("Error fetching active A/B test:", error);
      return res.status(500).json({ error: "Failed to fetch active A/B test" });
    }
  });

  // 채팅 기록 내보내기 - HTML 형식
  app.get("/api/export/chat/html", async (req, res) => {
    try {
      const htmlContent = await exportChatHistoryAsHtml();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="chat_history.html"');
      
      return res.send(htmlContent);
    } catch (error) {
      console.error("Error exporting chat history as HTML:", error);
      return res.status(500).json({ error: "Failed to export chat history" });
    }
  });

  // 채팅 기록 내보내기 - 텍스트 형식
  app.get("/api/export/chat/text", async (req, res) => {
    try {
      const textContent = await exportChatHistoryAsText();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="chat_history.txt"');
      
      return res.send(textContent);
    } catch (error) {
      console.error("Error exporting chat history as text:", error);
      return res.status(500).json({ error: "Failed to export chat history" });
    }
  });
  
  // 개발 대화 기록 내보내기 - HTML 형식
  app.get("/api/export/dev-chat/html", async (req, res) => {
    try {
      const htmlContent = await exportDevChatAsHtml();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="dev_chat_history.html"');
      
      return res.send(htmlContent);
    } catch (error) {
      console.error("Error exporting development chat history as HTML:", error);
      return res.status(500).json({ error: "Failed to export development chat history" });
    }
  });

  // 개발 대화 기록 내보내기 - 텍스트 형식
  app.get("/api/export/dev-chat/text", async (req, res) => {
    try {
      const textContent = await exportDevChatAsText();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="dev_chat_history.txt"');
      
      return res.send(textContent);
    } catch (error) {
      console.error("Error exporting development chat history as text:", error);
      return res.status(500).json({ error: "Failed to export development chat history" });
    }
  });
  
  // ===== 개발자 대화 히스토리 관리 API =====
  
  // 날짜 목록 가져오기
  app.get("/api/dev-history/dates", (req, res) => {
    try {
      const historyManager = new DevHistoryManager();
      const dates = historyManager.getDateList();
      return res.json({ dates });
    } catch (error) {
      console.error("Error getting dev history dates:", error);
      return res.status(500).json({ error: "Failed to get history dates" });
    }
  });
  
  // 특정 날짜의 대화 히스토리 가져오기
  app.get("/api/dev-history/:date", (req, res) => {
    try {
      const { date } = req.params;
      const historyManager = new DevHistoryManager();
      const htmlContent = historyManager.getHistoryByDate(date);
      
      // HTML 형식으로 반환
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlContent);
    } catch (error) {
      console.error(`Error getting dev history for date ${req.params.date}:`, error);
      return res.status(500).json({ error: "Failed to get history for this date" });
    }
  });
  
  // 특정 날짜의 대화 히스토리 다운로드
  app.get("/api/dev-history/:date/download", (req, res) => {
    try {
      const { date } = req.params;
      const historyManager = new DevHistoryManager();
      const htmlContent = historyManager.getHistoryByDate(date);
      
      // 파일 다운로드용 헤더 설정
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="dev_chat_${date}.html"`);
      
      return res.send(htmlContent);
    } catch (error) {
      console.error(`Error downloading dev history for date ${req.params.date}:`, error);
      return res.status(500).json({ error: "Failed to download history for this date" });
    }
  });
  
  // 현재 대화를 특정 날짜로 저장
  app.post("/api/dev-history/save/:date", (req, res) => {
    try {
      const { date } = req.params;
      const historyManager = new DevHistoryManager();
      const success = historyManager.saveCurrentHistoryByDate(date);
      
      if (success) {
        return res.json({ success: true, message: `개발 대화가 ${date} 날짜로 저장되었습니다.` });
      } else {
        return res.status(400).json({ error: "Failed to save the current chat history" });
      }
    } catch (error) {
      console.error(`Error saving dev history for date ${req.params.date}:`, error);
      return res.status(500).json({ error: "Failed to save history for this date" });
    }
  });
  
  // "채팅저장" 명령어 처리 엔드포인트 - 현재 날짜로 자동 저장
  app.post("/api/dev-history/save-by-command", (req, res) => {
    try {
      const autoChatSaver = AutoChatSaver.getInstance();
      const success = autoChatSaver.saveByCommand();
      
      if (success) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
        return res.json({ 
          success: true, 
          message: `"채팅저장" 명령에 의해 대화가 ${today} 날짜로 성공적으로 저장되었습니다.` 
        });
      } else {
        return res.status(400).json({ 
          error: "채팅 저장 실패", 
          message: "변경된 내용이 없거나 저장할 내용이 없습니다." 
        });
      }
    } catch (error) {
      console.error("Error saving chat by command:", error);
      return res.status(500).json({ 
        error: "채팅 저장 실패", 
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      });
    }
  });
  
  // 배너 관리 API
  app.get("/api/banners", async (req, res) => {
    try {
      const allBanners = await db.query.banners.findMany({
        where: eq(banners.isActive, true),
        orderBy: [asc(banners.sortOrder), desc(banners.createdAt)]
      });
      res.json(allBanners);
    } catch (error) {
      console.error("Error getting banners:", error);
      res.status(500).json({ error: "Failed to get banners" });
    }
  });
  
  app.post("/api/admin/banners", async (req, res) => {
    try {
      const bannerData = insertBannerSchema.parse(req.body);
      const newBanner = await db.insert(banners).values(bannerData).returning();
      res.status(201).json(newBanner[0]);
    } catch (error) {
      console.error("Error creating banner:", error);
      res.status(500).json({ error: "Failed to create banner" });
    }
  });
  
  app.put("/api/admin/banners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid banner ID" });
      }
      
      const bannerData = insertBannerSchema.partial().parse(req.body);
      const updatedBanner = await db
        .update(banners)
        .set({
          ...bannerData,
          updatedAt: new Date()
        })
        .where(eq(banners.id, id))
        .returning();
        
      if (updatedBanner.length === 0) {
        return res.status(404).json({ error: "Banner not found" });
      }
      
      res.json(updatedBanner[0]);
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({ error: "Failed to update banner" });
    }
  });
  
  app.delete("/api/admin/banners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid banner ID" });
      }
      
      const result = await db
        .delete(banners)
        .where(eq(banners.id, id))
        .returning({ id: banners.id });
        
      if (result.length === 0) {
        return res.status(404).json({ error: "Banner not found" });
      }
      
      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ error: "Failed to delete banner" });
    }
  });
  
  // 스타일 카드 API
  app.get("/api/style-cards", async (req, res) => {
    try {
      const allStyleCards = await db.query.styleCards.findMany({
        where: eq(styleCards.isActive, true),
        orderBy: [asc(styleCards.sortOrder), desc(styleCards.createdAt)]
      });
      res.json(allStyleCards);
    } catch (error) {
      console.error("Error getting style cards:", error);
      res.status(500).json({ error: "Failed to get style cards" });
    }
  });
  
  app.post("/api/admin/style-cards", async (req, res) => {
    try {
      const styleCardData = insertStyleCardSchema.parse(req.body);
      const newStyleCard = await db.insert(styleCards).values(styleCardData).returning();
      res.status(201).json(newStyleCard[0]);
    } catch (error) {
      console.error("Error creating style card:", error);
      res.status(500).json({ error: "Failed to create style card" });
    }
  });
  
  app.put("/api/admin/style-cards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid style card ID" });
      }
      
      const styleCardData = insertStyleCardSchema.partial().parse(req.body);
      const updatedStyleCard = await db
        .update(styleCards)
        .set({
          ...styleCardData,
          updatedAt: new Date()
        })
        .where(eq(styleCards.id, id))
        .returning();
        
      if (updatedStyleCard.length === 0) {
        return res.status(404).json({ error: "Style card not found" });
      }
      
      res.json(updatedStyleCard[0]);
    } catch (error) {
      console.error("Error updating style card:", error);
      res.status(500).json({ error: "Failed to update style card" });
    }
  });
  
  app.delete("/api/admin/style-cards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid style card ID" });
      }
      
      const result = await db
        .delete(styleCards)
        .where(eq(styleCards.id, id))
        .returning({ id: styleCards.id });
        
      if (result.length === 0) {
        return res.status(404).json({ error: "Style card not found" });
      }
      
      res.json({ message: "Style card deleted successfully" });
    } catch (error) {
      console.error("Error deleting style card:", error);
      res.status(500).json({ error: "Failed to delete style card" });
    }
  });
  
  // 썸네일 이미지 업로드 API
  app.post("/api/admin/upload-thumbnail", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // 파일 경로에서 URL 생성 (상대 경로)
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.status(201).json({
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      res.status(500).json({ error: "Failed to upload thumbnail" });
    }
  });
  
  // Service Categories 관련 API 엔드포인트
  app.get("/api/service-categories", async (req, res) => {
    try {
      const categories = await db.query.serviceCategories.findMany({
        orderBy: asc(serviceCategories.order)
      });
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      res.status(500).json({ error: "Failed to fetch service categories" });
    }
  });
  
  app.post("/api/admin/service-categories", async (req, res) => {
    try {
      const validatedData = insertServiceCategorySchema.parse(req.body);
      
      const [newCategory] = await db
        .insert(serviceCategories)
        .values(validatedData)
        .returning();
        
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating service category:", error);
      res.status(500).json({ error: "Failed to create service category" });
    }
  });
  
  app.put("/api/admin/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid service category ID" });
      }
      
      const validatedData = insertServiceCategorySchema.parse(req.body);
      
      const [updatedCategory] = await db
        .update(serviceCategories)
        .set(validatedData)
        .where(eq(serviceCategories.id, id))
        .returning();
        
      if (!updatedCategory) {
        return res.status(404).json({ error: "Service category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating service category:", error);
      res.status(500).json({ error: "Failed to update service category" });
    }
  });
  
  app.delete("/api/admin/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid service category ID" });
      }
      
      const result = await db
        .delete(serviceCategories)
        .where(eq(serviceCategories.id, id))
        .returning({ id: serviceCategories.id });
        
      if (result.length === 0) {
        return res.status(404).json({ error: "Service category not found" });
      }
      
      res.json({ message: "Service category deleted successfully" });
    } catch (error) {
      console.error("Error deleting service category:", error);
      res.status(500).json({ error: "Failed to delete service category" });
    }
  });

  // Replicate API 테스트 엔드포인트 추가
  app.get("/api/test-replicate", async (req, res) => {
    try {
      const { testReplicateAPI } = await import("./test-replicate");
      console.log("Replicate API 테스트 요청 수신됨");
      const result = await testReplicateAPI();
      return res.json(result);
    } catch (error: unknown) {
      console.error("Replicate API 테스트 엔드포인트 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      return res.status(500).json({ error: errorMessage });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
