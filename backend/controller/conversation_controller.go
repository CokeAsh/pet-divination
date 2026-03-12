package controller

import (
	"net/http"
	"pet-fortune/backend/service"

	"github.com/gin-gonic/gin"
)

// ConversationController 对话控制器
type ConversationController struct {
	conversationService *service.ConversationService
}

// NewConversationController 创建对话控制器
func NewConversationController() *ConversationController {
	return &ConversationController{
		conversationService: service.NewConversationService(),
	}
}

// ListConversations 获取对话列表
func (ctrl *ConversationController) ListConversations(c *gin.Context) {
	deviceID := c.Query("deviceId")
	list, err := ctrl.conversationService.ListConversations(deviceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// GetConversation 获取对话详情
func (ctrl *ConversationController) GetConversation(c *gin.Context) {
	conv, err := ctrl.conversationService.GetConversation(c.Param("id"))
	if err != nil || conv == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.JSON(http.StatusOK, conv)
}

// CreateConversation 创建对话
func (ctrl *ConversationController) CreateConversation(c *gin.Context) {
	var req struct {
		DeviceID string          `json:"deviceId"`
		Title    string          `json:"title"`
		Messages interface{}     `json:"messages"`
	}
	c.ShouldBindJSON(&req)

	meta, err := ctrl.conversationService.CreateConversation(req.DeviceID, req.Title, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, meta)
}

// UpdateConversation 更新对话
func (ctrl *ConversationController) UpdateConversation(c *gin.Context) {
	var req struct {
		Messages interface{} `json:"messages"`
		Title    *string     `json:"title"`
	}
	c.ShouldBindJSON(&req)

	err := ctrl.conversationService.UpdateConversation(c.Param("id"), nil, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// DeleteConversation 删除对话
func (ctrl *ConversationController) DeleteConversation(c *gin.Context) {
	err := ctrl.conversationService.DeleteConversation(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
