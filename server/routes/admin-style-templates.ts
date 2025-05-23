/**
 * Dream Book 이미지 일관성 고도화 - 스타일 템플릿 Admin API
 * 작업지시서 4단계 관련 서버 API
 */

import { Router } from "express";
import { db } from "../db";
import { styleTemplates } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// 스타일 템플릿 목록 조회
router.get("/", async (req, res) => {
  try {
    const templates = await db.query.styleTemplates.findMany({
      orderBy: [desc(styleTemplates.isDefault), desc(styleTemplates.createdAt)]
    });
    
    res.json(templates);
  } catch (error) {
    console.error("스타일 템플릿 목록 조회 오류:", error);
    res.status(500).json({ error: "스타일 템플릿 목록 조회에 실패했습니다." });
  }
});

// 스타일 템플릿 생성
router.post("/", async (req, res) => {
  try {
    const { name, prompt, thumbnailUrl, isDefault } = req.body;
    
    // 기본값으로 설정하는 경우 다른 모든 템플릿의 기본값 해제
    if (isDefault) {
      await db.update(styleTemplates)
        .set({ isDefault: false })
        .where(eq(styleTemplates.isDefault, true));
    }
    
    const [newTemplate] = await db.insert(styleTemplates)
      .values({
        name,
        prompt,
        thumbnailUrl,
        isDefault: isDefault || false
      })
      .returning();
      
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("스타일 템플릿 생성 오류:", error);
    res.status(500).json({ error: "스타일 템플릿 생성에 실패했습니다." });
  }
});

// 스타일 템플릿 수정
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prompt, thumbnailUrl, isDefault } = req.body;
    
    // 기본값으로 설정하는 경우 다른 모든 템플릿의 기본값 해제
    if (isDefault) {
      await db.update(styleTemplates)
        .set({ isDefault: false })
        .where(eq(styleTemplates.isDefault, true));
    }
    
    const [updatedTemplate] = await db.update(styleTemplates)
      .set({
        name,
        prompt,
        thumbnailUrl,
        isDefault: isDefault || false,
        updatedAt: new Date()
      })
      .where(eq(styleTemplates.id, parseInt(id)))
      .returning();
      
    if (!updatedTemplate) {
      return res.status(404).json({ error: "스타일 템플릿을 찾을 수 없습니다." });
    }
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error("스타일 템플릿 수정 오류:", error);
    res.status(500).json({ error: "스타일 템플릿 수정에 실패했습니다." });
  }
});

// 스타일 템플릿 삭제
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 기본값인 템플릿인지 확인
    const template = await db.query.styleTemplates.findFirst({
      where: eq(styleTemplates.id, parseInt(id))
    });
    
    if (!template) {
      return res.status(404).json({ error: "스타일 템플릿을 찾을 수 없습니다." });
    }
    
    if (template.isDefault) {
      return res.status(400).json({ error: "기본 스타일 템플릿은 삭제할 수 없습니다." });
    }
    
    await db.delete(styleTemplates)
      .where(eq(styleTemplates.id, parseInt(id)));
      
    res.json({ message: "스타일 템플릿이 삭제되었습니다." });
  } catch (error) {
    console.error("스타일 템플릿 삭제 오류:", error);
    res.status(500).json({ error: "스타일 템플릿 삭제에 실패했습니다." });
  }
});

// 기본 스타일 설정
router.put("/:id/set-default", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 모든 템플릿의 기본값 해제
    await db.update(styleTemplates)
      .set({ isDefault: false })
      .where(eq(styleTemplates.isDefault, true));
    
    // 선택된 템플릿을 기본값으로 설정
    const [updatedTemplate] = await db.update(styleTemplates)
      .set({ 
        isDefault: true,
        updatedAt: new Date()
      })
      .where(eq(styleTemplates.id, parseInt(id)))
      .returning();
      
    if (!updatedTemplate) {
      return res.status(404).json({ error: "스타일 템플릿을 찾을 수 없습니다." });
    }
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error("기본 스타일 설정 오류:", error);
    res.status(500).json({ error: "기본 스타일 설정에 실패했습니다." });
  }
});

export default router;