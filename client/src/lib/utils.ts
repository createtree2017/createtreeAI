import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 초 단위의 시간을 MM:SS 형식으로 변환
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환 (예: 1024 -> 1KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 날짜를 한국 시간대로 형식화
 */
export function formatDate(dateString: string, options: Intl.DateTimeFormatOptions = {}): string {
  try {
    const date = new Date(dateString);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    return new Intl.DateTimeFormat('ko-KR', { ...defaultOptions, ...options }).format(date);
  } catch (e) {
    console.error("날짜 변환 오류:", e);
    return dateString;
  }
}

/**
 * 텍스트를 지정된 길이로 잘라내고 말줄임표 추가
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + "...";
}