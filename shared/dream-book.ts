import { pgTable, serial, text, timestamp, jsonb, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './schema';
import { relations } from 'drizzle-orm';

// 태몽동화 테이블 정의
export const dreamBooks = pgTable('dream_books', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  babyName: text('baby_name').notNull(),
  dreamer: text('dreamer').notNull(),
  dreamContent: text('dream_content').notNull(),
  summaryText: text('summary_text'),
  style: text('style').notNull(),
  // 고도화 시스템을 위한 추가 필드
  characterImageUrl: text('character_image_url'),       // 1차 생성된 캐릭터 이미지 URL
  scene0ImageUrl: text('scene0_image_url'),             // 캐릭터+배경 통합 이미지 URL (기준 이미지)
  characterPrompt: text('character_prompt'),            // 캐릭터 참조용 프롬프트
  peoplePrompt: text('people_prompt'),                  // 인물 표현 프롬프트
  backgroundPrompt: text('background_prompt'),          // 배경 표현 프롬프트
  numberOfScenes: integer('number_of_scenes').default(4), // 컷 수 (1~4)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  hospitalId: integer('hospital_id').references(() => users.hospitalId),
  isPublic: boolean('is_public').default(false),
});

// 태몽동화 이미지 테이블 정의
export const dreamBookImages = pgTable('dream_book_images', {
  id: serial('id').primaryKey(),
  dreamBookId: integer('dream_book_id').notNull().references(() => dreamBooks.id),
  sequence: integer('sequence').notNull(), // 순서: 1, 2, 3, 4
  prompt: text('prompt'),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 테이블 관계 정의
export const dreamBooksRelations = relations(dreamBooks, ({ many, one }) => ({
  images: many(dreamBookImages),
  user: one(users, {
    fields: [dreamBooks.userId],
    references: [users.id],
  }),
}));

export const dreamBookImagesRelations = relations(dreamBookImages, ({ one }) => ({
  dreamBook: one(dreamBooks, {
    fields: [dreamBookImages.dreamBookId],
    references: [dreamBooks.id],
  }),
}));

// Zod 스키마 생성 (유효성 검증용)
export const dreamBooksInsertSchema = createInsertSchema(dreamBooks);
export const dreamBookImagesInsertSchema = createInsertSchema(dreamBookImages);

// 캐릭터 생성 요청 스키마
export const createCharacterSchema = z.object({
  babyName: z.string().min(1, "아기 이름은 필수입니다"),
  style: z.union([z.string(), z.number(), z.coerce.number()]).transform(val => String(val)),
  userImage: z.string().optional(), // 사용자가 업로드한 사진 URL
  backgroundDescription: z.string().default("환상적이고 아름다운 배경"), // 배경 설명 추가
});

// 태몽동화 생성 요청 스키마
export const createDreamBookSchema = z.object({
  babyName: z.string().min(1, "아기 이름은 필수입니다"),
  dreamer: z.string().min(1, "꿈을 꾼 사람은 필수입니다"),
  style: z.union([z.string(), z.number(), z.coerce.number()]).transform(val => String(val)),
  characterImageUrl: z.string().min(1, "캐릭터 이미지는 필수입니다"),
  peoplePrompt: z.string().min(1, "인물 표현은 필수입니다"),
  backgroundPrompt: z.string().min(1, "배경 표현은 필수입니다"),
  numberOfScenes: z.number().min(1).max(4).default(4),
  scenePrompts: z.array(z.string()).min(1, "최소 1개 이상의 장면 프롬프트를 입력해주세요").refine(
    (prompts) => prompts.filter(p => p.trim() !== '').length > 0,
    { message: "최소 1개 이상의 장면 프롬프트를 입력해주세요" }
  ),
});

// 타입 정의
export type DreamBook = z.infer<typeof dreamBooksInsertSchema>;
export type DreamBookImage = z.infer<typeof dreamBookImagesInsertSchema>;

// 클라이언트에서 사용할 타입
export interface DreamBookWithImages extends Omit<DreamBook, 'id'> {
  id: number;
  images: {
    id: number; 
    sequence: number;
    prompt?: string;
    imageUrl: string;
  }[];
}

// API 요청 타입
export interface CreateCharacterRequest {
  babyName: string;
  style: number | string; // number 또는 string 형태로 수신될 수 있음
  userImage?: string; // 선택적 사용자 업로드 이미지
}

export interface CreateDreamBookRequest {
  babyName: string;
  dreamer: string;
  style: number | string; // number 또는 string 형태로 수신될 수 있음
  characterImageUrl: string; // 1차 생성된 캐릭터 이미지 URL
  scene0ImageUrl?: string; // 캐릭터+배경 통합 이미지 URL (선택적)
  peoplePrompt: string; // 인물 표현 프롬프트
  backgroundPrompt: string; // 배경 표현 프롬프트
  numberOfScenes: number; // 컷 수 (1~4)
  scenePrompts: string[]; // 사용자가 직접 입력한 장면 프롬프트(최대 4개)
}

// 스타일 선택 옵션
export const DREAM_BOOK_STYLES = [
  { id: 'ghibli', name: '지브리풍', description: '따뜻하고 환상적인 지브리 스튜디오 스타일' },
  { id: 'disney', name: '디즈니풍', description: '화려하고 감성적인 디즈니 애니메이션 스타일' },
  { id: 'watercolor', name: '수채화풍', description: '부드럽고 감성적인 수채화 스타일' },
  { id: 'realistic', name: '사실적', description: '사실적이고 자연스러운 스타일' },
  { id: 'korean', name: '전통 한국화', description: '한국 전통 수묵화 스타일' },
];

// 꿈꾼 사람 선택 옵션
export const DREAM_BOOK_DREAMERS = [
  { id: 'mother', name: '엄마' },
  { id: 'father', name: '아빠' },
  { id: 'grandmother_mom', name: '외할머니' },
  { id: 'grandmother_dad', name: '친할머니' },
  { id: 'grandfather_mom', name: '외할아버지' },
  { id: 'grandfather_dad', name: '친할아버지' },
  { id: 'relative', name: '친척' },
];