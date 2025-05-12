-- Add user_id column to images table
ALTER TABLE images ADD COLUMN user_id varchar(128);
CREATE INDEX idx_images_user ON images(user_id);