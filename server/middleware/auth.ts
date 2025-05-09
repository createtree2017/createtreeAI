import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { roles, userRoles } from '@shared/schema';
import { eq, and } from '@shared/schema';

// 사용자 인증 여부 확인
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
}

// 관리자 권한 확인
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // member_type이 'admin' 또는 'superadmin'인 경우 허용
  if (req.user.memberType === 'admin' || req.user.memberType === 'superadmin') {
    return next();
  }

  // 사용자의 역할 확인
  try {
    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'admin')
    });

    if (!adminRole) {
      return res.status(500).json({ error: '관리자 역할을 찾을 수 없습니다.' });
    }

    const userRole = await db.query.userRoles.findFirst({
      where: and(
        eq(userRoles.userId, req.user.id),
        eq(userRoles.roleId, adminRole.id)
      )
    });

    if (userRole) {
      return next();
    }
    
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return res.status(500).json({ error: '권한을 확인하는 중 오류가 발생했습니다.' });
  }
}

// 슈퍼관리자 권한 확인
export async function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // member_type이 'superadmin'인 경우 허용
  if (req.user.memberType === 'superadmin') {
    return next();
  }

  // 사용자의 역할 확인
  try {
    const superAdminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'superadmin')
    });

    if (!superAdminRole) {
      return res.status(500).json({ error: '슈퍼관리자 역할을 찾을 수 없습니다.' });
    }

    const userRole = await db.query.userRoles.findFirst({
      where: and(
        eq(userRoles.userId, req.user.id),
        eq(userRoles.roleId, superAdminRole.id)
      )
    });

    if (userRole) {
      return next();
    }
    
    return res.status(403).json({ error: '슈퍼관리자 권한이 필요합니다.' });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return res.status(500).json({ error: '권한을 확인하는 중 오류가 발생했습니다.' });
  }
}

// 병원 관리자 권한 확인
export async function isHospitalAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // member_type이 'hospital_admin'인 경우 또는 'superadmin'인 경우 허용
  if (req.user.memberType === 'hospital_admin' || req.user.memberType === 'superadmin') {
    return next();
  }

  // 사용자의 역할 확인
  try {
    const hospitalAdminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'hospital_admin')
    });

    if (!hospitalAdminRole) {
      return res.status(500).json({ error: '병원 관리자 역할을 찾을 수 없습니다.' });
    }

    const userRole = await db.query.userRoles.findFirst({
      where: and(
        eq(userRoles.userId, req.user.id),
        eq(userRoles.roleId, hospitalAdminRole.id)
      )
    });

    if (userRole) {
      return next();
    }
    
    return res.status(403).json({ error: '병원 관리자 권한이 필요합니다.' });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return res.status(500).json({ error: '권한을 확인하는 중 오류가 발생했습니다.' });
  }
}