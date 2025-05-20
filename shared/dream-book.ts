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

// 클라이언트에서 요청 검증용 스키마
export const createDreamBookSchema = z.object({
  babyName: z.string().min(1, "아기 이름은 필수입니다"),
  dreamer: z.string().min(1, "꿈을 꾼 사람은 필수입니다"),
  prompts: z.array(z.string()).min(1, "최소 1개 이상의 장면 프롬프트를 입력해주세요").refine(
    (prompts) => prompts.filter(p => p.trim() !== '').length > 0,
    { message: "최소 1개 이상의 장면 프롬프트를 입력해주세요" }
  ),
  style: z.union([z.string(), z.number(), z.coerce.number()]).transform(val => String(val)),
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
export interface CreateDreamBookRequest {
  babyName: string;
  dreamer: string;
  prompts: string[]; // 사용자가 직접 입력한 장면 프롬프트(최대 4개)
  style: string;
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