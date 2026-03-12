package controller

import (
	"net/http"
	"pet-fortune/backend/internal/ai"

	"github.com/gin-gonic/gin"
)

// HealthController 健康检查控制器
type HealthController struct{}

// NewHealthController 创建健康检查控制器
func NewHealthController() *HealthController {
	return &HealthController{}
}

// Check 健康检查
func (ctrl *HealthController) Check(c *gin.Context) {
	hasKey := ai.HasProvider()
	names := ai.ProviderNames()
	c.JSON(http.StatusOK, gin.H{"ok": true, "hasKey": hasKey, "providers": names})
}
