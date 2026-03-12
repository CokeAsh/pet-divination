package prompts

import (
	"encoding/json"
	"pet-fortune/backend/internal/db"
)

const CharacterLiliana = "liliana"
const CharacterYiqing    = "yiqing"

func BuildChatSystemPrompt(characterID string) string {
	char := getCharacter(characterID)
	return char.Persona + "\n\n" + char.ChatFlow
}

func BuildSystemPrompt(method, characterID string) string {
	char := getCharacter(characterID)
	inst := char.FortuneInstructions[method]
	if inst == "" {
		inst = char.FortuneInstructions["direct"]
	}
	return char.Persona + "\n\n" + inst
}

func BuildCardMeaningsContext(tarotCards, lenormandCards []Card, characterID string) string {
	char := getCharacter(characterID)
	var lines []string
	if contains(char.KnowledgeBases, "tarot") && len(tarotCards) > 0 {
		lines = append(lines, "本次抽到的塔罗牌含义参考：")
		for _, card := range tarotCards {
			m := GetKnowledgeMeaning(characterID, "tarot", card.Name, card.Reversed)
			if m != "" {
				lines = append(lines, "  "+m)
			}
		}
	}
	if contains(char.KnowledgeBases, "lenormand") && len(lenormandCards) > 0 {
		lines = append(lines, "本次抽到的雷诺曼牌含义参考：")
		for _, card := range lenormandCards {
			m := GetKnowledgeMeaning(characterID, "lenormand", card.Name, false)
			if m != "" {
				lines = append(lines, "  "+m)
			}
		}
	}
	if len(lines) == 0 {
		return ""
	}
	s := "\n\n"
	for i, l := range lines {
		if i > 0 {
			s += "\n"
		}
		s += l
	}
	return s
}

type Card struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Emoji    string `json:"emoji"`
	Keywords string `json:"keywords"`
	Reversed bool   `json:"reversed"`
}

type Character struct {
	Persona             string
	ChatFlow            string
	FortuneInstructions map[string]string
	KnowledgeBases      []string
}

func getCharacter(id string) Character {
	if id == "" {
		id = CharacterLiliana
	}

	var c Character
	switch id {
	case CharacterYiqing:
		c = YiqingDefault
	default:
		c = LilianaDefault
	}

	cp, _ := db.GetCharacterPrompt(id)
	if cp != nil {
		if cp.Persona.Valid {
			c.Persona = cp.Persona.String
		}
		if cp.ChatFlow.Valid {
			c.ChatFlow = cp.ChatFlow.String
		}
		if cp.FortuneInstructions.Valid {
			var m map[string]string
			json.Unmarshal([]byte(cp.FortuneInstructions.String), &m)
			if m != nil {
				c.FortuneInstructions = m
			}
		}
	}
	return c
}

func GetKnowledgeMeaning(characterID, typ, cardName string, reversed bool) string {
	kb, _ := db.GetKnowledgeBase(characterID, typ)
	if kb != nil {
		var data map[string]interface{}
		if json.Unmarshal([]byte(kb.Data), &data) == nil {
			if entry, ok := data[cardName]; ok {
				switch v := entry.(type) {
				case string:
					return cardName + "：" + v
				case map[string]interface{}:
					if reversed {
						if r, ok := v["reversed"].(string); ok {
							return cardName + "（逆位）：" + r
						}
					} else {
						if u, ok := v["upright"].(string); ok {
							return cardName + "（正位）：" + u
						}
					}
				}
			}
		}
	}
	if typ == "tarot" {
		return GetTarotMeaning(cardName, reversed)
	}
	return GetLenormandMeaning(cardName)
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}
