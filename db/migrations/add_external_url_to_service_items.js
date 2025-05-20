import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from '../../shared/schema';

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// drizzle 인스턴스 생성
const db = drizzle(pool, { schema });

// 마이그레이션 실행
async function runMigration() {
  try {
    console.log('serviceItems 테이블에 externalUrl 필드 추가 시작...');
    
    // SQL 쿼리 직접 실행: externalUrl 컬럼 추가
    await pool.query(`
      ALTER TABLE service_items
      ADD COLUMN IF NOT EXISTS external_url TEXT;
    `);
    
    console.log('✅ serviceItems 테이블에 externalUrl 필드 추가 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    process.exit(1);
  }
}

runMigration();