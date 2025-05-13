-- 캠페인 테이블에 새로운 날짜 및 상태 필드 추가
ALTER TABLE campaigns
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN announce_date DATE,
ADD COLUMN content_start_date DATE,
ADD COLUMN content_end_date DATE,
ADD COLUMN result_date DATE,
ADD COLUMN reward_point INTEGER DEFAULT 0,
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN content TEXT,
ADD COLUMN status TEXT DEFAULT 'draft';