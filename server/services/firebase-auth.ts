/**
 * Firebase 인증 서비스
 * 클라이언트에서 받은 Firebase 사용자 정보를 처리하고
 * 기존 세션 기반 인증과 통합하는 역할을 합니다.
 */
import { db } from "../../db";
import { users, eq } from "../../shared/schema";

/**
 * Firebase 사용자 정보 타입 정의
 * 주의: 필드 이름이 데이터베이스 컬럼과 일치해야 함
 */
export interface FirebaseUserData {
  uid: string;
  email: string;
  displayName?: string;
  // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
  // phoneNumber?: string; // phone_number 필드도 데이터베이스에 존재하지 않아 제거
}

/**
 * Firebase 로그인 또는 회원가입 처리
 * 사용자가 존재하지 않으면 새로 생성하고, 있으면 정보 업데이트 후 로그인
 */
export async function handleFirebaseAuth(firebaseUser: FirebaseUserData) {
  // 1. 이메일로 사용자 찾기
  let user = await db.query.users.findFirst({
    where: eq(users.email, firebaseUser.email)
  });

  // 2. 사용자가 없으면 새로 생성
  if (!user) {
    console.log(`[Firebase Auth] 신규 사용자 생성: ${firebaseUser.email}`);
    
    // Firebase 유저 정보로 새 계정 생성
    const [newUser] = await db.insert(users).values({
      username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
      email: firebaseUser.email,
      fullName: firebaseUser.displayName || '',
      password: '', // Firebase 인증 사용자는 직접 비밀번호 로그인 불가능
      firebaseUid: firebaseUser.uid,
      emailVerified: true, // Firebase 인증은 이메일이 이미 검증됨
      memberType: 'general', // 기본 회원 타입
      // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
      // phoneNumber: firebaseUser.phoneNumber || null, // phone_number 필드도 데이터베이스에 존재하지 않음
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    user = newUser;
  } 
  // 3. 사용자가 있지만 Firebase UID가 없으면 업데이트
  else if (!user.firebaseUid) {
    console.log(`[Firebase Auth] 기존 사용자 Firebase 연결: ${user.email}`);
    
    // 기존 사용자에게 Firebase UID 연결
    const [updatedUser] = await db.update(users)
      .set({
        firebaseUid: firebaseUser.uid,
        emailVerified: true,
        // photoUrl 필드는 데이터베이스에 존재하지 않아 제거
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();
      
    user = updatedUser;
  }
  // 4. 사용자가 있고 Firebase UID도 있으면 로그인 처리만
  else {
    console.log(`[Firebase Auth] 기존 Firebase 사용자 로그인: ${user.email}`);
    
    // 마지막 로그인 시간 업데이트
    const [updatedUser] = await db.update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();
      
    user = updatedUser;
  }
  
  // 5. 세션 생성을 위해 필요한 정보만 반환
  return user;
}