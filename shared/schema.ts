import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

// Define relations
export const musicRelations = relations(music, ({ one }) => ({
  favorite: one(favorites, {
    fields: [music.id],
    references: [favorites.itemId],
    relationName: 'music_favorite',
    condition: (eq, { itemType }) => eq(itemType, 'music'),
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  favorite: one(favorites, {
    fields: [images.id],
    references: [favorites.itemId],
    relationName: 'image_favorite',
    condition: (eq, { itemType }) => eq(itemType, 'image'),
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  music: one(music, {
    fields: [favorites.itemId],
    references: [music.id],
    relationName: 'music_favorite',
    condition: (eq, { itemType }) => eq(itemType, 'music'),
  }),
  image: one(images, {
    fields: [favorites.itemId],
    references: [images.id],
    relationName: 'image_favorite',
    condition: (eq, { itemType }) => eq(itemType, 'image'),
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMusicSchema = createInsertSchema(music);
export const insertImageSchema = createInsertSchema(images);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertSavedChatSchema = createInsertSchema(savedChats);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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

// Export eq and desc for query building
export { eq, desc, and, asc } from "drizzle-orm";
