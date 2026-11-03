PRAGMA foreign_keys=ON;
CREATE TABLE submissions(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE wordcloud_entries(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL REFERENCES submissions(id),normalized_word TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(submission_id,normalized_word));
CREATE INDEX entries_word ON wordcloud_entries(normalized_word,created_at);
CREATE TABLE limits(bucket TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX limits_expiry ON limits(expires);
CREATE TABLE image_jobs(id TEXT PRIMARY KEY,body_hash TEXT NOT NULL,status TEXT NOT NULL,image_url TEXT,expires INTEGER NOT NULL);
CREATE INDEX jobs_expiry ON image_jobs(expires);
