import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// 태몽동화 스타일 테이블
export const dreambookStyles = pgTable('dreambook_styles', {
  id: serial('id').primaryKey(),
  styleId: text('style_id').notNull().unique(), // ghibli, disney 등 스타일 식별자
  name: text('name').notNull(), // 사용자에게 표시될 이름
  description: text('description').notNull(), // 스타일 설명
  systemPrompt: text('system_prompt').notNull(), // 이미지 생성 시 사용되는 프롬프트
  thumbnailUrl: text('thumbnail_url').notNull(), // 스타일 썸네일 이미지 URL
  isActive: boolean('is_active').default(true), // 활성화 여부
  order: integer('order').default(0), // 표시 순서
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 태몽동화 스타일 스키마
export const dreambookStylesInsertSchema = createInsertSchema(dreambookStyles);
export const dreambookStylesSelectSchema = createSelectSchema(dreambookStyles);

// 타입 정의
export type DreambookStyle = z.infer<typeof dreambookStylesSelectSchema>;
export type DreambookStyleInsert = z.infer<typeof dreambookStylesInsertSchema>;