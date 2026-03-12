package model

import (
	"database/sql"
)

// CharacterPrompt 角色提示词
type CharacterPrompt struct {
	CharacterKey        string
	Persona             sql.NullString
	ChatFlow            sql.NullString
	FortuneInstructions sql.NullString
	UpdatedAt           int64
}

// KnowledgeBase 知识库
type KnowledgeBase struct {
	ID           string
	CharacterKey string
	Type         string
	Data         string
	UpdatedAt    int64
}
