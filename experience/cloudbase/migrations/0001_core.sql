-- Run once by the database owner against the EXISTING CloudBase PostgreSQL database.
-- No DROP, TRUNCATE, raw conversation storage, database creation, or D1 assumptions.
BEGIN;
CREATE TABLE IF NOT EXISTS flow_schema_versions(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS flow_wordcloud_submissions(id uuid PRIMARY KEY,body_hash char(64) NOT NULL,created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS flow_wordcloud_words(word text PRIMARY KEY CHECK(char_length(word) BETWEEN 2 AND 4),frequency bigint NOT NULL CHECK(frequency>0),updated_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS flow_words_frequency ON flow_wordcloud_words(frequency DESC,word);
CREATE INDEX IF NOT EXISTS flow_words_recent ON flow_wordcloud_words(updated_at DESC);
CREATE TABLE IF NOT EXISTS flow_api_limits(bucket text PRIMARY KEY,n integer NOT NULL CHECK(n>0),expires_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS flow_limits_expiry ON flow_api_limits(expires_at);
CREATE TABLE IF NOT EXISTS flow_image_jobs(id uuid PRIMARY KEY,body_hash char(64) NOT NULL,status text NOT NULL CHECK(status IN ('pending','complete','failed')),image_url text,expires_at bigint NOT NULL);
INSERT INTO flow_schema_versions(version) VALUES(1) ON CONFLICT(version) DO NOTHING;
COMMIT;
-- Runtime role needs only SELECT, INSERT, UPDATE on these tables. Schema changes
-- and occasional cleanup of expired limit rows belong to the database owner.
-- Keep image request tombstones to avoid billing twice after a temporary URL expires.
