package service

import (
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/internal/prompts"
)

// PromptsService 提示词服务
type PromptsService struct{}

// NewPromptsService 创建提示词服务
func NewPromptsService() *PromptsService {
	return &PromptsService{}
}

// GetPrompt 获取角色提示词
func (s *PromptsService) GetPrompt(characterKey string) map[string]interface{} {
	cp, _ := db.GetCharacterPrompt(characterKey)
	char := prompts.LilianaDefault
	if cp != nil {
		if cp.Persona.Valid {
			char.Persona = cp.Persona.String
		}
		if cp.ChatFlow.Valid {
			char.ChatFlow = cp.ChatFlow.String
		}
		if cp.FortuneInstructions.Valid {
			char.FortuneInstructions = parseJSONMap(cp.FortuneInstructions.String)
		}
	}
	return map[string]interface{}{
		"character_key":         characterKey,
		"persona":               char.Persona,
		"chat_flow":             char.ChatFlow,
		"fortune_instructions":  char.FortuneInstructions,
		"is_default":            cp == nil,
	}
}

// UpdatePrompt 更新角色提示词
func (s *PromptsService) UpdatePrompt(characterKey string, persona, chatFlow *string, fortuneInstructions map[string]string) (*db.CharacterPrompt, error) {
	err := db.UpsertCharacterPrompt(characterKey, persona, chatFlow, fortuneInstructions)
	if err != nil {
		return nil, err
	}
	return db.GetCharacterPrompt(characterKey)
}

// GetKnowledge 获取知识库
func (s *PromptsService) GetKnowledge(characterKey, typ string) map[string]interface{} {
	kb, _ := db.GetKnowledgeBase(characterKey, typ)
	var data interface{}
	if kb != nil {
		parseJSON(kb.Data, &data)
	} else {
		if typ == "tarot" {
			data = tarotToMap()
		} else if typ == "lenormand" {
			data = prompts.LenormandMeanings
		} else {
			data = map[string]interface{}{}
		}
	}
	return map[string]interface{}{
		"character_key": characterKey,
		"type":          typ,
		"data":          data,
		"is_default":    kb == nil,
	}
}

// UpdateKnowledge 更新知识库
func (s *PromptsService) UpdateKnowledge(characterKey, typ string, data map[string]interface{}) (map[string]interface{}, error) {
	kb, err := db.UpsertKnowledgeBase(characterKey, typ, data)
	if err != nil {
		return nil, err
	}
	var result interface{}
	parseJSON(kb.Data, &result)
	return map[string]interface{}{
		"character_key": characterKey,
		"type":          typ,
		"data":          result,
	}, nil
}

// GetCharacterPrompt 获取角色提示词（原始）
func (s *PromptsService) GetCharacterPrompt(characterKey string) (*db.CharacterPrompt, error) {
	return db.GetCharacterPrompt(characterKey)
}

// tarotToMap 转换塔罗牌为 map
func tarotToMap() map[string]map[string]string {
	m := make(map[string]map[string]string)
	for name, v := range prompts.TarotMeanings {
		m[name] = map[string]string{"upright": v.Upright, "reversed": v.Reversed}
	}
	return m
}
