package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func Init(connURL string) error {
	if connURL == "" {
		connURL = os.Getenv("SUPABASE_DB_URL")
	}
	if connURL == "" {
		connURL = os.Getenv("DATABASE_URL")
	}
	if connURL == "" {
		connURL = os.Getenv("POSTGRES_URL")
	}
	if connURL == "" {
		return errors.New("请配置 SUPABASE_DB_URL 或 DATABASE_URL（Supabase 项目 → Settings → Database → Connection string）")
	}
	var err error
	DB, err = sql.Open("pgx", connURL)
	if err != nil {
		return err
	}
	return migrate()
}

func timeNowMs() int64 {
	return time.Now().UnixMilli()
}

func migrate() error {
	schema := `
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
	`
	_, err := DB.Exec(schema)
	return err
}

func ListConversations(deviceID string) ([]ConversationMeta, error) {
	rows, err := DB.Query(
		"SELECT id, title, created_at, updated_at FROM conversations WHERE device_id = $1 ORDER BY updated_at DESC",
		deviceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ConversationMeta
	for rows.Next() {
		var c ConversationMeta
		if err := rows.Scan(&c.ID, &c.Title, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}

type ConversationMeta struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

func GetConversation(id string) (*Conversation, error) {
	var c Conversation
	var messagesJSON string
	err := DB.QueryRow("SELECT id, device_id, title, messages, created_at, updated_at FROM conversations WHERE id = $1", id).
		Scan(&c.ID, &c.DeviceID, &c.Title, &messagesJSON, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(messagesJSON), &c.Messages)
	return &c, nil
}

type Conversation struct {
	ID        string        `json:"id"`
	DeviceID  string        `json:"device_id"`
	Title     string        `json:"title"`
	Messages  []ChatMessage `json:"messages"`
	CreatedAt int64         `json:"created_at"`
	UpdatedAt int64         `json:"updated_at"`
}

type ChatMessage struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Tarot     []Card `json:"tarot,omitempty"`
	Lenormand []Card `json:"lenormand,omitempty"`
}

type Card struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Emoji    string `json:"emoji"`
	Keywords string `json:"keywords"`
	Reversed bool   `json:"reversed"`
}

func CreateConversation(deviceID, title string, messages []ChatMessage) (*ConversationMeta, error) {
	id := uuid.New().String()
	now := timeNowMs()
	msgJSON, _ := json.Marshal(messages)
	_, err := DB.Exec(
		"INSERT INTO conversations (id, device_id, title, messages, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		id, deviceID, title, string(msgJSON), now, now,
	)
	if err != nil {
		return nil, err
	}
	return &ConversationMeta{ID: id, Title: title, CreatedAt: now, UpdatedAt: now}, nil
}

func UpdateConversation(id string, messages []ChatMessage, title *string) error {
	now := timeNowMs()
	msgJSON, _ := json.Marshal(messages)
	if title != nil {
		_, err := DB.Exec("UPDATE conversations SET messages = $1, title = $2, updated_at = $3 WHERE id = $4",
			string(msgJSON), *title, now, id)
		return err
	}
	_, err := DB.Exec("UPDATE conversations SET messages = $1, updated_at = $2 WHERE id = $3",
		string(msgJSON), now, id)
	return err
}

func DeleteConversation(id string) error {
	_, err := DB.Exec("DELETE FROM conversations WHERE id = $1", id)
	return err
}

func GetUserByUsername(username string) (*User, error) {
	var u User
	err := DB.QueryRow(
		"SELECT id, username, email, password, role, display_name, bio, character_key, can_edit_knowledge, disabled, created_at, updated_at FROM users WHERE username = $1",
		username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.Role, &u.DisplayName, &u.Bio, &u.CharacterKey, &u.CanEditKnowledge, &u.Disabled, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByID(id string) (*User, error) {
	var u User
	err := DB.QueryRow(
		"SELECT id, username, email, password, role, display_name, bio, character_key, can_edit_knowledge, disabled, created_at, updated_at FROM users WHERE id = $1",
		id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.Role, &u.DisplayName, &u.Bio, &u.CharacterKey, &u.CanEditKnowledge, &u.Disabled, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

type User struct {
	ID                string
	Username          string
	Email             sql.NullString
	Password          string
	Role              string
	DisplayName       sql.NullString
	Bio               sql.NullString
	CharacterKey      sql.NullString
	CanEditKnowledge  int
	Disabled          int
	CreatedAt         int64
	UpdatedAt         int64
}

func CreateUser(username string, email *string, passwordHash, role, displayName string) (*User, error) {
	id := uuid.New().String()
	now := timeNowMs()
	disp := displayName
	if disp == "" {
		disp = username
	}
	_, err := DB.Exec(
		"INSERT INTO users (id, username, email, password, role, display_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		id, username, nullStr(email), passwordHash, role, disp, now, now,
	)
	if err != nil {
		return nil, err
	}
	return GetUserByID(id)
}

func ListUsers(role string) ([]UserSafe, error) {
	var rows *sql.Rows
	var err error
	if role != "" {
		rows, err = DB.Query("SELECT id, username, email, role, display_name, bio, disabled, created_at FROM users WHERE role = $1 ORDER BY created_at DESC", role)
	} else {
		rows, err = DB.Query("SELECT id, username, email, role, display_name, bio, disabled, created_at FROM users ORDER BY created_at DESC")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []UserSafe
	for rows.Next() {
		var u UserSafe
		var email, disp, bio sql.NullString
		if err := rows.Scan(&u.ID, &u.Username, &email, &u.Role, &disp, &bio, &u.Disabled, &u.CreatedAt); err != nil {
			return nil, err
		}
		u.Email = email.String
		u.DisplayName = disp.String
		u.Bio = bio.String
		list = append(list, u)
	}
	return list, nil
}

type UserSafe struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email,omitempty"`
	Role        string `json:"role"`
	DisplayName string `json:"display_name,omitempty"`
	Bio         string `json:"bio,omitempty"`
	Disabled    int    `json:"disabled"`
	CreatedAt   int64  `json:"created_at"`
}

func UpdateUser(id string, fields map[string]interface{}) (*User, error) {
	now := timeNowMs()
	for k, v := range fields {
		switch k {
		case "display_name":
			DB.Exec("UPDATE users SET display_name = $1, updated_at = $2 WHERE id = $3", v, now, id)
		case "bio":
			DB.Exec("UPDATE users SET bio = $1, updated_at = $2 WHERE id = $3", v, now, id)
		case "disabled":
			val := 0
			if b, ok := v.(bool); ok && b {
				val = 1
			} else if n, ok := v.(int); ok {
				val = n
			}
			DB.Exec("UPDATE users SET disabled = $1, updated_at = $2 WHERE id = $3", val, now, id)
		case "role":
			DB.Exec("UPDATE users SET role = $1, updated_at = $2 WHERE id = $3", v, now, id)
		case "password":
			DB.Exec("UPDATE users SET password = $1, updated_at = $2 WHERE id = $3", v, now, id)
		case "can_edit_knowledge":
			val := 0
			if b, ok := v.(bool); ok && b {
				val = 1
			}
			DB.Exec("UPDATE users SET can_edit_knowledge = $1, updated_at = $2 WHERE id = $3", val, now, id)
		case "character_key":
			DB.Exec("UPDATE users SET character_key = $1, updated_at = $2 WHERE id = $3", v, now, id)
		}
	}
	return GetUserByID(id)
}

func CountUsers() ([]RoleCount, error) {
	rows, err := DB.Query("SELECT role, COUNT(*) as count FROM users GROUP BY role")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []RoleCount
	for rows.Next() {
		var r RoleCount
		if err := rows.Scan(&r.Role, &r.Count); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, nil
}

type RoleCount struct {
	Role  string `json:"role"`
	Count int    `json:"count"`
}

func GetCharacterPrompt(characterKey string) (*CharacterPrompt, error) {
	var c CharacterPrompt
	err := DB.QueryRow(
		"SELECT character_key, persona, chat_flow, fortune_instructions, updated_at FROM character_prompts WHERE character_key = $1",
		characterKey,
	).Scan(&c.CharacterKey, &c.Persona, &c.ChatFlow, &c.FortuneInstructions, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

type CharacterPrompt struct {
	CharacterKey        string
	Persona             sql.NullString
	ChatFlow            sql.NullString
	FortuneInstructions sql.NullString
	UpdatedAt           int64
}

func UpsertCharacterPrompt(characterKey string, persona, chatFlow *string, fortuneInstructions interface{}) error {
	now := timeNowMs()
	fiStr := ""
	if fortuneInstructions != nil {
		b, _ := json.Marshal(fortuneInstructions)
		fiStr = string(b)
	}
	existing, _ := GetCharacterPrompt(characterKey)
	if existing != nil {
		args := []interface{}{now}
		q := "UPDATE character_prompts SET updated_at = $1"
		n := 2
		if persona != nil {
			q += ", persona = $" + strconv.Itoa(n)
			args = append(args, *persona)
			n++
		}
		if chatFlow != nil {
			q += ", chat_flow = $" + strconv.Itoa(n)
			args = append(args, *chatFlow)
			n++
		}
		if fortuneInstructions != nil {
			q += ", fortune_instructions = $" + strconv.Itoa(n)
			args = append(args, fiStr)
			n++
		}
		q += " WHERE character_key = $" + strconv.Itoa(n)
		args = append(args, characterKey)
		_, err := DB.Exec(q, args...)
		return err
	}
	_, err := DB.Exec(
		"INSERT INTO character_prompts (character_key, persona, chat_flow, fortune_instructions, updated_at) VALUES ($1, $2, $3, $4, $5)",
		characterKey, nullStr(persona), nullStr(chatFlow), fiStr, now,
	)
	return err
}

func GetKnowledgeBase(characterKey, typ string) (*KnowledgeBase, error) {
	var k KnowledgeBase
	err := DB.QueryRow("SELECT id, character_key, type, data, updated_at FROM knowledge_bases WHERE character_key = $1 AND type = $2", characterKey, typ).
		Scan(&k.ID, &k.CharacterKey, &k.Type, &k.Data, &k.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &k, nil
}

type KnowledgeBase struct {
	ID           string
	CharacterKey string
	Type         string
	Data         string
	UpdatedAt    int64
}

func UpsertKnowledgeBase(characterKey, typ string, data interface{}) (*KnowledgeBase, error) {
	now := timeNowMs()
	dataJSON, _ := json.Marshal(data)
	existing, _ := GetKnowledgeBase(characterKey, typ)
	if existing != nil {
		_, err := DB.Exec("UPDATE knowledge_bases SET data = $1, updated_at = $2 WHERE character_key = $3 AND type = $4",
			string(dataJSON), now, characterKey, typ)
		if err != nil {
			return nil, err
		}
		return GetKnowledgeBase(characterKey, typ)
	}
	id := uuid.New().String()
	_, err := DB.Exec("INSERT INTO knowledge_bases (id, character_key, type, data, updated_at) VALUES ($1, $2, $3, $4, $5)",
		id, characterKey, typ, string(dataJSON), now)
	if err != nil {
		return nil, err
	}
	return GetKnowledgeBase(characterKey, typ)
}

func nullStr(s *string) interface{} {
	if s == nil {
		return nil
	}
	return *s
}
