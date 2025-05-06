/**
 * 브라우저 스토리지 유틸리티
 * 로컬 스토리지 및 세션 스토리지 관련 유틸리티 함수 모음
 */

// 로컬 스토리지에 데이터 저장
const setLocal = (key: string, value: any): void => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`로컬 스토리지에 저장 실패 (${key}):`, error);
  }
};

// 로컬 스토리지에서 데이터 가져오기
const getLocal = (key: string): any => {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return null;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error(`로컬 스토리지에서 가져오기 실패 (${key}):`, error);
    return null;
  }
};

// 로컬 스토리지에서 데이터 삭제
const removeLocal = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`로컬 스토리지에서 삭제 실패 (${key}):`, error);
  }
};

// 세션 스토리지에 데이터 저장
const setSession = (key: string, value: any): void => {
  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`세션 스토리지에 저장 실패 (${key}):`, error);
  }
};

// 세션 스토리지에서 데이터 가져오기
const getSession = (key: string): any => {
  try {
    const serializedValue = sessionStorage.getItem(key);
    if (serializedValue === null) {
      return null;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error(`세션 스토리지에서 가져오기 실패 (${key}):`, error);
    return null;
  }
};

// 세션 스토리지에서 데이터 삭제
const removeSession = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(`세션 스토리지에서 삭제 실패 (${key}):`, error);
  }
};

// 범용 스토리지 인터페이스 (기본적으로 세션 스토리지 사용)
export const storage = {
  // 가져오기 - 기본은 세션 스토리지
  get: (key: string, useLocalStorage = false): any => {
    return useLocalStorage ? getLocal(key) : getSession(key);
  },
  
  // 저장하기 - 기본은 세션 스토리지
  set: (key: string, value: any, useLocalStorage = false): void => {
    useLocalStorage ? setLocal(key, value) : setSession(key, value);
  },
  
  // 삭제하기 - 기본은 세션 스토리지
  remove: (key: string, useLocalStorage = false): void => {
    useLocalStorage ? removeLocal(key) : removeSession(key);
  },
  
  // 로컬 스토리지 직접 접근
  local: {
    get: getLocal,
    set: setLocal,
    remove: removeLocal
  },
  
  // 세션 스토리지 직접 접근
  session: {
    get: getSession,
    set: setSession,
    remove: removeSession
  }
};