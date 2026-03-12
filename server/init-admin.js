/**
 * 初始化管理员账号
 * 用法: node server/init-admin.js <用户名> <密码>
 */
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const { default: Database } = await import('better-sqlite3')
const { randomUUID } = await import('crypto')

const [,, username, password] = process.argv
if (!username || !password) {
  console.error('用法: node server/init-admin.js <用户名> <密码>')
  process.exit(1)
}

const db = new Database(path.join(__dirname, '..', 'data', 'pet.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT UNIQUE,
    password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT, bio TEXT, disabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
`)

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
if (existing) {
  console.log(`用户 "${username}" 已存在，更新为管理员角色…`)
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE username = ?').run('admin', Date.now(), username)
} else {
  const hash = bcrypt.hashSync(password, 10)
  const id = randomUUID()
  const now = Date.now()
  db.prepare('INSERT INTO users (id, username, password, role, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, username, hash, 'admin', username, now, now)
  console.log(`管理员账号已创建：${username}`)
}

db.close()
