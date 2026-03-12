package controller

import (
	"net/http"
	"pet-fortune/backend/internal/auth"
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/service"

	"github.com/gin-gonic/gin"
)

// PromptsController 提示词控制器
type PromptsController struct {
	promptsService *service.PromptsService
	adminService   *service.AdminService
	authService    *service.AuthService
}

// NewPromptsController 创建提示词控制器
func NewPromptsController() *PromptsController {
	return &PromptsController{
		promptsService: service.NewPromptsService(),
		adminService:   service.NewAdminService(),
		authService:    service.NewAuthService(),
	}
}

// GetPrompt 获取角色提示词
func (ctrl *PromptsController) GetPrompt(c *gin.Context) {
	key := c.Param("characterKey")
	result := ctrl.promptsService.GetPrompt(key)
	c.JSON(http.StatusOK, result)
}

// UpdatePrompt 更新角色提示词
func (ctrl *PromptsController) UpdatePrompt(c *gin.Context) {
	// 验证权限
	if !ctrl.checkEditPermission(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	key := c.Param("characterKey")
	var req struct {
		Persona             *string           `json:"persona"`
		ChatFlow            *string           `json:"chat_flow"`
		FortuneInstructions map[string]string `json:"fortune_instructions"`
	}
	c.ShouldBindJSON(&req)

	cp, err := ctrl.promptsService.UpdatePrompt(key, req.Persona, req.ChatFlow, req.FortuneInstructions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cp)
}

// GetKnowledge 获取知识库
func (ctrl *PromptsController) GetKnowledge(c *gin.Context) {
	key := c.Param("characterKey")
	typ := c.Param("type")
	result := ctrl.promptsService.GetKnowledge(key, typ)
	c.JSON(http.StatusOK, result)
}

// UpdateKnowledge 更新知识库
func (ctrl *PromptsController) UpdateKnowledge(c *gin.Context) {
	// 验证权限
	if !ctrl.checkEditPermission(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	key := c.Param("characterKey")
	typ := c.Param("type")
	var req struct {
		Data map[string]interface{} `json:"data"`
	}
	c.ShouldBindJSON(&req)

	result, err := ctrl.promptsService.UpdateKnowledge(key, typ, req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetProfile 获取算命师档案
func (ctrl *PromptsController) GetProfile(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	u, _ := ctrl.authService.GetUserByID(cl.ID)
	if u == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(http.StatusOK, convertUserToMap(u))
}

// UpdateProfile 更新算命师档案
func (ctrl *PromptsController) UpdateProfile(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	var req struct {
		DisplayName *string `json:"display_name"`
		Bio         *string `json:"bio"`
	}
	c.ShouldBindJSON(&req)

	fields := make(map[string]interface{})
	if req.DisplayName != nil {
		fields["display_name"] = *req.DisplayName
	}
	if req.Bio != nil {
		fields["bio"] = *req.Bio
	}

	user, _ := ctrl.adminService.UpdateUser(cl.ID, fields)
	c.JSON(http.StatusOK, convertUserToMap(user))
}

// checkEditPermission 检查编辑权限
func (ctrl *PromptsController) checkEditPermission(c *gin.Context) bool {
	claims, exists := c.Get("user")
	if !exists {
		return false
	}

	cl := claims.(*auth.Claims)
	u, err := ctrl.authService.GetUserByID(cl.ID)
	if err != nil || u == nil {
		return false
	}

	return ctrl.adminService.CanEditKnowledge(u)
}

func convertUserToMap(user *db.User) map[string]interface{} {
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
