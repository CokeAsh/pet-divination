package controller

import (
	"net/http"
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// AdminController 管理员控制器
type AdminController struct {
	adminService *service.AdminService
}

// NewAdminController 创建管理员控制器
func NewAdminController() *AdminController {
	return &AdminController{
		adminService: service.NewAdminService(),
	}
}

// ListUsers 获取用户列表
func (ctrl *AdminController) ListUsers(c *gin.Context) {
	role := c.Query("role")
	list, err := ctrl.adminService.ListUsers(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// CreateUser 创建用户
func (ctrl *AdminController) CreateUser(c *gin.Context) {
	var req struct {
		Username    string `json:"username"`
		Email       string `json:"email"`
		Password    string `json:"password"`
		Role        string `json:"role"`
		DisplayName string `json:"display_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必填字段"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	user, err := ctrl.adminService.CreateUser(req.Username, req.Email, string(hash), req.Role, req.DisplayName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, convertUserToSafe(user))
}

// UpdateUser 更新用户
func (ctrl *AdminController) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		DisplayName *string `json:"display_name"`
		Bio         *string `json:"bio"`
		Disabled    *bool   `json:"disabled"`
		Role        *string `json:"role"`
		Password    *string `json:"password"`
	}
	c.ShouldBindJSON(&req)

	fields := make(map[string]interface{})
	if req.DisplayName != nil {
		fields["display_name"] = *req.DisplayName
	}
	if req.Bio != nil {
		fields["bio"] = *req.Bio
	}
	if req.Disabled != nil {
		fields["disabled"] = *req.Disabled
	}
	if req.Role != nil {
		fields["role"] = *req.Role
	}
	if req.Password != nil && *req.Password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(*req.Password), 10)
		fields["password"] = string(hash)
	}

	user, err := ctrl.adminService.UpdateUser(id, fields)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, convertUserToSafe(user))
}

// UpdatePermissions 更新用户权限
func (ctrl *AdminController) UpdatePermissions(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		CanEditKnowledge *bool   `json:"can_edit_knowledge"`
		CharacterKey     *string `json:"character_key"`
	}
	c.ShouldBindJSON(&req)

	fields := make(map[string]interface{})
	if req.CanEditKnowledge != nil {
		fields["can_edit_knowledge"] = *req.CanEditKnowledge
	}
	if req.CharacterKey != nil {
		fields["character_key"] = *req.CharacterKey
	}

	user, err := ctrl.adminService.UpdateUser(id, fields)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, convertUserToSafe(user))
}

// GetStats 获取统计信息
func (ctrl *AdminController) GetStats(c *gin.Context) {
	counts, err := ctrl.adminService.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"userCounts": counts})
}

// convertUserToSafe 转换用户为安全信息
func convertUserToSafe(user *db.User) map[string]interface{} {
	return map[string]interface{}{
		"id":                 user.ID,
		"username":           user.Username,
		"email":              nullStrVal(user.Email),
		"role":               user.Role,
		"display_name":       nullStrVal(user.DisplayName),
		"bio":                nullStrVal(user.Bio),
		"character_key":      nullStrVal(user.CharacterKey),
		"can_edit_knowledge": user.CanEditKnowledge,
		"disabled":           user.Disabled,
		"created_at":         user.CreatedAt,
		"updated_at":         user.UpdatedAt,
	}
}

func nullStrVal(n interface{}) interface{} {
	return n
}
