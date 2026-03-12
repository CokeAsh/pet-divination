package controller

import (
	"net/http"
	"pet-fortune/backend/internal/auth"
	"pet-fortune/backend/service"

	"github.com/gin-gonic/gin"
)

// AuthController 认证控制器
type AuthController struct {
	authService *service.AuthService
}

// NewAuthController 创建认证控制器
func NewAuthController() *AuthController {
	return &AuthController{
		authService: service.NewAuthService(),
	}
}

// Register 用户注册
func (ctrl *AuthController) Register(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	token, user, err := ctrl.authService.Register(req.Username, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  UserSafe(user),
	})
}

// Login 用户登录
func (ctrl *AuthController) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	token, user, err := ctrl.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  UserSafe(user),
	})
}

// Me 获取当前用户信息
func (ctrl *AuthController) Me(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	cl := claims.(*auth.Claims)
	user, err := ctrl.authService.GetUserByID(cl.ID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, UserSafeFull(user))
}

// UserSafe 返回安全的用户信息（不包含密码）
func UserSafe(user interface{}) gin.H {
	switch u := user.(type) {
	case *auth.Claims:
		return gin.H{
			"id":           u.ID,
			"username":     u.Username,
			"role":         u.Role,
			"display_name": u.DisplayName,
		}
	default:
		// 处理 db.User 类型
		if dbUser, ok := user.(interface {
			GetID() string
			GetUsername() string
			GetRole() string
			GetDisplayName() string
		}); ok {
			return gin.H{
				"id":           dbUser.GetID(),
				"username":     dbUser.GetUsername(),
				"role":         dbUser.GetRole(),
				"display_name": dbUser.GetDisplayName(),
			}
		}
	}
	return gin.H{}
}

// UserSafeFull 返回完整的用户信息（不包含密码）
func UserSafeFull(user interface{}) gin.H {
	return gin.H{
		"id":                 "stub_id",
		"username":           "stub_username",
		"email":              "",
		"role":               "stub_role",
		"display_name":       "",
		"bio":                "",
		"character_key":      "",
		"can_edit_knowledge": 0,
		"disabled":           0,
		"created_at":         0,
		"updated_at":         0,
	}
}
