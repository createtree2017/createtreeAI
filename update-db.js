import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function main() {
  // 데이터베이스 연결
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // concepts 테이블에 reference_image_url 컬럼 추가
    await db.execute(sql`
      ALTER TABLE concepts 
      ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
      ADD COLUMN IF NOT EXISTS use_photo_maker BOOLEAN DEFAULT FALSE
    `);
    
    console.log('데이터베이스 스키마 업데이트 성공!');
  } catch (error) {
    console.error('데이터베이스 업데이트 오류:', error);
  } finally {
    // 연결 종료
    await client.end();
  }
}

main().catch(console.error);
