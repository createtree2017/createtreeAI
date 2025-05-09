CREATE TABLE IF NOT EXISTS "ab_test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"selected_variant_id" text NOT NULL,
	"user_id" integer,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ab_test_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"name" text NOT NULL,
	"prompt_template" text NOT NULL,
	"variables" jsonb,
	"impressions" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"concept_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ab_tests_test_id_unique" UNIQUE("test_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_src" text NOT NULL,
	"href" text NOT NULL,
	"is_new" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concept_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text,
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "concept_categories_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"prompt_template" text NOT NULL,
	"system_prompt" text,
	"thumbnail_url" text,
	"tag_suggestions" jsonb,
	"variables" jsonb,
	"category_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "concepts_concept_id_unique" UNIQUE("concept_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"style" text NOT NULL,
	"original_url" text NOT NULL,
	"transformed_url" text NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"milestone_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"week_start" integer NOT NULL,
	"week_end" integer NOT NULL,
	"badge_emoji" text NOT NULL,
	"badge_image_url" text,
	"encouragement_message" text NOT NULL,
	"category" text NOT NULL,
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "milestones_milestone_id_unique" UNIQUE("milestone_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "music" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"baby_name" text NOT NULL,
	"style" text NOT NULL,
	"url" text NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "persona_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"emoji" text NOT NULL,
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "persona_categories_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"name" text NOT NULL,
	"avatar_emoji" text NOT NULL,
	"description" text NOT NULL,
	"welcome_message" text NOT NULL,
	"system_prompt" text NOT NULL,
	"primary_color" text NOT NULL,
	"secondary_color" text NOT NULL,
	"personality" text,
	"tone" text,
	"usage_context" text,
	"emotional_keywords" jsonb,
	"time_of_day" text DEFAULT 'all',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0,
	"use_count" integer DEFAULT 0 NOT NULL,
	"categories" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "personas_persona_id_unique" UNIQUE("persona_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pregnancy_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"current_week" integer NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"baby_nickname" text,
	"baby_gender" text,
	"is_first_pregnancy" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"persona_id" text NOT NULL,
	"persona_name" text NOT NULL,
	"persona_emoji" text NOT NULL,
	"messages" jsonb NOT NULL,
	"summary" text NOT NULL,
	"user_memo" text,
	"mood" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"title" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"icon" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "style_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image_src" text NOT NULL,
	"style_id" text NOT NULL,
	"href" text NOT NULL,
	"is_new" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"milestone_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" varchar(255),
	"full_name" varchar(100),
	"email_verified" boolean DEFAULT false,
	"member_type" varchar(20) DEFAULT 'general',
	"hospital_id" integer,
	"promo_code" varchar(50),
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_test_id_ab_tests_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("test_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_test_id_ab_tests_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("test_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_concept_id_concepts_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("concept_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concepts" ADD CONSTRAINT "concepts_category_id_concept_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."concept_categories"("category_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pregnancy_profiles" ADD CONSTRAINT "pregnancy_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_milestones" ADD CONSTRAINT "user_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_milestones" ADD CONSTRAINT "user_milestones_milestone_id_milestones_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("milestone_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
