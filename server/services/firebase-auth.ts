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
      // 병원 ID는 null로 설정 (사용자가 직접 선택하도록)
      hospitalId: null,
      // 전화번호와 출산예정일은 null로 설정 (사용자가 직접 입력하도록)
      phoneNumber: null,
      dueDate: null,
      needProfileComplete: true, // 프로필 완성이 필요함을 명시
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
  
  // 5. 추가 정보 입력 필요 여부 확인
  // needProfileComplete 필드가 명시적으로 false면 추가 정보 입력이 필요 없음
  // 아닌 경우 기본 조건인 전화번호 존재 여부로 판단
  const needSignup = user.needProfileComplete === false ? false : !user.phoneNumber;
  
  // 디버깅 정보 추가
  const dueDateFormatted = user.dueDate && user.dueDate instanceof Date && !isNaN(user.dueDate.getTime())
    ? user.dueDate.toISOString().split('T')[0] 
    : '(없음)';

  console.log(`[Firebase Auth 처리 완료] 
  - 사용자 ID: ${user.id}
  - 이메일: ${user.email}
  - 사용자명: ${user.username}
  - 회원 유형: ${user.memberType}
  - Firebase UID: ${user.firebaseUid}
  - 전화번호: ${user.phoneNumber || '(없음)'}
  - 출산예정일: ${dueDateFormatted}
  - needProfileComplete: ${user.needProfileComplete !== undefined ? (user.needProfileComplete ? '예' : '아니오') : '미설정'}
  - 추가 정보 입력 필요: ${needSignup ? '예' : '아니오'}`);
  
  // needSignup과 needProfileComplete 속성 추가하여 반환
  return {
    ...user,
    needSignup,
    needProfileComplete: user.needProfileComplete === false ? false : true // 명시적 false가 아니면 true로 설정
  };
}