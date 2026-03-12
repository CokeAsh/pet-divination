package main

import (
	"pet-fortune/backend/controller"
	"pet-fortune/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 设置所有路由
func SetupRoutes(r *gin.Engine) {
	// 初始化控制器
	healthController := controller.NewHealthController()
	authController := controller.NewAuthController()
	adminController := controller.NewAdminController()
	conversationController := controller.NewConversationController()
	promptsController := controller.NewPromptsController()
	fortuneController := controller.NewFortuneController()

	// health
	r.GET("/api/health", healthController.Check)

	// auth
	r.POST("/api/auth/register", authController.Register)
	r.POST("/api/auth/login", authController.Login)
	r.GET("/api/auth/me", auth.RequireAuth, authController.Me)

	// admin
	admin := r.Group("/api/admin")
	admin.Use(auth.RequireRole("admin"))
	{
		admin.GET("/users", adminController.ListUsers)
		admin.POST("/users", adminController.CreateUser)
		admin.GET("/stats", adminController.GetStats)
		admin.PUT("/users/:id", adminController.UpdateUser)
		admin.PUT("/users/:id/permissions", adminController.UpdatePermissions)
	}

	// prompts & knowledge
	r.GET("/api/prompts/:characterKey", auth.RequireAuth, promptsController.GetPrompt)
	r.PUT("/api/prompts/:characterKey", auth.RequireAuth, promptsController.UpdatePrompt)
	r.GET("/api/knowledge/:characterKey/:type", auth.RequireAuth, promptsController.GetKnowledge)
	r.PUT("/api/knowledge/:characterKey/:type", auth.RequireAuth, promptsController.UpdateKnowledge)

	// fortune-teller
	r.GET("/api/fortune-teller/profile", auth.RequireRole("admin", "fortune_teller"), promptsController.GetProfile)
	r.PUT("/api/fortune-teller/profile", auth.RequireRole("admin", "fortune_teller"), promptsController.UpdateProfile)

	// conversations
	r.GET("/api/conversations", conversationController.ListConversations)
	r.GET("/api/conversations/:id", conversationController.GetConversation)
	r.POST("/api/conversations", conversationController.CreateConversation)
	r.PUT("/api/conversations/:id", conversationController.UpdateConversation)
	r.DELETE("/api/conversations/:id", conversationController.DeleteConversation)

	// fortune & chat
	r.POST("/api/fortune", fortuneController.DoFortune)
	r.POST("/api/chat", fortuneController.DoChat)
}
