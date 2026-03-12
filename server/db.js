import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, '..', 'data', 'pet.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT    PRIMARY KEY,
    device_id  TEXT    NOT NULL,
    title      TEXT    NOT NULL DEFAULT '新对话',
    messages   TEXT    NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
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
    can_edit_knowledge INTEGER NOT NULL DEFAULT 0,
    disabled           INTEGER NOT NULL DEFAULT 0,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  CREATE TABLE IF NOT EXISTS character_prompts (
    character_key        TEXT PRIMARY KEY,
    persona              TEXT,
    chat_flow            TEXT,
    fortune_instructions TEXT,
    updated_at           INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge_bases (
    id            TEXT PRIMARY KEY,
    character_key TEXT NOT NULL,
    type          TEXT NOT NULL,
    data          TEXT NOT NULL DEFAULT '{}',
    updated_at    INTEGER NOT NULL,
    UNIQUE(character_key, type)
  );
`)

export function listConversations(deviceId) {
  return db
    .prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE device_id = ? ORDER BY updated_at DESC')
    .all(deviceId)
}

export function getConversation(id) {
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, messages: JSON.parse(row.messages) }
}

export function createConversation(deviceId, title = '新对话', messages = []) {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    'INSERT INTO conversations (id, device_id, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, deviceId, title, JSON.stringify(messages), now, now)
  return { id, title, created_at: now, updated_at: now }
}

export function updateConversation(id, messages, title) {
  const now = Date.now()
  if (title !== undefined) {
    db.prepare('UPDATE conversations SET messages = ?, title = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(messages), title, now, id)
  } else {
    db.prepare('UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(messages), now, id)
  }
}

export function deleteConversation(id) {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

// ── 用户 CRUD ───────────────────────────────────────────────

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function createUser(username, email, passwordHash, role = 'user', displayName = '') {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    'INSERT INTO users (id, username, email, password, role, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, email || null, passwordHash, role, displayName || username, now, now)
  return getUserById(id)
}

export function listUsers(role) {
  if (role) return db.prepare('SELECT id, username, email, role, display_name, bio, disabled, created_at FROM users WHERE role = ? ORDER BY created_at DESC').all(role)
  return db.prepare('SELECT id, username, email, role, display_name, bio, disabled, created_at FROM users ORDER BY created_at DESC').all()
}

export function updateUser(id, fields) {
  const now = Date.now()
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  const vals = [...Object.values(fields), now, id]
  db.prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`).run(...vals)
  return getUserById(id)
}

export function countUsers() {
  return db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all()
}

// ── 人设 CRUD ───────────────────────────────────────────────

export function getCharacterPrompt(characterKey) {
  return db.prepare('SELECT * FROM character_prompts WHERE character_key = ?').get(characterKey)
}

export function upsertCharacterPrompt(characterKey, fields) {
  const now = Date.now()
  const existing = getCharacterPrompt(characterKey)
  if (existing) {
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE character_prompts SET ${sets}, updated_at = ? WHERE character_key = ?`)
      .run(...Object.values(fields), now, characterKey)
  } else {
    db.prepare('INSERT INTO character_prompts (character_key, persona, chat_flow, fortune_instructions, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(characterKey, fields.persona || null, fields.chat_flow || null, fields.fortune_instructions || null, now)
  }
  return getCharacterPrompt(characterKey)
}

// ── 知识库 CRUD ─────────────────────────────────────────────

export function getKnowledgeBase(characterKey, type) {
  return db.prepare('SELECT * FROM knowledge_bases WHERE character_key = ? AND type = ?').get(characterKey, type)
}

export function upsertKnowledgeBase(characterKey, type, data) {
  const now = Date.now()
  const existing = getKnowledgeBase(characterKey, type)
  if (existing) {
    db.prepare('UPDATE knowledge_bases SET data = ?, updated_at = ? WHERE character_key = ? AND type = ?')
      .run(JSON.stringify(data), now, characterKey, type)
  } else {
    db.prepare('INSERT INTO knowledge_bases (id, character_key, type, data, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), characterKey, type, JSON.stringify(data), now)
  }
  return getKnowledgeBase(characterKey, type)
}
