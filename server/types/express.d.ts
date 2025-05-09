import { users } from "@shared/schema";
import { InferSelectModel } from "drizzle-orm";

declare global {
  namespace Express {
    interface User extends InferSelectModel<typeof users> {
      // 추가 사용자 필드가 필요하면 여기에 정의
    }
  }
}