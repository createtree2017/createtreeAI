// useToast.ts
import { useToast as useShadcnToast } from "@/components/ui/use-toast";

// 더 편리한 인터페이스 제공을 위한 래퍼 훅
export function useToast() {
  return useShadcnToast();
}