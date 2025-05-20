/**
 * 개발 로그를 콘솔에 출력합니다.
 */
export function logDebug(message: string, ...args: any[]): void {
  console.log(`[DEBUG] ${message}`, ...args);
}

/**
 * 에러 로그를 콘솔에 출력합니다.
 */
export function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

/**
 * 정보 로그를 콘솔에 출력합니다.
 */
export function logInfo(message: string, ...args: any[]): void {
  console.info(`[INFO] ${message}`, ...args);
}

/**
 * 경고 로그를 콘솔에 출력합니다.
 */
export function logWarn(message: string, ...args: any[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}