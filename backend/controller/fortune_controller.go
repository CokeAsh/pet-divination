package controller

import (
	"net/http"
	"pet-fortune/backend/internal/prompts"
	"pet-fortune/backend/service"

	"github.com/gin-gonic/gin"
)

// FortuneController 占卜控制器
type FortuneController struct {
	fortuneService *service.FortuneService
}

// NewFortuneController 创建占卜控制器
func NewFortuneController() *FortuneController {
	return &FortuneController{
		fortuneService: service.NewFortuneService(),
	}
}

// DoFortune 执行占卜
func (ctrl *FortuneController) DoFortune(c *gin.Context) {
	var req struct {
		CharacterID string         `json:"characterId"`
		PetType     string         `json:"petType"`
		PetName     string         `json:"petName"`
		Emotion     string         `json:"emotion"`
		Question    string         `json:"question"`
		Method      string         `json:"method"`
		Cards       []prompts.Card `json:"cards"`
		Liuyao      interface{}    `json:"liuyao"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	result, err := ctrl.fortuneService.DoFortune(
		req.CharacterID,
		req.PetType,
		req.PetName,
		req.Emotion,
		req.Question,
		req.Method,
		req.Cards,
		req.Liuyao,
	)

	if err != nil {
		if aiErr, ok := err.(*service.AIError); ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "API key not configured",
				"message": aiErr.Message,
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, result)
}

// DoChat 执行聊天
func (ctrl *FortuneController) DoChat(c *gin.Context) {
	var req struct {
		CharacterID string      `json:"characterId"`
		Messages    interface{} `json:"messages"`
		Confirm     bool        `json:"confirm"`
		Intro       *string     `json:"intro"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	result, err := ctrl.fortuneService.DoChat(req.CharacterID, nil, req.Confirm, req.Intro)
	if err != nil {
		if aiErr, ok := err.(*service.AIError); ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": aiErr.Message})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, result)
}
