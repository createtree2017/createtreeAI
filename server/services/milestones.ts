/**
 * Milestone service for pregnancy milestone tracking and achievements
 */
import { db } from "../../db";
import { 
  milestones, 
  userMilestones, 
  pregnancyProfiles,
  eq, 
  and,
  gte,
  lte,
  desc,
  asc
} from "../../shared/schema";
import { addWeeks, differenceInWeeks } from "date-fns";

/**
 * Get a user's pregnancy profile or create one if it doesn't exist
 */
export async function getOrCreatePregnancyProfile(userId: number, dueDate?: Date) {
  // Try to find existing profile
  const existingProfile = await db.query.pregnancyProfiles.findFirst({
    where: eq(pregnancyProfiles.userId, userId)
  });
  
  if (existingProfile) {
    return existingProfile;
  }
  
  // Create new profile if dueDate is provided
  if (dueDate) {
    const today = new Date();
    
    // Calculate current week based on due date
    // Pregnancy is typically 40 weeks, so we can determine current week
    // by calculating backwards from the due date
    const startDate = addWeeks(dueDate, -40); // 40 weeks before due date
    let currentWeek = differenceInWeeks(today, startDate);
    
    // Keep within valid range
    currentWeek = Math.max(1, Math.min(currentWeek, 40));
    
    const [newProfile] = await db.insert(pregnancyProfiles).values({
      userId,
      dueDate,
      currentWeek,
      lastUpdated: today,
      createdAt: today
    }).returning();
    
    return newProfile;
  }
  
  return null;
}

/**
 * Update a user's pregnancy profile
 */
export async function updatePregnancyProfile(
  userId: number, 
  profileData: {
    dueDate?: Date;
    currentWeek?: number;
    babyNickname?: string;
    babyGender?: string;
    isFirstPregnancy?: boolean;
  }
) {
  const today = new Date();
  
  // Try to find existing profile
  const existingProfile = await db.query.pregnancyProfiles.findFirst({
    where: eq(pregnancyProfiles.userId, userId)
  });
  
  if (existingProfile) {
    // Update existing profile
    const [updatedProfile] = await db.update(pregnancyProfiles)
      .set({
        ...profileData,
        lastUpdated: today
      })
      .where(eq(pregnancyProfiles.userId, userId))
      .returning();
      
    return updatedProfile;
  } else if (profileData.dueDate) {
    // Create new profile
    let currentWeek = profileData.currentWeek;
    
    if (!currentWeek && profileData.dueDate) {
      // Calculate current week based on due date if not provided
      const startDate = addWeeks(profileData.dueDate, -40);
      currentWeek = differenceInWeeks(today, startDate);
      currentWeek = Math.max(1, Math.min(currentWeek, 40)); // Keep within valid range
    }
    
    const [newProfile] = await db.insert(pregnancyProfiles).values({
      userId,
      dueDate: profileData.dueDate,
      currentWeek: currentWeek || 1,
      babyNickname: profileData.babyNickname,
      babyGender: profileData.babyGender,
      isFirstPregnancy: profileData.isFirstPregnancy,
      lastUpdated: today,
      createdAt: today
    }).returning();
    
    return newProfile;
  }
  
  return null;
}

/**
 * Get available milestones based on the user's current pregnancy week
 */
export async function getAvailableMilestones(userId: number) {
  // Get user's pregnancy profile
  const profile = await db.query.pregnancyProfiles.findFirst({
    where: eq(pregnancyProfiles.userId, userId)
  });
  
  if (!profile) {
    return [];
  }
  
  // Get the milestones available for the user's current week
  const availableMilestones = await db.query.milestones.findMany({
    where: and(
      lte(milestones.weekStart, profile.currentWeek),
      gte(milestones.weekEnd, profile.currentWeek),
      eq(milestones.isActive, true)
    ),
    orderBy: [asc(milestones.order)]
  });
  
  // Get user's already completed milestones
  const completedMilestones = await db.query.userMilestones.findMany({
    where: eq(userMilestones.userId, userId),
    with: {
      milestone: true
    }
  });
  
  const completedMilestoneIds = new Set(
    completedMilestones.map(um => um.milestoneId)
  );
  
  // Filter out already completed milestones
  return availableMilestones.filter(
    milestone => !completedMilestoneIds.has(milestone.milestoneId)
  );
}

/**
 * Get all milestones grouped by category
 */
export async function getAllMilestones() {
  const allMilestones = await db.query.milestones.findMany({
    where: eq(milestones.isActive, true),
    orderBy: [asc(milestones.weekStart), asc(milestones.order)]
  });
  
  // Group milestones by category
  const groupedMilestones: Record<string, typeof allMilestones> = {};
  
  for (const milestone of allMilestones) {
    if (!groupedMilestones[milestone.category]) {
      groupedMilestones[milestone.category] = [];
    }
    groupedMilestones[milestone.category].push(milestone);
  }
  
  return groupedMilestones;
}

