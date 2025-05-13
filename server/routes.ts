import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import 'express-session';
import { authMiddleware } from "./common/middleware/auth";
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
  serviceItems,
  abTestResults,
  hospitals,
  banners,
  campaigns,
  campaignApplications,
  styleCards,
  serviceCategories,
  favorites,
  savedChats,
  insertCampaignSchema,
  insertCampaignApplicationSchema,
  insertConceptSchema,
  insertConceptCategorySchema,
  insertBannerSchema,
  insertStyleCardSchema,
  insertServiceCategorySchema,
  insertServiceItemSchema,
  sql,
  like
} from "../shared/schema";
import { db } from "../db";
import { or, ne, eq, and, asc, desc } from "drizzle-orm";

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
import { placeholderRouter } from './routes/placeholder';

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
  
  // 플레이스홀더 이미지 라우트 등록
  app.use("/api/placeholder", placeholderRouter);
  
  // 슈퍼관리자 라우트 등록
  app.use("/api/super", superAdminRoutes);
  
  // 통합 메뉴 API - 카테고리와 서비스 항목을 함께 제공
  app.get("/api/menu", async (req, res) => {
    try {
      // 1. 활성화된 서비스 카테고리 가져오기 (공개 상태인 것만)
      const categories = await db.select().from(serviceCategories)
        .where(eq(serviceCategories.isPublic, true))
        .orderBy(serviceCategories.order);
      
      if (!categories || categories.length === 0) {
        return res.status(200).json([]);
      }
      
      // 2. 메뉴 구조 생성
      const menu = [];
      
      // 3. 각 카테고리별로 해당하는 서비스 항목 조회
      for (const category of categories) {
        // 해당 카테고리에 속한 활성화된 서비스 항목만 가져오기
        const items = await db.select({
          id: serviceItems.id,
          title: serviceItems.title,
          path: serviceItems.itemId, // 클라이언트 라우팅에 사용될 경로
          iconName: serviceItems.icon // 아이콘 이름
        }).from(serviceItems)
          .where(and(
            eq(serviceItems.categoryId, category.id),
            eq(serviceItems.isPublic, true)
          ))
          .orderBy(serviceItems.order);
        
        // 항목이 있는 카테고리만 메뉴에 추가
        if (items && items.length > 0) {
          menu.push({
            id: category.id,
            title: category.title,
            icon: category.icon, // 카테고리 아이콘 (icons 필드)
            items: items.map(item => ({
              ...item,
              // 클라이언트 사이드 라우팅에 필요한 형식으로 변환
              path: `/${item.path}` // 경로 앞에 슬래시 추가
            }))
          });
        }
      }
      
      console.log("메뉴 구조:", JSON.stringify(menu));
      return res.status(200).json(menu);
    } catch (error) {
      console.error('메뉴 조회 오류:', error);
      return res.status(500).json({ error: "menu-error" });
    }
  });

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

  // Image transformation endpoints - 인증 필요
  app.post("/api/image/transform", upload.single("image"), authMiddleware, async (req, res) => {
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
        
        // 요청 정보 자세히 로깅
        console.log(`[이미지 변환] 요청 시작 - 시간: ${new Date().toISOString()}`);
        console.log(`[이미지 변환] 파일: ${req.file.originalname}, 스타일: ${style}`);
        console.log(`[이미지 변환] 요청 헤더: admin=${req.query.admin}, x-admin-request=${req.headers['x-admin-request']}`);
        console.log(`[이미지 변환] 세션 존재 여부: ${!!req.session}`);
        
        // 사용자 정보 로그 출력 (확장)
        if (userId && username) {
          console.log(`[이미지 변환] 로그인 사용자 ${username} (ID: ${userId})`);
        } else {
          console.log('[이미지 변환] 로그인 없음 (익명 사용자)');
          // 로그인하지 않은 사용자의 경우 임시 정보 사용
          console.log('[이미지 변환] 익명 사용자용 기본 메타데이터를 사용합니다');
        }
        
        // 모든 이미지 요청은 데이터베이스에 저장 (사용자 정보 포함)
        console.log(`[이미지 변환] 이미지 저장 시작: ${style} ${req.file.originalname}`);
        
        dbSavedImage = await storage.saveImageTransformation(
          req.file.originalname,
          style,
          filePath,
          transformedImageUrl,
          userId || null,
          username || null,
          variantId // Store which variant was used, if any
        );
        
        console.log(`[이미지 변환] 이미지 저장 성공: ID=${dbSavedImage.id}, 제목=${dbSavedImage.title}`);
        
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
          
          // 개선된 세션 처리: 세션에 임시 이미지 정보 저장 (다운로드 처리를 위해)
          try {
            if (req.session) {
              req.session.tempImage = savedImage;
              
              // 세션 저장 명시적 호출
              req.session.save((err) => {
                if (err) {
                  console.error("[이미지 변환] 세션 저장 중 오류:", err);
                } else {
                  console.log(`[이미지 변환] 임시 이미지 정보가 세션(${req.sessionID})에 저장되었습니다. 제목: ${savedImage.title}`);
                  console.log(`[이미지 변환] 이미지 ID: ${dbSavedImage.id}, 임시 경로: ${savedImage.transformedUrl}`);
                }
              });
            } else {
              console.warn("[이미지 변환] 세션 객체가 없어 임시 이미지를 저장할 수 없습니다.");
            }
          } catch (sessionError) {
            console.error("[이미지 변환] 세션 저장 접근 중 오류:", sessionError);
          }
        }
      } catch (error) {
        console.error("[이미지 변환] 이미지 저장 중 오류:", error);
        
        // 오류 내용 상세히 로깅
        console.error("[이미지 변환] 오류 세부 정보:", {
          message: error.message || "알 수 없는 오류",
          stack: error.stack,
          time: new Date().toISOString(),
          requestInfo: {
            file: req.file?.originalname || "파일 없음",
            style: style || "스타일 없음",
            hasSession: !!req.session,
            user: req.user ? `${req.user.username} (ID: ${req.user.id})` : "로그인 없음"
          }
        });
        
        try {
          // 원래 파일명에서 확장자를 제외한 이름 사용
          const nameWithoutExt = path.basename(req.file.originalname, path.extname(req.file.originalname));
          
          // 이미지 저장에 실패하더라도 사용자에게 친숙한 제목 유지
          console.log("[이미지 변환] 오류 발생 시에도 친숙한 제목으로 응답 생성");
          
          // 이미지 URL 변환 상태에 따라 다르게 처리
          const imgUrl = transformedImageUrl.includes("placehold.co") 
            ? transformedImageUrl  // 이미 에러 이미지인 경우 그대로 사용
            : `/api/placeholder?style=${encodeURIComponent(style)}&text=${encodeURIComponent("이미지 처리 중 문제가 발생했습니다")}`;
          
          savedImage = {
            id: -1,
            title: `${style} ${nameWithoutExt}`, // "오류:" 접두사 제거
            style,
            originalUrl: filePath,
            transformedUrl: imgUrl,
            createdAt: new Date().toISOString(),
            isTemporary: true,
            aspectRatio: selectedAspectRatio, // 선택된 비율 정보 추가
            // 디버깅 정보 추가 (클라이언트에서는 표시되지 않음)
            debug: { 
              errorOccurred: true, 
              errorTime: new Date().toISOString(),
              errorType: error.name || "UnknownError",
              errorMessage: error.message || "알 수 없는 오류"
            }
          };
          
          console.log(`[이미지 변환] 오류 응답 객체 생성 완료: ${savedImage.title}`);
        } catch (formatError) {
          console.error("[이미지 변환] 오류 응답 생성 중 추가 오류:", formatError);
          
          // 완전 실패 시 최소한의 정보만 포함한 기본 응답
          savedImage = {
            id: -1,
            title: `이미지 ${new Date().toLocaleTimeString()}`,
            style: style || "기본",
            originalUrl: "",
            transformedUrl: "/api/placeholder?error=true",
            createdAt: new Date().toISOString(),
            isTemporary: true
          };
        }
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
        console.log(`[최근 이미지 API] 사용자 ${user.username} (ID: ${userId})의 이미지만 필터링`);
      } else {
        console.log(`[최근 이미지 API] 사용자 필터링 없음 (전체 이미지 표시)`);
      }
      
      // 여러 개의 이미지를 얻기 위해 제한을 높임
      const dbLimit = Math.max(30, limit * 3); // 최소 30개 또는 요청한 limit의 3배
      
      console.log(`[최근 이미지 API] 데이터베이스에서 ${dbLimit}개의 이미지를 가져오는 중...`);
      
      // 페이지네이션 적용하여 데이터베이스에서 최근 이미지 가져오기
      // 로그인 상태이고 사용자 필터링이 활성화된 경우에만 사용자 정보로 필터링
      const result = await storage.getPaginatedImageList(
        1, // 첫 페이지 
        dbLimit, 
        (user && filterByUser) ? userId : null,
        (user && filterByUser) ? user.username : null
      );
      
      // 필터링 조건 완화: 최근 24시간 내의 이미지도 포함 (1시간→24시간)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24시간 전 타임스탬프
      
      const recentImages = result.images
        .filter(img => {
          // createdAt이 24시간 이내인 이미지 포함
          const createTime = new Date(img.createdAt);
          return createTime > dayAgo;
        })
        .slice(0, limit); // 요청한 제한으로 결과 제한
      
      // 결과 개수가 부족하면 시간 제한 없이 최근 이미지 포함
      if (recentImages.length < limit) {
        console.log(`[최근 이미지 API] 24시간 이내 이미지가 ${recentImages.length}개로 부족합니다. 시간 제한 없이 최근 이미지를 포함합니다.`);
        
        // 이미 포함된 이미지 ID 집합
        const existingIds = new Set(recentImages.map(img => img.id));
        
        // 시간 제한 없이 추가 이미지를 포함
        const additionalImages = result.images
          .filter(img => !existingIds.has(img.id)) // 중복 방지
          .slice(0, limit - recentImages.length); // 남은 제한까지만 추가
        
        // 결합
        recentImages.push(...additionalImages);
      }
      
      console.log(`[최근 이미지 API] 전체 ${result.images.length}개 중 ${recentImages.length}개 이미지 반환 (사용자: ${userId || 'None'})`);
      
      // 디버깅: 각 이미지의 기본 정보를 로그로 출력
      recentImages.forEach((img, index) => {
        let metadataInfo = '없음';
        if (img.metadata) {
          try {
            const metadata = typeof img.metadata === 'string' 
              ? JSON.parse(img.metadata) 
              : img.metadata;
            metadataInfo = `userId: ${metadata.userId || '없음'}, isShared: ${metadata.isShared || false}`;
          } catch (e) {}
        }
        
        console.log(`[최근 이미지 ${index+1}/${recentImages.length}] ID: ${img.id}, 제목: ${img.title}, 생성일: ${new Date(img.createdAt).toISOString()}, 메타데이터: ${metadataInfo}`);
      });
      
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
      // 로그인 체크를 임시로 비활성화 (userId 없이도 갤러리 접근 가능하도록)
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
      }
      
      // 필터링 옵션
      const filter = req.query.filter as string | undefined;
      const usernameFilter = req.query.username as string | undefined;
      let galleryItems = [];
      
      // 현재 로그인한 사용자 정보 가져오기
      const userId = req.user?.id;
      const username = usernameFilter || req.user?.username;
      
      // 로그에 사용자 정보 출력
      console.log(`이미지 항목 로딩 - 사용자: ${username}`);
      
      // 일시적 해결책: 한글 인코딩 수정을 위한 유틸리티 함수 import
      const { decodeKoreanInObject, decodeKoreanText } = await import('./utils');
      
      // 사용자 ID로 필터링 추가 (임시: 사용자 구분 기능이 완전히 구현될 때까지 간단한 솔루션)
      if (filter === "chat") {
        // 채팅 데이터 - 직접 쿼리로 조회
        const chatItems = await db.select({
          id: savedChats.id,
          title: savedChats.title,
          personaEmoji: savedChats.personaEmoji,
          createdAt: savedChats.createdAt
        })
        .from(savedChats)
        .orderBy(desc(savedChats.createdAt))
        .limit(5);
        
        galleryItems = chatItems.map(chat => ({
          id: chat.id,
          title: decodeKoreanText(chat.title || '저장된 대화'),
          type: "chat" as const,
          url: `/chat?id=${chat.id}`,
          createdAt: chat.createdAt.toISOString(),
          isFavorite: false,
          personaEmoji: chat.personaEmoji || '💬'
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
          console.log(`[이미지 탭] 사용자 ${username || '없음'}`);
          
          // 통합된 getPaginatedImageList 함수 사용
          const imageResult = await storage.getPaginatedImageList(
            1, // 첫 페이지
            500, // 충분히 많은 수량
            userId, // 사용자 ID
            username // 사용자 이름 (필터링용)
          );
          
          // 결과 필터링 없이 바로 사용
          let filteredImages = imageResult.images;
          
          console.log(`[갤러리 API] 이미지 탭: ${filteredImages.length}개 이미지 로드됨`);
          
          // 이미지 복제 코드 제거 - 중복 방지
          // 결과가 적더라도 실제 이미지만 표시하도록 수정
          console.log("사용자의 실제 이미지만 표시합니다");
          
          // 필터링된 이미지 변환
          galleryItems = filteredImages.map(item => ({
            id: item.id,
            title: decodeKoreanText(item.title),
            type: "image" as const,
            url: item.transformedUrl,
            thumbnailUrl: item.transformedUrl,
            createdAt: item.createdAt.toISOString(),
            isFavorite: false
          }));
          
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
        galleryItems = favoriteItems.map(item => ({
          ...item,
          title: decodeKoreanInObject(item.title)
          // userId 필드 임시 제거 - 데이터베이스 스키마 업데이트 전까지
        }));
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
            
            const formattedMusicItems = musicItems.map(item => ({
              id: item.id,
              title: decodeKoreanInObject(item.title),
              type: "music" as const,
              url: item.url,
              duration: item.duration,
              createdAt: item.createdAt.toISOString(),
              isFavorite: false
            }));
            
            processedItems = [...processedItems, ...formattedMusicItems];
          } catch (musicError) {
            console.error("음악 조회 오류:", musicError);
          }
          
          // 이미지 항목 (사용자별 이미지 표시)
          try {
            console.log(`이미지 항목 로딩 - 사용자 ID: ${userId || '없음'}, 이름: ${username || '없음'}`);
            
            // 개선된 getPaginatedImageList 함수 사용 (메타데이터 기반 필터링)
            const result = await storage.getPaginatedImageList(
              1, // 첫 페이지
              30, // 최대 30개 가져오기
              userId, // 사용자 ID
              username // 사용자 이름
            );
            
            // 필터링된 이미지 가져오기
            let filteredImages = result.images;
            
            console.log(`갤러리 API: 이미지 조회 결과 - ${filteredImages.length}개 이미지`);
            
            // 각 이미지의 기본 정보 로그
            filteredImages.slice(0, 3).forEach((img, i) => {
              let metadataInfo = "없음";
              if (img.metadata) {
                try {
                  const metadata = typeof img.metadata === 'string' 
                    ? JSON.parse(img.metadata) 
                    : img.metadata;
                  metadataInfo = `userId: ${metadata.userId || '없음'}, username: ${metadata.username || '없음'}`;
                } catch (e) {}
              }
              console.log(`갤러리 이미지 [${i+1}/3] ID: ${img.id}, 제목: ${img.title}, 메타데이터: ${metadataInfo}`);
            });
            
            // 최대 10개 이미지로 제한
            filteredImages = filteredImages.slice(0, 10);
            
            if (filteredImages.length > 0) {
              // 이미지를 갤러리 형식으로 변환
              const formattedImageItems = filteredImages.map(item => ({
                id: item.id,
                title: decodeKoreanInObject(item.title),
                type: "image" as const,
                url: item.transformedUrl,
                thumbnailUrl: item.transformedUrl,
                createdAt: item.createdAt.toISOString(),
                isFavorite: false
              }));
              
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
            
            const formattedChatItems = chatItems.map(chat => ({
              id: chat.id,
              title: decodeKoreanInObject(chat.title || '저장된 대화'),
              type: "chat" as const,
              url: `/chat?id=${chat.id}`,
              createdAt: chat.createdAt.toISOString(),
              isFavorite: false,
              personaEmoji: chat.personaEmoji || '💬'
            }));
            
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
      
      // 빈 배열이면 빈 배열 반환 (에러 없음)
      if (!galleryItems || galleryItems.length === 0) {
        return res.json([]);
      }
      
      return res.json(galleryItems);
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
  // For testing, using userId=1, in a real app this would come from authentication
  const TEST_USER_ID = 1;
  
  // Get or update the pregnancy profile
  app.get("/api/pregnancy-profile", async (req, res) => {
    try {
      const { getOrCreatePregnancyProfile } = await import("./services/milestones");
      const profile = await getOrCreatePregnancyProfile(TEST_USER_ID);
      return res.json(profile || { error: "No profile found" });
    } catch (error) {
      console.error("Error fetching pregnancy profile:", error);
      return res.status(500).json({ error: "Failed to fetch pregnancy profile" });
    }
  });
  
  app.post("/api/pregnancy-profile", async (req, res) => {
    try {
      const { updatePregnancyProfile } = await import("./services/milestones");
      const profileData = req.body;
      
      // Ensure dueDate is a proper Date object if provided
      if (profileData.dueDate) {
        profileData.dueDate = new Date(profileData.dueDate);
      }
      
      const profile = await updatePregnancyProfile(TEST_USER_ID, profileData);
      
      if (!profile) {
        return res.status(400).json({ error: "Failed to update profile - dueDate is required" });
      }
      
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
      const { getAvailableMilestones } = await import("./services/milestones");
      const milestones = await getAvailableMilestones(TEST_USER_ID);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching available milestones:", error);
      return res.status(500).json({ error: "Failed to fetch available milestones" });
    }
  });
  
  app.get("/api/milestones/completed", async (req, res) => {
    try {
      const { getUserCompletedMilestones } = await import("./services/milestones");
      const milestones = await getUserCompletedMilestones(TEST_USER_ID);
      return res.json(milestones);
    } catch (error) {
      console.error("Error fetching completed milestones:", error);
      return res.status(500).json({ error: "Failed to fetch completed milestones" });
    }
  });
  
  app.post("/api/milestones/:milestoneId/complete", async (req, res) => {
    try {
      const { milestoneId } = req.params;
      const { notes, photoUrl } = req.body;
      
      const { completeMilestone } = await import("./services/milestones");
      const result = await completeMilestone(TEST_USER_ID, milestoneId, notes, photoUrl);
      
      return res.json(result);
    } catch (error) {
      console.error("Error completing milestone:", error);
      return res.status(500).json({ error: "Failed to complete milestone" });
    }
  });
  
  app.get("/api/milestones/stats", async (req, res) => {
    try {
      const { getUserAchievementStats } = await import("./services/milestones");
      const stats = await getUserAchievementStats(TEST_USER_ID);
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
  
  // 서비스 카테고리 API 엔드포인트
  
  // --- public menu (카테고리 + 하위메뉴) --------------------------
  app.get("/api/menu", async (req, res) => {
    try {
      const rows = await db
        .select({
          categoryId: serviceCategories.id,
          categoryTitle: serviceCategories.title,
          categoryIcon: serviceCategories.icon,
          itemId: serviceItems.itemId,
          itemTitle: serviceItems.title,
          path: serviceItems.path,
          iconName: serviceItems.iconName,
          order: serviceItems.order,
        })
        .from(serviceItems)
        .innerJoin(serviceCategories, eq(serviceItems.categoryId, serviceCategories.id))
        .where(eq(serviceItems.isPublic, true))
        .orderBy(serviceCategories.order, serviceItems.order);

      // 각 카테고리마다 id, title, icon을 포함하는 구조로 변경
      const grouped = Object.values(
        rows.reduce<Record<number, any>>((acc, r) => {
          if (!acc[r.categoryId]) {
            acc[r.categoryId] = { 
              id: r.categoryId,
              title: r.categoryTitle, 
              icon: r.categoryIcon || 'image', // 기본값 설정
              items: [] 
            };
          }
          acc[r.categoryId].items.push({
            id: r.itemId,
            title: r.itemTitle,
            path: r.path,
            iconName: r.iconName || 'layers', // 기본값 설정
          });
          return acc;
        }, {})
      );
      
      console.log("메뉴 구조:", JSON.stringify(grouped));
      res.json(grouped);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "menu-error" });
    }
  });

  // 공개 서비스 카테고리 조회 (일반 사용자용)
  app.get("/api/service-categories", async (req, res) => {
    try {
      const publicCategories = await db.query.serviceCategories.findMany({
        where: eq(serviceCategories.isPublic, true),
        orderBy: [asc(serviceCategories.order), asc(serviceCategories.id)]
      });
      return res.json(publicCategories);
    } catch (error) {
      console.error("Error fetching public service categories:", error);
      return res.status(500).json({ error: "서비스 카테고리를 가져오는 데 실패했습니다." });
    }
  });
  
  // 서비스 카테고리 API 엔드포인트 (관리자용)
  
  // 모든 서비스 카테고리 조회 (관리자용)
  app.get("/api/admin/service-categories", async (req, res) => {
    try {
      const allCategories = await db.query.serviceCategories.findMany({
        orderBy: [asc(serviceCategories.order), asc(serviceCategories.id)]
      });
      return res.json(allCategories);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      return res.status(500).json({ error: "서비스 카테고리를 가져오는 데 실패했습니다." });
    }
  });
  
  // 하위 서비스 항목 관리 API 엔드포인트 (관리자용)
  app.get("/api/admin/service-items", async (req, res) => {
    try {
      const { categoryId } = req.query;
      
      // 카테고리 ID로 필터링 (옵션)
      if (categoryId && typeof categoryId === 'string') {
        // 카테고리 ID는 숫자로 직접 변환 시도
        const categoryIdNum = parseInt(categoryId);
        
        if (isNaN(categoryIdNum)) {
          return res.status(400).json({ error: "카테고리 ID는 유효한 숫자여야 합니다." });
        }
        
        // 카테고리 기본 키로 카테고리 조회
        const category = await db.query.serviceCategories.findFirst({
          where: eq(serviceCategories.id, categoryIdNum)
        });
        
        if (!category) {
          return res.status(404).json({ error: "해당 카테고리를 찾을 수 없습니다." });
        }
        
        // 카테고리에 속한 서비스 항목 조회
        const items = await db.query.serviceItems.findMany({
          where: eq(serviceItems.categoryId, category.id),
          orderBy: [asc(serviceItems.order), asc(serviceItems.id)]
        });
        
        return res.json(items);
      } else {
        // 모든 서비스 항목 조회 (카테고리 정보 포함)
        const items = await db.query.serviceItems.findMany({
          orderBy: [asc(serviceItems.order), asc(serviceItems.id)],
          with: {
            category: true
          }
        });
        
        return res.json(items);
      }
    } catch (error) {
      console.error("Error fetching service items:", error);
      return res.status(500).json({ error: "서비스 항목을 가져오는 데 실패했습니다." });
    }
  });
  
  // 새 서비스 항목 생성
  app.post("/api/admin/service-items", async (req, res) => {
    try {
      const itemData = insertServiceItemSchema.parse(req.body);
      
      // 중복 itemId 체크
      const existingItemId = await db.query.serviceItems.findFirst({
        where: eq(serviceItems.itemId, itemData.itemId)
      });
      
      if (existingItemId) {
        return res.status(400).json({ error: "이미 사용 중인 서비스 항목 ID입니다." });
      }
      
      // 카테고리 존재 여부 확인
      const category = await db.query.serviceCategories.findFirst({
        where: eq(serviceCategories.id, itemData.categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ error: "카테고리를 찾을 수 없습니다." });
      }
      
      // 새 서비스 항목 저장
      const [newItem] = await db
        .insert(serviceItems)
        .values(itemData)
        .returning();
      
      return res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating service item:", error);
      return res.status(500).json({ error: "서비스 항목을 생성하는 데 실패했습니다." });
    }
  });
  
  // 서비스 항목 수정
  app.patch("/api/admin/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // 기존 항목 존재 여부 확인
      const existingItem = await db.query.serviceItems.findFirst({
        where: eq(serviceItems.id, id)
      });
      
      if (!existingItem) {
        return res.status(404).json({ error: "서비스 항목을 찾을 수 없습니다." });
      }
      
      const itemData = insertServiceItemSchema.partial().parse(req.body);
      
      // itemId 수정 시 중복 체크
      if (itemData.itemId && itemData.itemId !== existingItem.itemId) {
        const existingItemId = await db.query.serviceItems.findFirst({
          where: eq(serviceItems.itemId, itemData.itemId)
        });
        
        if (existingItemId) {
          return res.status(400).json({ error: "이미 사용 중인 서비스 항목 ID입니다." });
        }
      }
      
      // 카테고리 변경 시 카테고리 존재 여부 확인
      if (itemData.categoryId) {
        const category = await db.query.serviceCategories.findFirst({
          where: eq(serviceCategories.id, itemData.categoryId)
        });
        
        if (!category) {
          return res.status(404).json({ error: "카테고리를 찾을 수 없습니다." });
        }
      }
      
      // 항목 업데이트
      const [updatedItem] = await db
        .update(serviceItems)
        .set({
          ...itemData,
          updatedAt: new Date()
        })
        .where(eq(serviceItems.id, id))
        .returning();
      
      return res.json(updatedItem);
    } catch (error) {
      console.error("Error updating service item:", error);
      return res.status(500).json({ error: "서비스 항목을 수정하는 데 실패했습니다." });
    }
  });
  
  // 서비스 항목 삭제
  app.delete("/api/admin/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // 기존 항목 존재 여부 확인
      const existingItem = await db.query.serviceItems.findFirst({
        where: eq(serviceItems.id, id)
      });
      
      if (!existingItem) {
        return res.status(404).json({ error: "서비스 항목을 찾을 수 없습니다." });
      }
      
      // 항목 삭제
      await db
        .delete(serviceItems)
        .where(eq(serviceItems.id, id));
      
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting service item:", error);
      return res.status(500).json({ error: "서비스 항목을 삭제하는 데 실패했습니다." });
    }
  });
  
  // 새 서비스 카테고리 생성
  app.post("/api/admin/service-categories", async (req, res) => {
    try {
      const categoryData = insertServiceCategorySchema.parse(req.body);
      
      // 이미 존재하는 카테고리 ID인지 확인
      const existingCategory = await db.query.serviceCategories.findFirst({
        where: eq(serviceCategories.categoryId, categoryData.categoryId)
      });
      
      if (existingCategory) {
        return res.status(400).json({ error: "이미 존재하는 카테고리 ID입니다." });
      }
      
      const newCategory = await db.insert(serviceCategories)
        .values({
          ...categoryData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      return res.status(201).json(newCategory[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating service category:", error);
      return res.status(500).json({ error: "서비스 카테고리 생성에 실패했습니다." });
    }
  });
  
  // 서비스 카테고리 업데이트
  app.patch("/api/admin/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "잘못된 카테고리 ID입니다." });
      }
      
      const categoryData = insertServiceCategorySchema.partial().parse(req.body);
      
      // 카테고리 ID를 변경하려는 경우, 중복 확인
      if (categoryData.categoryId) {
        const existingWithSameId = await db.query.serviceCategories.findFirst({
          where: and(
            eq(serviceCategories.categoryId, categoryData.categoryId),
            sql`${serviceCategories.id} != ${id}`
          )
        });
        
        if (existingWithSameId) {
          return res.status(400).json({ error: "이미 존재하는 카테고리 ID입니다." });
        }
      }
      
      const updatedCategory = await db.update(serviceCategories)
        .set({
          ...categoryData,
          updatedAt: new Date()
        })
        .where(eq(serviceCategories.id, id))
        .returning();
        
      if (updatedCategory.length === 0) {
        return res.status(404).json({ error: "카테고리를 찾을 수 없습니다." });
      }
      
      return res.json(updatedCategory[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating service category:", error);
      return res.status(500).json({ error: "서비스 카테고리 업데이트에 실패했습니다." });
    }
  });
  
  // 서비스 카테고리 삭제
  app.delete("/api/admin/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "잘못된 카테고리 ID입니다." });
      }
      
      const result = await db.delete(serviceCategories)
        .where(eq(serviceCategories.id, id))
        .returning({ id: serviceCategories.id });
        
      if (result.length === 0) {
        return res.status(404).json({ error: "카테고리를 찾을 수 없습니다." });
      }
      
      return res.json({ message: "카테고리가 성공적으로 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting service category:", error);
      return res.status(500).json({ error: "서비스 카테고리 삭제에 실패했습니다." });
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

  // 캠페인 API
  app.get("/api/admin/campaigns", async (req, res) => {
    try {
      // snake_case에서 camelCase로 적절히 매핑하기 위해 별칭 사용
      const campaignsList = await db.select({
        id: campaigns.id,
        slug: campaigns.slug,
        title: campaigns.title,
        description: campaigns.description,
        bannerImage: campaigns.bannerImage,
        isPublic: campaigns.isPublic,
        displayOrder: campaigns.displayOrder,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt
      })
      .from(campaigns)
      .orderBy(asc(campaigns.displayOrder), asc(campaigns.title));
      
      console.log("Fetched campaigns:", campaignsList);
      res.json(campaignsList);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      // 일반 사용자에게는 공개된 캠페인만 보여줌
      const campaignTable = campaigns;
      const campaignsList = await db.select({
        id: campaignTable.id,
        slug: campaignTable.slug,
        title: campaignTable.title,
        description: campaignTable.description,
        bannerImage: campaignTable.bannerImage,
        isPublic: campaignTable.isPublic,
        displayOrder: campaignTable.displayOrder,
        createdAt: campaignTable.createdAt,
        updatedAt: campaignTable.updatedAt
      })
      .from(campaignTable)
      .where(eq(campaignTable.isPublic, true))
      .orderBy(asc(campaignTable.displayOrder), desc(campaignTable.createdAt));
      
      console.log("Fetched public campaigns:", campaignsList);
      res.json(campaignsList);
    } catch (error) {
      console.error("Error fetching public campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const campaignTable = campaigns;
      
      const campaignResults = await db.select({
        id: campaignTable.id,
        slug: campaignTable.slug,
        title: campaignTable.title,
        description: campaignTable.description,
        bannerImage: campaignTable.bannerImage,
        isPublic: campaignTable.isPublic,
        displayOrder: campaignTable.displayOrder,
        createdAt: campaignTable.createdAt,
        updatedAt: campaignTable.updatedAt
      })
      .from(campaignTable)
      .where(and(
        eq(campaignTable.slug, slug),
        eq(campaignTable.isPublic, true)
      ));
      
      if (campaignResults.length === 0) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json(campaignResults[0]);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  // 캠페인 신청 등록
  app.post("/api/campaign-applications", async (req, res) => {
    try {
      const applicationData = req.body;
      
      // Zod를 사용한 입력 데이터 검증
      try {
        insertCampaignApplicationSchema.parse(applicationData);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            error: "입력 데이터가 올바르지 않습니다.", 
            details: validationError.errors 
          });
        }
      }
      
      // 현재 로그인한 사용자 ID가 있으면 추가
      if (req.isAuthenticated()) {
        applicationData.userId = req.user.id;
      }
      
      // 중복 신청 체크 (동일한 contact + campaignId 조합이 이미 존재하는지)
      const existingApplication = await db.query.campaignApplications.findFirst({
        where: and(
          eq(campaignApplications.contact, applicationData.contact),
          eq(campaignApplications.campaignId, applicationData.campaignId)
        )
      });
      
      if (existingApplication) {
        return res.status(409).json({ 
          error: "이미 신청한 캠페인입니다.",
          applicationId: existingApplication.id
        });
      }
      
      // 신청 정보 저장
      const [newApplication] = await db.insert(campaignApplications)
        .values(applicationData)
        .returning();
      
      // TODO: 이메일 알림 발송 (향후 구현)
      
      return res.status(201).json({
        message: "캠페인 신청이 완료되었습니다.",
        application: newApplication
      });
    } catch (error) {
      console.error("Error creating campaign application:", error);
      return res.status(500).json({ error: "캠페인 신청 처리 중 오류가 발생했습니다." });
    }
  });
  
  // 관리자용 캠페인 신청 목록 조회
  app.get("/api/campaign-applications", async (req, res) => {
    try {
      // 관리자 권한 체크
      if (!req.isAuthenticated() || req.user.memberType !== 'superadmin') {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      
      const { campaignId } = req.query;
      
      let query = db.select({
        id: campaignApplications.id,
        name: campaignApplications.name,
        contact: campaignApplications.contact,
        memo: campaignApplications.memo,
        status: campaignApplications.status,
        createdAt: campaignApplications.createdAt,
        campaignId: campaignApplications.campaignId,
        campaignTitle: campaigns.title
      })
      .from(campaignApplications)
      .leftJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .orderBy(desc(campaignApplications.createdAt));
      
      // 특정 캠페인으로 필터링
      if (campaignId && !isNaN(Number(campaignId))) {
        query = query.where(eq(campaignApplications.campaignId, Number(campaignId)));
      }
      
      const applications = await query;
      
      return res.json(applications);
    } catch (error) {
      console.error("Error fetching campaign applications:", error);
      return res.status(500).json({ error: "캠페인 신청 목록을 불러오는데 실패했습니다." });
    }
  });
  
  // 관리자용 캠페인 신청 상태 업데이트
  app.patch("/api/campaign-applications/:id", async (req, res) => {
    try {
      // 관리자 권한 체크
      if (!req.isAuthenticated() || req.user.memberType !== 'superadmin') {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['new', 'processing', 'completed'].includes(status)) {
        return res.status(400).json({ error: "유효하지 않은 상태값입니다." });
      }
      
      const [updatedApplication] = await db.update(campaignApplications)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(campaignApplications.id, Number(id)))
        .returning();
      
      if (!updatedApplication) {
        return res.status(404).json({ error: "신청 정보를 찾을 수 없습니다." });
      }
      
      return res.json({
        message: "신청 상태가 업데이트되었습니다.",
        application: updatedApplication
      });
    } catch (error) {
      console.error("Error updating campaign application:", error);
      return res.status(500).json({ error: "신청 상태 업데이트 중 오류가 발생했습니다." });
    }
  });
  
  app.post("/api/admin/campaigns", async (req, res) => {
    try {
      // 관리자 권한 확인 (이미 authMiddleware에서 로그인 체크는 완료됨)
      const userData = req.user as any;
      if (userData.memberType !== 'superadmin' && userData.memberType !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const campaignData = insertCampaignSchema.parse(req.body);
      
      // 슬러그 중복 확인
      const existingCampaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.slug, campaignData.slug)
      });
      
      if (existingCampaign) {
        return res.status(400).json({ error: "Slug already exists" });
      }
      
      const newCampaign = await db.insert(campaigns).values(campaignData).returning();
      
      res.status(201).json(newCampaign[0]);
    } catch (error) {
      console.error("Error creating campaign:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/admin/campaigns/:id", async (req, res) => {
    try {
      // 관리자 권한 확인 (이미 authMiddleware에서 로그인 체크는 완료됨)
      const userData = req.user as any;
      if (userData.memberType !== 'superadmin' && userData.memberType !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      
      // 캠페인 존재 확인
      const existingCampaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id)
      });
      
      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const campaignData = insertCampaignSchema.partial().parse(req.body);
      
      // 슬러그를 변경하는 경우 중복 확인
      if (campaignData.slug && campaignData.slug !== existingCampaign.slug) {
        const slugExists = await db.query.campaigns.findFirst({
          where: eq(campaigns.slug, campaignData.slug)
        });
        
        if (slugExists) {
          return res.status(400).json({ error: "Slug already exists" });
        }
      }
      
      const updatedCampaign = await db
        .update(campaigns)
        .set({
          ...campaignData,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, id))
        .returning();
        
      res.json(updatedCampaign[0]);
    } catch (error) {
      console.error("Error updating campaign:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/admin/campaigns/:id", async (req, res) => {
    try {
      // 관리자 권한 확인 (이미 authMiddleware에서 로그인 체크는 완료됨)
      const userData = req.user as any;
      if (userData.memberType !== 'superadmin' && userData.memberType !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      
      const result = await db
        .delete(campaigns)
        .where(eq(campaigns.id, id))
        .returning({ id: campaigns.id });
        
      if (result.length === 0) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
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
    } catch (error) {
      console.error("Replicate API 테스트 엔드포인트 오류:", error);
      return res.status(500).json({ error: error.message || "알 수 없는 오류" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
