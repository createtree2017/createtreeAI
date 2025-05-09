import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table - 확장된 사용자 테이블
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),  // 해시된 비밀번호 저장
  email: varchar("email", { length: 255 }).unique(),
  fullName: varchar("full_name", { length: 100 }),
  emailVerified: boolean("email_verified").default(false),
  memberType: varchar("member_type", { length: 20 }).default("general"),  // general, membership
  hospitalId: integer("hospital_id"),
  promoCode: varchar("promo_code", { length: 50 }),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 병원 (Hospital) 테이블
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  domain: text("domain"), // 커스텀 도메인
  logoUrl: text("logo_url"), // 병원 로고 URL
  themeColor: text("theme_color"), // 테마 색상
  contractStartDate: timestamp("contract_start_date"), // 계약 시작일
  contractEndDate: timestamp("contract_end_date"), // 계약 종료일
  packageType: text("package_type").default("basic"), // basic, premium, enterprise
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 역할 (Role) 테이블
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // user, admin, hospital_admin, superadmin
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 사용자-역할 매핑 테이블 (다대다 관계)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 리프레시 토큰 테이블
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Music table
export const music = pgTable("music", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  babyName: text("baby_name").notNull(),
  style: text("style").notNull(),
  url: text("url").notNull(),
  duration: integer("duration").notNull().default(60),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Images table
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  style: text("style").notNull(),
  originalUrl: text("original_url").notNull(),
  transformedUrl: text("transformed_url").notNull(),
  metadata: text("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  itemType: text("item_type").notNull(), // 'music', 'image', or 'chat'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Personas table for character management
export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  personaId: text("persona_id").notNull().unique(), // String identifier like "maternal-guide"
  name: text("name").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  description: text("description").notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  
  // Additional fields from the expanded structure
  personality: text("personality"),
  tone: text("tone"),
  usageContext: text("usage_context"),
  emotionalKeywords: jsonb("emotional_keywords"), // Array of strings
  timeOfDay: text("time_of_day").default("all"),
  
  // Admin fields
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  order: integer("order").default(0),
  
  // Usage statistics
  useCount: integer("use_count").notNull().default(0),
  
  // Categories as JSON array
  categories: jsonb("categories"), // Array of category IDs
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Persona categories table
export const personaCategories = pgTable("persona_categories", {
  id: serial("id").primaryKey(),
  categoryId: text("category_id").notNull().unique(), // String identifier like "pregnancy"
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull(),
  order: integer("order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Saved chats table
export const savedChats = pgTable("saved_chats", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  personaId: text("persona_id").notNull(),
  personaName: text("persona_name").notNull(),
  personaEmoji: text("persona_emoji").notNull(),
  messages: jsonb("messages").notNull(), // Store chat messages as JSON
  summary: text("summary").notNull(),
  userMemo: text("user_memo"),
  mood: text("mood"), // Emoji representing the mood
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Image Generation Concept Categories
export const conceptCategories = pgTable("concept_categories", {
  id: serial("id").primaryKey(),
  categoryId: text("category_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt"), // GPT-4o에게 이미지 분석을 위한 지침
  order: integer("order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Image Generation Concepts
export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  conceptId: text("concept_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  promptTemplate: text("prompt_template").notNull(),
  systemPrompt: text("system_prompt"),  // 이미지 분석 및 변환을 위한 시스템 프롬프트 추가
  thumbnailUrl: text("thumbnail_url"),
  // OpenAI 이미지 변환 관련 필드만 유지
  tagSuggestions: jsonb("tag_suggestions"), // Array of strings
  variables: jsonb("variables"), // Array of variable objects
  categoryId: text("category_id").references(() => conceptCategories.categoryId),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// A/B Testing tables
export const abTests = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  testId: text("test_id").notNull().unique(),
  conceptId: text("concept_id").references(() => concepts.conceptId),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const abTestVariants = pgTable("ab_test_variants", {
  id: serial("id").primaryKey(),
  testId: text("test_id").references(() => abTests.testId).notNull(),
  variantId: text("variant_id").notNull(),
  name: text("name").notNull(), // e.g., "Variant A", "Variant B"
  promptTemplate: text("prompt_template").notNull(),
  variables: jsonb("variables"), // Array of variable objects (same structure as in concepts)
  impressions: integer("impressions").default(0),
  conversions: integer("conversions").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const abTestResults = pgTable("ab_test_results", {
  id: serial("id").primaryKey(),
  testId: text("test_id").references(() => abTests.testId).notNull(),
  selectedVariantId: text("selected_variant_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  context: jsonb("context"), // Additional info (device, browser, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 사용자 관련 테이블 관계 정의
export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  refreshTokens: many(refreshTokens),
  userMilestones: many(userMilestones),
  pregnancyProfiles: many(pregnancyProfiles),
  hospital: one(hospitals, { fields: [users.hospitalId], references: [hospitals.id] })
}));

// 병원 관계 정의
export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  users: many(users)
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(userRoles)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] })
}));

// Define relations
export const musicRelations = relations(music, ({ one }) => ({
  favorite: one(favorites, {
    fields: [music.id],
    references: [favorites.itemId],
    relationName: 'music_favorite',
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  favorite: one(favorites, {
    fields: [images.id],
    references: [favorites.itemId],
    relationName: 'image_favorite',
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  music: one(music, {
    fields: [favorites.itemId],
    references: [music.id],
    relationName: 'music_favorite',
  }),
  image: one(images, {
    fields: [favorites.itemId],
    references: [images.id],
    relationName: 'image_favorite',
  }),
}));

// A/B Testing relations
export const abTestsRelations = relations(abTests, ({ one, many }) => ({
  concept: one(concepts, {
    fields: [abTests.conceptId],
    references: [concepts.conceptId]
  }),
  variants: many(abTestVariants),
  results: many(abTestResults)
}));

export const abTestVariantsRelations = relations(abTestVariants, ({ one, many }) => ({
  test: one(abTests, {
    fields: [abTestVariants.testId],
    references: [abTests.testId]
  }),
  results: many(abTestResults, {
    relationName: "variant_results"
  })
}));

export const abTestResultsRelations = relations(abTestResults, ({ one }) => ({
  test: one(abTests, {
    fields: [abTestResults.testId],
    references: [abTests.testId]
  }),
  variant: one(abTestVariants, {
    fields: [abTestResults.testId, abTestResults.selectedVariantId],
    references: [abTestVariants.testId, abTestVariants.variantId],
    relationName: "variant_results"
  }),
  user: one(users, {
    fields: [abTestResults.userId],
    references: [users.id]
  })
}));

// Pregnancy milestone system tables
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  milestoneId: text("milestone_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  weekStart: integer("week_start").notNull(), // Pregnancy week when milestone starts
  weekEnd: integer("week_end").notNull(), // Pregnancy week when milestone ends
  badgeEmoji: text("badge_emoji").notNull(), // Emoji representing the badge
  badgeImageUrl: text("badge_image_url"), // Optional image URL for the badge
  encouragementMessage: text("encouragement_message").notNull(), // Message to show when milestone is reached
  category: text("category").notNull(), // e.g., "baby_development", "maternal_health", "preparations"
  order: integer("order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userMilestones = pgTable("user_milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  milestoneId: text("milestone_id").references(() => milestones.milestoneId).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  notes: text("notes"), // Optional user notes about this milestone
  photoUrl: text("photo_url"), // Optional photo URL associated with this milestone
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pregnancyProfiles = pgTable("pregnancy_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dueDate: timestamp("due_date").notNull(),
  currentWeek: integer("current_week").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  babyNickname: text("baby_nickname"),
  babyGender: text("baby_gender"), // "boy", "girl", "unknown", "prefer_not_to_say"
  isFirstPregnancy: boolean("is_first_pregnancy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations for milestone tables
export const milestonesRelations = relations(milestones, ({ many }) => ({
  userMilestones: many(userMilestones)
}));

export const userMilestonesRelations = relations(userMilestones, ({ one }) => ({
  milestone: one(milestones, {
    fields: [userMilestones.milestoneId],
    references: [milestones.milestoneId]
  }),
  user: one(users, {
    fields: [userMilestones.userId],
    references: [users.id]
  })
}));

export const pregnancyProfilesRelations = relations(pregnancyProfiles, ({ one }) => ({
  user: one(users, {
    fields: [pregnancyProfiles.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "사용자명은 최소 3자 이상이어야 합니다."),
  password: (schema) => schema.min(6, "비밀번호는 최소 6자 이상이어야 합니다."), // 비밀번호 최소 길이 완화
  email: (schema) => schema.email("유효한 이메일 주소를 입력해주세요.").optional().nullable()
}).extend({
  // name 필드를 추가로 받아서 fullName에 매핑하기 위한 확장
  name: z.string().optional().nullable(),
  // phoneNumber 필드 추가
  phoneNumber: z.string().optional().nullable(),
  // birthdate 필드 추가
  birthdate: z.string().optional().nullable(),
});

export const insertHospitalSchema = createInsertSchema(hospitals);
export const insertRoleSchema = createInsertSchema(roles);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);

export const insertMusicSchema = createInsertSchema(music);
export const insertImageSchema = createInsertSchema(images);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertSavedChatSchema = createInsertSchema(savedChats);
export const insertPersonaSchema = createInsertSchema(personas);
export const insertPersonaCategorySchema = createInsertSchema(personaCategories);
export const insertConceptSchema = createInsertSchema(concepts);
export const insertConceptCategorySchema = createInsertSchema(conceptCategories);
export const insertAbTestSchema = createInsertSchema(abTests);
export const insertAbTestVariantSchema = createInsertSchema(abTestVariants);
export const insertAbTestResultSchema = createInsertSchema(abTestResults);
export const insertMilestoneSchema = createInsertSchema(milestones);
export const insertUserMilestoneSchema = createInsertSchema(userMilestones);
export const insertPregnancyProfileSchema = createInsertSchema(pregnancyProfiles);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// 인증 관련 타입
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;

// Milestone types
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

export type InsertUserMilestone = z.infer<typeof insertUserMilestoneSchema>;
export type UserMilestone = typeof userMilestones.$inferSelect;

export type InsertPregnancyProfile = z.infer<typeof insertPregnancyProfileSchema>;
export type PregnancyProfile = typeof pregnancyProfiles.$inferSelect;

export type InsertMusic = z.infer<typeof insertMusicSchema>;
export type Music = typeof music.$inferSelect;

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertSavedChat = z.infer<typeof insertSavedChatSchema>;
export type SavedChat = typeof savedChats.$inferSelect;

export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personas.$inferSelect;

export type InsertPersonaCategory = z.infer<typeof insertPersonaCategorySchema>;
export type PersonaCategory = typeof personaCategories.$inferSelect;

export type InsertConcept = z.infer<typeof insertConceptSchema>;
export type Concept = typeof concepts.$inferSelect;

export type InsertConceptCategory = z.infer<typeof insertConceptCategorySchema>;
export type ConceptCategory = typeof conceptCategories.$inferSelect;

export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type AbTest = typeof abTests.$inferSelect;

export type InsertAbTestVariant = z.infer<typeof insertAbTestVariantSchema>;
export type AbTestVariant = typeof abTestVariants.$inferSelect;

export type InsertAbTestResult = z.infer<typeof insertAbTestResultSchema>;
export type AbTestResult = typeof abTestResults.$inferSelect;

// 배너 데이터 스키마
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageSrc: text("image_src").notNull(),
  href: text("href").notNull(),
  isNew: boolean("is_new").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBannerSchema = createInsertSchema(banners);
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// 이미지 스타일 카드 스키마 
export const styleCards = pgTable("style_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
  styleId: text("style_id").notNull(),
  href: text("href").notNull(),
  isNew: boolean("is_new").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStyleCardSchema = createInsertSchema(styleCards);
export type InsertStyleCard = z.infer<typeof insertStyleCardSchema>;
export type StyleCard = typeof styleCards.$inferSelect;

// 서비스 카테고리 테이블 (사이드바 메뉴 관리)
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  categoryId: text("category_id").notNull().unique(), // 'image', 'music', 'chat' 등 카테고리 식별자
  title: text("title").notNull(), // 표시될 카테고리 제목
  isPublic: boolean("is_public").notNull().default(true), // 공개/비공개 설정
  icon: text("icon").notNull(), // Lucide 아이콘 이름
  order: integer("order").notNull().default(0), // 표시 순서
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories);
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;

// Export operators for query building
export { eq, desc, and, asc, sql, gte, lte, gt, lt, ne, like, notLike, isNull, isNotNull, inArray } from "drizzle-orm";
