package service

import (
	"errors"
	"pet-fortune/backend/internal/db"
)

// ConversationService 对话服务
type ConversationService struct{}

// NewConversationService 创建对话服务
func NewConversationService() *ConversationService {
	return &ConversationService{}
}

// ListConversations 获取对话列表
func (s *ConversationService) ListConversations(deviceID string) ([]db.ConversationMeta, error) {
	if deviceID == "" {
		return nil, errors.New("deviceId required")
	}
	return db.ListConversations(deviceID)
}

// GetConversation 获取对话详情
func (s *ConversationService) GetConversation(id string) (*db.Conversation, error) {
	return db.GetConversation(id)
}

// CreateConversation 创建对话
func (s *ConversationService) CreateConversation(deviceID, title string, messages []db.ChatMessage) (*db.ConversationMeta, error) {
	if deviceID == "" {
		return nil, errors.New("deviceId required")
	}
	if title == "" {
		title = "新对话"
	}
	return db.CreateConversation(deviceID, title, messages)
}

// UpdateConversation 更新对话
func (s *ConversationService) UpdateConversation(id string, messages []db.ChatMessage, title *string) error {
	return db.UpdateConversation(id, messages, title)
}

// DeleteConversation 删除对话
func (s *ConversationService) DeleteConversation(id string) error {
	return db.DeleteConversation(id)
}
