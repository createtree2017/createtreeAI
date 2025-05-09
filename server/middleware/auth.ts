import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { roles, userRoles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hospitals } from '@shared/schema';

// 사용자 인증 여부 확인
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('인증 확인 - isAuthenticated:', req.isAuthenticated());
  console.log('세션 정보:', req.session);
  console.log('쿠키 정보:', req.cookies);
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
}

// 관리자 권한 확인
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('관리자 권한 확인 - isAuthenticated:', req.isAuthenticated());
  console.log('사용자 정보:', req.user);
  
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

  // 슈퍼관리자는 항상 접근 허용
  if (req.user.memberType === 'superadmin') {
    return next();
  }

  try {
    // 병원 관리자이고 소속 병원이 있는 경우, 병원의 활성 상태 확인
    if (req.user.memberType === 'hospital_admin' && req.user.hospitalId) {
      const userHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, req.user.hospitalId)
      });

      // 병원이 존재하지 않거나 비활성 상태인 경우 접근 거부
      if (!userHospital || !userHospital.isActive) {
        return res.status(403).json({ 
          error: '소속 병원이 비활성 상태입니다. 관리자에게 문의하세요.' 
        });
      }

      // 병원이 활성 상태이면 병원 관리자 접근 허용
      return next();
    }

    // 역할 기반 확인
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
      // 역할은 있지만 소속 병원이 없는 경우
      if (!req.user.hospitalId) {
        return res.status(403).json({ error: '소속 병원 정보가 없습니다.' });
      }

      // 소속 병원의 활성 상태 확인
      const userHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, req.user.hospitalId)
      });

      // 병원이 존재하지 않거나 비활성 상태인 경우 접근 거부
      if (!userHospital || !userHospital.isActive) {
        return res.status(403).json({ 
          error: '소속 병원이 비활성 상태입니다. 관리자에게 문의하세요.' 
        });
      }

      return next();
    }
    
    return res.status(403).json({ error: '병원 관리자 권한이 필요합니다.' });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return res.status(500).json({ error: '권한을 확인하는 중 오류가 발생했습니다.' });
  }
}