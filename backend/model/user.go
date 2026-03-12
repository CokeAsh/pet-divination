package model

import (
	"database/sql"
)

// User 用户模型
type User struct {
	ID               string
	Username         string
	Email            sql.NullString
	Password         string
	Role             string
	DisplayName      sql.NullString
	Bio              sql.NullString
	CharacterKey     sql.NullString
	CanEditKnowledge int
	Disabled         int
	CreatedAt        int64
	UpdatedAt        int64
}

// UserSafe 用户安全信息（不包含密码）
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

// RoleCount 角色统计
type RoleCount struct {
	Role  string `json:"role"`
	Count int    `json:"count"`
}
