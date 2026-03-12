package service

import (
	"errors"
	"pet-fortune/backend/internal/auth"
	"pet-fortune/backend/internal/db"
)

// AuthService 认证服务
type AuthService struct{}

// NewAuthService 创建认证服务
func NewAuthService() *AuthService {
	return &AuthService{}
}

// Register 用户注册
func (s *AuthService) Register(username, email, password string) (string, *db.User, error) {
	if username == "" || password == "" {
		return "", nil, errors.New("用户名和密码不能为空")
	}

	// 检查用户名是否存在
	existingUser, _ := db.GetUserByUsername(username)
	if existingUser != nil {
		return "", nil, errors.New("用户名已存在")
	}

	// 创建用户
	user, err := db.CreateUser(username, &email, password, "user", "")
	if err != nil {
		return "", nil, err
	}

	// 生成 token
	token, _ := auth.SignToken(user.ID, user.Username, user.Role)
	return token, user, nil
}

// Login 用户登录
func (s *AuthService) Login(username, password string) (string, *db.User, error) {
	if username == "" || password == "" {
		return "", nil, errors.New("用户名和密码不能为空")
	}

	// 获取用户
	user, err := db.GetUserByUsername(username)
	if err != nil || user == nil {
		return "", nil, errors.New("用户名或密码错误")
	}

	// 检查账号状态
	if user.Disabled != 0 {
		return "", nil, errors.New("账号已被禁用")
	}

	// 验证密码
	if err := auth.CheckPassword(user.Password, password); err != nil {
		return "", nil, errors.New("用户名或密码错误")
	}

	// 生成 token
	token, _ := auth.SignToken(user.ID, user.Username, user.Role)
	return token, user, nil
}

// GetUserByID 通过 ID 获取用户
func (s *AuthService) GetUserByID(id string) (*db.User, error) {
	return db.GetUserByID(id)
}
