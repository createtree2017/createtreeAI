import { Request, Response } from 'express';
import { db } from '../../db';
import { hospitals, users, roles, userRoles } from '@shared/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';

// 병원 관련 컨트롤러
export async function getAllHospitals(req: Request, res: Response) {
  try {
    const hospitalsList = await db.query.hospitals.findMany({
      orderBy: [desc(hospitals.createdAt)]
    });
    return res.status(200).json(hospitalsList);
  } catch (error) {
    console.error('병원 목록 조회 오류:', error);
    return res.status(500).json({ error: '병원 목록을 가져오는 중 오류가 발생했습니다.' });
  }
}

export async function getHospitalById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const hospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, parseInt(id))
    });
    
    if (!hospital) {
      return res.status(404).json({ error: '병원을 찾을 수 없습니다.' });
    }
    
    return res.status(200).json(hospital);
  } catch (error) {
    console.error('병원 정보 조회 오류:', error);
    return res.status(500).json({ error: '병원 정보를 가져오는 중 오류가 발생했습니다.' });
  }
}

export async function createHospital(req: Request, res: Response) {
  try {
    const hospitalData = req.body;
    
    // 필수 필드 검증
    if (!hospitalData.name) {
      return res.status(400).json({ error: '병원 이름은 필수입니다.' });
    }
    
    const [newHospital] = await db.insert(hospitals).values({
      name: hospitalData.name,
      address: hospitalData.address || null,
      phone: hospitalData.phone || null,
      email: hospitalData.email || null,
      domain: hospitalData.domain || null,
      logoUrl: hospitalData.logoUrl || null,
      themeColor: hospitalData.themeColor || null,
      contractStartDate: hospitalData.contractStartDate ? new Date(hospitalData.contractStartDate) : null,
      contractEndDate: hospitalData.contractEndDate ? new Date(hospitalData.contractEndDate) : null,
      packageType: hospitalData.packageType || 'basic',
      isActive: hospitalData.isActive !== undefined ? hospitalData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return res.status(201).json(newHospital);
  } catch (error) {
    console.error('병원 생성 오류:', error);
    return res.status(500).json({ error: '병원을 생성하는 중 오류가 발생했습니다.' });
  }
}

export async function updateHospital(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const hospitalData = req.body;
    
    // 병원 존재 여부 확인
    const existingHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, parseInt(id))
    });
    
    if (!existingHospital) {
      return res.status(404).json({ error: '병원을 찾을 수 없습니다.' });
    }
    
    // 업데이트 데이터
    const updateData: any = {
      ...hospitalData,
      updatedAt: new Date()
    };
    
    // Date 타입 필드 처리
    if (hospitalData.contractStartDate) {
      updateData.contractStartDate = new Date(hospitalData.contractStartDate);
    }
    if (hospitalData.contractEndDate) {
      updateData.contractEndDate = new Date(hospitalData.contractEndDate);
    }
    
    // 병원 상태(활성/비활성) 변경 확인
    const isStatusChanged = existingHospital.isActive !== hospitalData.isActive;
    
    // 병원 정보 업데이트
    const [updatedHospital] = await db.update(hospitals)
      .set(updateData)
      .where(eq(hospitals.id, parseInt(id)))
      .returning();
    
    // 병원이 비활성화되었을 경우 소속 사용자들의 멤버십을 변경
    if (isStatusChanged && hospitalData.isActive === false) {
      // 해당 병원에 소속된 사용자 목록 조회
      const hospitalUsers = await db.query.users.findMany({
        where: eq(users.hospitalId, parseInt(id))
      });
      
      // 사용자들의 멤버십을 일반 회원(general)으로 변경
      if (hospitalUsers.length > 0) {
        await db.update(users)
          .set({ 
            memberType: 'general',
            updatedAt: new Date()
          })
          .where(eq(users.hospitalId, parseInt(id)));
        
        console.log(`병원 ID ${id} 비활성화로 인해 ${hospitalUsers.length}명의 사용자 멤버십이 일반 회원으로 변경되었습니다.`);
      }
    }
    
    return res.status(200).json(updatedHospital);
  } catch (error) {
    console.error('병원 업데이트 오류:', error);
    return res.status(500).json({ error: '병원 정보를 업데이트하는 중 오류가 발생했습니다.' });
  }
}

export async function deleteHospital(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // 병원 존재 여부 확인
    const existingHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, parseInt(id))
    });
    
    if (!existingHospital) {
      return res.status(404).json({ error: '병원을 찾을 수 없습니다.' });
    }
    
    // 병원에 소속된 사용자가 있는지 확인
    const usersInHospital = await db.query.users.findMany({
      where: eq(users.hospitalId, parseInt(id))
    });
    
    if (usersInHospital.length > 0) {
      return res.status(400).json({ 
        error: '이 병원에 소속된 사용자가 있습니다. 먼저 사용자를 제거하거나 다른 병원으로 이동시켜주세요.' 
      });
    }
    
    // 병원 삭제
    await db.delete(hospitals).where(eq(hospitals.id, parseInt(id)));
    
    return res.status(200).json({ message: '병원이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('병원 삭제 오류:', error);
    return res.status(500).json({ error: '병원을 삭제하는 중 오류가 발생했습니다.' });
  }
}

