package model

// Conversation 对话模型
type Conversation struct {
	ID        string        `json:"id"`
	DeviceID  string        `json:"device_id"`
	Title     string        `json:"title"`
	Messages  []ChatMessage `json:"messages"`
	CreatedAt int64         `json:"created_at"`
	UpdatedAt int64         `json:"updated_at"`
}

// ConversationMeta 对话元数据
type ConversationMeta struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// ChatMessage 聊天消息
type ChatMessage struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Tarot     []Card `json:"tarot,omitempty"`
	Lenormand []Card `json:"lenormand,omitempty"`
}

// Card 卡牌
type Card struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Emoji    string `json:"emoji"`
	Keywords string `json:"keywords"`
	Reversed bool   `json:"reversed"`
}
