-- Supabase 数据库 schema（首次部署时可在 SQL Editor 中执行，或由应用自动创建）
CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT    PRIMARY KEY,
  device_id  TEXT    NOT NULL,
  title      TEXT    NOT NULL DEFAULT '新对话',
  messages   TEXT    NOT NULL DEFAULT '[]',
  created_at BIGINT  NOT NULL,
  updated_at BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_device ON conversations(device_id);

CREATE TABLE IF NOT EXISTS users (
  id                 TEXT    PRIMARY KEY,
  username           TEXT    NOT NULL UNIQUE,
  email              TEXT    UNIQUE,
  password           TEXT    NOT NULL,
  role               TEXT    NOT NULL DEFAULT 'user',
  display_name       TEXT,
  bio                TEXT,
  character_key      TEXT    DEFAULT 'liliana',
  can_edit_knowledge INT     NOT NULL DEFAULT 0,
  disabled           INT     NOT NULL DEFAULT 0,
  created_at         BIGINT  NOT NULL,
  updated_at         BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS character_prompts (
  character_key        TEXT PRIMARY KEY,
  persona              TEXT,
  chat_flow            TEXT,
  fortune_instructions TEXT,
  updated_at           BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id            TEXT PRIMARY KEY,
  character_key TEXT NOT NULL,
  type          TEXT NOT NULL,
  data          TEXT NOT NULL DEFAULT '{}',
  updated_at    BIGINT NOT NULL,
  UNIQUE(character_key, type)
);
