/**
 * Dream Book 이미지 일관성 고도화 - 전역 규칙 Admin API
 * 작업지시서 5단계 관련 서버 API
 */

import { Router } from "express";
import { db } from "../db";
import { globalPromptRules } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// 전역 규칙 목록 조회
router.get("/", async (req, res) => {
  try {
    const rules = await db.query.globalPromptRules.findMany({
      orderBy: [desc(globalPromptRules.isActive), desc(globalPromptRules.createdAt)]
    });
    
    res.json(rules);
  } catch (error) {
    console.error("전역 규칙 목록 조회 오류:", error);
    res.status(500).json({ error: "전역 규칙 목록 조회에 실패했습니다." });
  }
});

// 전역 규칙 생성
router.post("/", async (req, res) => {
  try {
    const { name, jsonRules, isActive } = req.body;
    
    // 활성화하는 경우 다른 모든 규칙 비활성화
    if (isActive) {
      await db.update(globalPromptRules)
        .set({ isActive: false })
        .where(eq(globalPromptRules.isActive, true));
    }
    
    const [newRule] = await db.insert(globalPromptRules)
      .values({
        name,
        jsonRules,
        isActive: isActive || false
      })
      .returning();
      
    res.status(201).json(newRule);
  } catch (error) {
    console.error("전역 규칙 생성 오류:", error);
    res.status(500).json({ error: "전역 규칙 생성에 실패했습니다." });
  }
});

// 전역 규칙 수정
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, jsonRules, isActive } = req.body;
    
    // 활성화하는 경우 다른 모든 규칙 비활성화
    if (isActive) {
      await db.update(globalPromptRules)
        .set({ isActive: false })
        .where(eq(globalPromptRules.isActive, true));
    }
    
    const [updatedRule] = await db.update(globalPromptRules)
      .set({
        name,
        jsonRules,
        isActive: isActive || false,
        updatedAt: new Date()
      })
      .where(eq(globalPromptRules.id, parseInt(id)))
      .returning();
      
    if (!updatedRule) {
      return res.status(404).json({ error: "전역 규칙을 찾을 수 없습니다." });
    }
    
    res.json(updatedRule);
  } catch (error) {
    console.error("전역 규칙 수정 오류:", error);
    res.status(500).json({ error: "전역 규칙 수정에 실패했습니다." });
  }
});

// 전역 규칙 삭제
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 활성 규칙인지 확인
    const rule = await db.query.globalPromptRules.findFirst({
      where: eq(globalPromptRules.id, parseInt(id))
    });
    
    if (!rule) {
      return res.status(404).json({ error: "전역 규칙을 찾을 수 없습니다." });
    }
    
    if (rule.isActive) {
      return res.status(400).json({ error: "활성화된 전역 규칙은 삭제할 수 없습니다." });
    }
    
    await db.delete(globalPromptRules)
      .where(eq(globalPromptRules.id, parseInt(id)));
      
    res.json({ message: "전역 규칙이 삭제되었습니다." });
  } catch (error) {
    console.error("전역 규칙 삭제 오류:", error);
    res.status(500).json({ error: "전역 규칙 삭제에 실패했습니다." });
  }
});

// 규칙 활성화/비활성화 토글
router.put("/:id/toggle-active", async (req, res) => {
  try {
    const { id } = req.params;
    
    const rule = await db.query.globalPromptRules.findFirst({
      where: eq(globalPromptRules.id, parseInt(id))
    });
    
    if (!rule) {
      return res.status(404).json({ error: "전역 규칙을 찾을 수 없습니다." });
    }
    
    // 현재 비활성화인 경우 활성화 (다른 모든 규칙 비활성화)
    if (!rule.isActive) {
      await db.update(globalPromptRules)
        .set({ isActive: false })
        .where(eq(globalPromptRules.isActive, true));
    }
    
    // 선택된 규칙 토글
    const [updatedRule] = await db.update(globalPromptRules)
      .set({ 
        isActive: !rule.isActive,
        updatedAt: new Date()
      })
      .where(eq(globalPromptRules.id, parseInt(id)))
      .returning();
    
    res.json(updatedRule);
  } catch (error) {
    console.error("규칙 활성화 토글 오류:", error);
    res.status(500).json({ error: "규칙 활성화 상태 변경에 실패했습니다." });
  }
});

export default router;