// 회원 관련 컨트롤러
export async function getAllUsers(req: Request, res: Response) {
  try {
    const { search, hospitalId, memberType } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // 쿼리 조건 구성
    let conditions: any[] = [];
    
    if (search) {
      conditions.push(
        sql`(${users.username} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`} OR ${users.fullName} LIKE ${`%${search}%`})`
      );
    }
    
    if (hospitalId) {
      conditions.push(eq(users.hospitalId, parseInt(hospitalId as string)));
    }
    
    if (memberType) {
      conditions.push(eq(users.memberType, memberType as string));
    }
    
    // 최종 쿼리 조건
    const whereClause = conditions.length > 0 
      ? and(...conditions) 
      : undefined;
    
    // 사용자 목록 조회 - SQL 조인을 사용하여 직접 가져오기
    const usersList = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      memberType: users.memberType,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      hospitalId: users.hospitalId,
      hospitalName: hospitals.name
    })
    .from(users)
    .leftJoin(hospitals, eq(users.hospitalId, hospitals.id))
    .where(whereClause || sql`1=1`)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
    
    console.log("DB에서 받아온 사용자 목록:", JSON.stringify(usersList));
    
    // 총 사용자 수 계산
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause || sql`1=1`);
    
    const total = countResult[0]?.count || 0;
    
    return res.status(200).json({
      users: usersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return res.status(500).json({ error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' });
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // 사용자 기본 정보 조회
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id)),
      with: {
        roles: {
          with: {
            role: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 소속 병원 정보 직접 조회
    let hospital = null;
    if (user.hospitalId) {
      hospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, user.hospitalId)
      });
    }
    
    // 사용자 역할 정보 가공
    const roles = user.roles && user.roles.length ? user.roles.map((userRole: any) => ({
      id: userRole.roleId,
      name: userRole.role ? userRole.role.name : null,
      description: userRole.role ? userRole.role.description : null
    })) : [];
    
    // 비밀번호 필드 제외
    const { password, ...userData } = user;
    
    return res.status(200).json({
      ...userData,
      roles,
      hospital,
      hospitalName: hospital?.name || null
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return res.status(500).json({ error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    // 사용자 존재 여부 확인
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id))
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 현재 로그인한 사용자 확인
    const currentUser = req.user;
    
    // 슈퍼관리자가 아니면 병원 정보 수정 불가
    if (currentUser && currentUser.memberType !== 'superadmin' && 
        userData.hospitalId !== undefined && 
        userData.hospitalId !== existingUser.hospitalId) {
      return res.status(403).json({ 
        error: '슈퍼관리자만 병원 정보를 수정할 수 있습니다.' 
      });
    }
    
    // 업데이트 데이터 (비밀번호 필드는 제외)
    const { password, roles: userRolesList, ...updateData } = userData;
    updateData.updatedAt = new Date();
    
    // 사용자 정보 업데이트
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();
    
    // 역할 업데이트 (제공된 경우)
    if (userRolesList && Array.isArray(userRolesList)) {
      // 기존 역할 삭제
      await db.delete(userRoles).where(eq(userRoles.userId, parseInt(id)));
      
      // 새 역할 추가
      if (userRolesList.length > 0) {
        const newUserRoles = userRolesList.map(roleId => ({
          userId: parseInt(id),
          roleId: typeof roleId === 'string' ? parseInt(roleId) : roleId,
          createdAt: new Date()
        }));
        
        await db.insert(userRoles).values(newUserRoles);
      }
    }
    
    // 병원 정보 조회 (업데이트된 병원 정보가 있을 경우)
    let hospitalName = null;
    if (updatedUser.hospitalId) {
      const hospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, updatedUser.hospitalId)
      });
      hospitalName = hospital?.name || null;
    }
    
    return res.status(200).json({
      ...updatedUser,
      hospitalName,
      message: '사용자 정보가 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return res.status(500).json({ error: '사용자 정보를 업데이트하는 중 오류가 발생했습니다.' });
  }
}

export async function getAllRoles(req: Request, res: Response) {
  try {
    const rolesList = await db.query.roles.findMany();
    return res.status(200).json(rolesList);
  } catch (error) {
    console.error('역할 목록 조회 오류:', error);
    return res.status(500).json({ error: '역할 목록을 가져오는 중 오류가 발생했습니다.' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // 사용자 존재 여부 확인
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id))
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 관리자가 자기 자신을 삭제하려는 경우 방지
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(400).json({ error: '자기 자신을 삭제할 수 없습니다.' });
    }
    
    // 슈퍼관리자 삭제 방지 (보안상 이유로 - superadmin 계정은 최소 하나 이상 존재해야 함)
    if (existingUser.memberType === 'superadmin') {
      // 슈퍼관리자 계정 수 확인
      const superadminCount = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.memberType, 'superadmin'));
        
      if (superadminCount[0]?.count <= 1) {
        return res.status(400).json({ 
          error: '마지막 슈퍼관리자 계정은 삭제할 수 없습니다. 최소 하나의 슈퍼관리자 계정이 필요합니다.' 
        });
      }
    }
    
    // 사용자 관련 역할 정보 삭제
    await db.delete(userRoles).where(eq(userRoles.userId, parseInt(id)));
    
    // 사용자 삭제
    await db.delete(users).where(eq(users.id, parseInt(id)));
    
    return res.status(200).json({ message: '사용자가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return res.status(500).json({ error: '사용자를 삭제하는 중 오류가 발생했습니다.' });
  }
}