/**
 * Get a user's completed milestones
 */
export async function getUserCompletedMilestones(userId: number) {
  return db.query.userMilestones.findMany({
    where: eq(userMilestones.userId, userId),
    with: {
      milestone: true
    },
    orderBy: [desc(userMilestones.completedAt)]
  });
}

/**
 * Mark a milestone as completed for a user
 */
export async function completeMilestone(
  userId: number, 
  milestoneId: string,
  notes?: string
  // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
) {
  // Check if already completed
  const existing = await db.query.userMilestones.findFirst({
    where: and(
      eq(userMilestones.userId, userId),
      eq(userMilestones.milestoneId, milestoneId)
    )
  });
  
  if (existing) {
    // Update existing entry
    const [updated] = await db.update(userMilestones)
      .set({
        notes: notes || existing.notes
        // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
      })
      .where(and(
        eq(userMilestones.userId, userId),
        eq(userMilestones.milestoneId, milestoneId)
      ))
      .returning();
      
    // Get milestone details
    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.milestoneId, milestoneId)
    });
    
    return { userMilestone: updated, milestone };
  }
  
  // Create new completion
  const [newCompletion] = await db.insert(userMilestones).values({
    userId,
    milestoneId,
    notes,
    // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
    completedAt: new Date(),
    createdAt: new Date()
  }).returning();
  
  // Get milestone details
  const milestone = await db.query.milestones.findFirst({
    where: eq(milestones.milestoneId, milestoneId)
  });
  
  return { userMilestone: newCompletion, milestone };
}

/**
 * Get a user's achievement statistics
 */
export async function getUserAchievementStats(userId: number) {
  // Get user's completed milestones
  const completedMilestones = await getUserCompletedMilestones(userId);
  
  // Get total available milestones
  const totalMilestones = await db.query.milestones.findMany({
    where: eq(milestones.isActive, true)
  });
  
  // Get milestones by category
  const allMilestones = await getAllMilestones();
  const categories = Object.keys(allMilestones);
  
  // Calculate category completion rates
  const categoryCompletion: Record<string, { completed: number, total: number, percent: number }> = {};
  
  for (const category of categories) {
    const totalInCategory = allMilestones[category].length;
    const completedInCategory = completedMilestones.filter(
      um => um.milestone.category === category
    ).length;
    
    categoryCompletion[category] = {
      completed: completedInCategory,
      total: totalInCategory,
      percent: totalInCategory > 0 ? (completedInCategory / totalInCategory) * 100 : 0
    };
  }
  
  return {
    totalCompleted: completedMilestones.length,
    totalAvailable: totalMilestones.length,
    completionRate: totalMilestones.length > 0 ? 
      (completedMilestones.length / totalMilestones.length) * 100 : 0,
    categories: categoryCompletion,
    recentlyCompleted: completedMilestones.slice(0, 5) // Most recent 5
  };
}

/**
 * 관리자용 마일스톤 CRUD 함수
 */

/**
 * 마일스톤 생성 함수
 */
export async function createMilestone(milestoneData: {
  title: string;
  description: string;
  category: string;
  weekStart: number;
  weekEnd: number;
  badgeEmoji: string;
  badgeImageUrl?: string;
  encouragementMessage: string;
  order: number;
  isActive: boolean;
}) {
  const milestoneId = `${milestoneData.category}-${Date.now()}`;
  
  const [newMilestone] = await db.insert(milestones).values({
    ...milestoneData,
    milestoneId,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  
  return newMilestone;
}

/**
 * 마일스톤 업데이트 함수
 */
export async function updateMilestone(
  milestoneId: string,
  milestoneData: Partial<{
    title: string;
    description: string;
    category: string;
    weekStart: number;
    weekEnd: number;
    badgeEmoji: string;
    badgeImageUrl: string | null;
    encouragementMessage: string;
    order: number;
    isActive: boolean;
  }>
) {
  const [updatedMilestone] = await db.update(milestones)
    .set({
      ...milestoneData,
      updatedAt: new Date()
    })
    .where(eq(milestones.milestoneId, milestoneId))
    .returning();
    
  return updatedMilestone;
}

/**
 * 마일스톤 삭제 함수
 */
export async function deleteMilestone(milestoneId: string) {
  // 먼저 해당 마일스톤과 관련된 모든 유저 마일스톤 데이터 삭제
  await db.delete(userMilestones)
    .where(eq(userMilestones.milestoneId, milestoneId));
  
  // 이후 마일스톤 삭제
  const [deletedMilestone] = await db.delete(milestones)
    .where(eq(milestones.milestoneId, milestoneId))
    .returning();
    
  return deletedMilestone;
}

/**
 * 특정 마일스톤 가져오기
 */
export async function getMilestoneById(milestoneId: string) {
  return db.query.milestones.findFirst({
    where: eq(milestones.milestoneId, milestoneId)
  });
}