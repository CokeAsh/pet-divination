package service

import (
	"errors"
	"pet-fortune/backend/internal/db"
)

// AdminService 管理服务
type AdminService struct{}

// NewAdminService 创建管理服务
func NewAdminService() *AdminService {
	return &AdminService{}
}

// ListUsers 获取用户列表
func (s *AdminService) ListUsers(role string) ([]db.UserSafe, error) {
	return db.ListUsers(role)
}

// CreateUser 创建用户
func (s *AdminService) CreateUser(username, email, password, role, displayName string) (*db.User, error) {
	if username == "" || password == "" || role == "" {
		return nil, errors.New("缺少必填字段")
	}

	// 验证角色
	validRoles := map[string]bool{
		"admin":         true,
		"fortune_teller": true,
		"user":          true,
	}
	if !validRoles[role] {
		return nil, errors.New("无效的角色")
	}

	// 检查用户名是否存在
	existingUser, _ := db.GetUserByUsername(username)
	if existingUser != nil {
		return nil, errors.New("用户名已存在")
	}

	// 创建用户
	user, err := db.CreateUser(username, &email, password, role, displayName)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser 更新用户信息
func (s *AdminService) UpdateUser(id string, fields map[string]interface{}) (*db.User, error) {
	return db.UpdateUser(id, fields)
}

// GetStats 获取统计信息
func (s *AdminService) GetStats() ([]db.RoleCount, error) {
	return db.CountUsers()
}

// CanEditKnowledge 检查是否可以编辑知识库
func (s *AdminService) CanEditKnowledge(user *db.User) bool {
	return user.Role == "admin" || (user.Role == "fortune_teller" && user.CanEditKnowledge != 0)
}
