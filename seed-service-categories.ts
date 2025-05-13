import { db } from "./db";
import * as schema from "./shared/schema";

async function main() {
  try {
    console.log("🌱 서비스 카테고리 시드 데이터 생성 시작...");
    
    const defaultCategories = [
      {
        categoryId: "image",
        title: "AI 이미지 만들기",
        icon: "image",
        isPublic: true,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryId: "music",
        title: "AI 노래 만들기",
        icon: "music",
        isPublic: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryId: "chat",
        title: "AI 친구 만들기",
        icon: "message-circle",
        isPublic: false,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryId: "milestone",
        title: "마일스톤",
        icon: "award",
        isPublic: true,
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // 각 카테고리에 대해 존재하는지 확인하고 없으면 추가
    for (const category of defaultCategories) {
      const existing = await db.query.serviceCategories.findFirst({
        where: schema.eq(schema.serviceCategories.categoryId, category.categoryId)
      });
      
      if (!existing) {
        await db.insert(schema.serviceCategories).values(category);
        console.log(`✅ 카테고리 추가됨: ${category.title} (${category.categoryId})`);
      } else {
        console.log(`🔄 카테고리 이미 존재함: ${category.title} (${category.categoryId})`);
      }
    }
    
    console.log("🌱 서비스 카테고리 시드 데이터 생성 완료!");
  } catch (error) {
    console.error("❌ 시드 데이터 생성 오류:", error);
  }
}

main().then(() => process.exit(0));