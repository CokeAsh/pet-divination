package service

import (
	"context"
	"encoding/json"
	"pet-fortune/backend/internal/ai"
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/internal/draw"
	"pet-fortune/backend/internal/prompts"
	"regexp"
	"strconv"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

// FortuneService 占卜服务
type FortuneService struct{}

// NewFortuneService 创建占卜服务
func NewFortuneService() *FortuneService {
	return &FortuneService{}
}

// DoFortune 执行占卜
func (s *FortuneService) DoFortune(characterID, petType, petName, emotion, question, method string, cards []prompts.Card, liuyao interface{}) (map[string]interface{}, error) {
	if !ai.HasProvider() {
		return nil, &AIError{Message: "API key not configured"}
	}

	if characterID == "" {
		characterID = prompts.CharacterLiliana
	}
	if petType == "" {
		petType = "other"
	}
	if petName == "" {
		petName = "毛孩子"
	}
	if method == "" {
		method = "direct"
	}

	petLabel := getPetLabel(petType)
	userPrompt := s.buildFortuneUserPrompt(characterID, petLabel, petName, emotion, question, method, cards, liuyao)

	msgs := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: prompts.BuildSystemPrompt(method, characterID)},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}

	content, err := ai.CreateChatCompletion(context.Background(), msgs, 1100, 0.85)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(content) == "" {
		content = "暂时没有收到清晰的回应，请稍后再试。"
	}

	result := map[string]interface{}{
		"message": strings.TrimSpace(content),
	}
	if method == "liuyao" && liuyao != nil {
		result["divination"] = liuyao
	}
	return result, nil
}

// DoChat 执行聊天
func (s *FortuneService) DoChat(characterID string, messages []db.ChatMessage, confirm bool, intro *string) (map[string]interface{}, error) {
	if !ai.HasProvider() {
		return nil, &AIError{Message: "API key not configured"}
	}

	if characterID == "" {
		characterID = prompts.CharacterLiliana
	}

	confirmedIntro := ""
	if intro != nil {
		confirmedIntro = *intro
	}
	if messages == nil {
		messages = []db.ChatMessage{}
	}

	// 第一次调用
	if !confirm {
		return s.handleFirstCall(characterID, messages)
	}

	// 确认后进行抽牌和解读
	return s.handleCardReading(characterID, confirmedIntro, messages)
}

// handleFirstCall 处理首次调用
func (s *FortuneService) handleFirstCall(characterID string, messages []db.ChatMessage) (map[string]interface{}, error) {
	clean := s.buildCleanMessages(messages, characterID)
	content, err := ai.CreateChatCompletion(
		context.Background(),
		append([]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt(characterID)}}, clean...),
		900,
		0.8,
	)
	if err != nil {
		return nil, err
	}

	rawContent := s.normalizeSignals(strings.TrimSpace(content))
	if rawContent == "" {
		rawContent = "暂时没有收到清晰回应，请稍后再试。"
	}

	if !strings.Contains(rawContent, "[DRAW_CARDS]") {
		if regexp.MustCompile(`抽牌|起牌|进入牌阵`).MatchString(rawContent) {
			return map[string]interface{}{"drawReady": true, "intro": strings.TrimSpace(rawContent)}, nil
		}
		return map[string]interface{}{"message": rawContent}, nil
	}

	idx := strings.Index(rawContent, "[DRAW_CARDS]")
	intro := strings.TrimSpace(rawContent[:idx])
	return map[string]interface{}{"drawReady": true, "intro": intro}, nil
}

// handleCardReading 处理抽牌解读
func (s *FortuneService) handleCardReading(characterID, intro string, messages []db.ChatMessage) (map[string]interface{}, error) {
	tarotCards := draw.DrawCards("tarot", 5)
	lenormandCards := draw.DrawCards("lenormand", 3)
	cardText := s.formatCardsForAI(tarotCards, lenormandCards)
	cardMeanings := prompts.BuildCardMeaningsContext(tarotCards, lenormandCards, characterID)

	readingMsgs := s.buildCleanMessages(messages, characterID)
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "assistant", Content: intro})
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "user", Content: cardText + cardMeanings})

	fullMsgs := append([]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt(characterID)}}, readingMsgs...)
	reading, err := ai.CreateChatCompletion(context.Background(), fullMsgs, 2400, 0.85)
	if err != nil {
		return nil, err
	}

	reading = s.normalizeSignals(strings.TrimSpace(strings.ReplaceAll(reading, "[DRAW_CARDS]", "")))
	if reading == "" {
		reading = "暂时没有收到完整解读，请稍后重试。"
	}

	return map[string]interface{}{
		"message": reading,
		"cards": map[string]interface{}{
			"tarot":     tarotCards,
			"lenormand": lenormandCards,
		},
	}, nil
}

// buildCleanMessages 构建清理后的消息
func (s *FortuneService) buildCleanMessages(messages []db.ChatMessage, characterID string) []openai.ChatCompletionMessage {
	var out []openai.ChatCompletionMessage
	for _, m := range messages {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		content := m.Content
		if m.Role == "user" && strings.HasPrefix(content, "[已抽牌]") {
			content += prompts.BuildCardMeaningsContext(toPromptsCards(m.Tarot), toPromptsCards(m.Lenormand), characterID)
		}
		out = append(out, openai.ChatCompletionMessage{Role: m.Role, Content: content})
	}
	return out
}

// normalizeSignals 标准化信号
func (s *FortuneService) normalizeSignals(str string) string {
	re := regexp.MustCompile(`[\[\【\(]DRAW_CARDS[\]\】\)]`)
	return re.ReplaceAllString(str, "[DRAW_CARDS]")
}

// formatCardsForAI 格式化卡牌给 AI
func (s *FortuneService) formatCardsForAI(tarot, lenormand []prompts.Card) string {
	lines := []string{"[已抽牌]", "塔罗："}
	tarotLabels := []string{"情绪底色", "压力来源", "宠物需求", "互动模式", "短期走向"}
	for i, card := range tarot {
		label := "牌位"
		if i < len(tarotLabels) {
			label = tarotLabels[i]
		}
		pos := "正位"
		if card.Reversed {
			pos = "逆位"
		}
		lines = append(lines, "  "+label+"："+card.Name+" "+pos+" · "+card.Keywords)
	}
	lines = append(lines, "雷诺曼：")
	lenormandLabels := []string{"安全感来源", "触发点", "安抚方式"}
	for i, card := range lenormand {
		label := "补充位"
		if i < len(lenormandLabels) {
			label = lenormandLabels[i]
		}
		lines = append(lines, "  "+label+"："+card.Name+" · "+card.Keywords)
	}
	return strings.Join(lines, "\n")
}

// buildFortuneUserPrompt 构建占卜用户提示
func (s *FortuneService) buildFortuneUserPrompt(characterID, petLabel, petName, emotion, question, method string, cards []prompts.Card, liuyao interface{}) string {
	sections := []string{
		"宠物类型：" + petLabel,
		"宠物名字：" + petName,
	}
	if emotion != "" {
		sections = append(sections, "当前感知情绪："+emotion)
	}
	if question != "" {
		sections = append(sections, "用户问题："+question)
	} else {
		sections = append(sections, "用户问题：请直接回应它此刻最想表达的重点。")
	}

	switch method {
	case "tarot1", "tarot3", "lenormand":
		if section := s.formatCardSection(characterID, method, cards); section != "" {
			sections = append(sections, section)
		}
	case "liuyao":
		if section := s.formatLiuyaoSection(liuyao); section != "" {
			sections = append(sections, section)
		}
	}

	return strings.Join(sections, "\n")
}

// formatCardSection 格式化卡牌部分
func (s *FortuneService) formatCardSection(characterID, method string, cards []prompts.Card) string {
	if len(cards) == 0 {
		return ""
	}
	posLabel := func(card prompts.Card) string {
		if card.Reversed {
			return "逆位"
		}
		return "正位"
	}

	lines := []string{}
	switch method {
	case "tarot3":
		lines = append(lines, "本次三张塔罗：")
		positions := []string{"过去", "现在", "未来"}
		for i, card := range cards {
			label := "牌位"
			if i < len(positions) {
				label = positions[i]
			}
			lines = append(lines, "  "+label+"："+card.Name+" "+posLabel(card))
		}
		lines = append(lines, prompts.BuildCardMeaningsContext(cards, nil, characterID))
	case "tarot1":
		lines = append(lines, "本次塔罗：")
		for _, card := range cards {
			lines = append(lines, "  "+card.Name+" "+posLabel(card))
		}
		lines = append(lines, prompts.BuildCardMeaningsContext(cards, nil, characterID))
	case "lenormand":
		lines = append(lines, "本次雷诺曼：")
		for _, card := range cards {
			lines = append(lines, "  "+card.Name+" 正位")
		}
		lines = append(lines, prompts.BuildCardMeaningsContext(nil, cards, characterID))
	}
	return strings.Join(lines, "\n")
}

// formatLiuyaoSection 格式化六爻部分
func (s *FortuneService) formatLiuyaoSection(payload interface{}) string {
	if payload == nil {
		return ""
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}

	var normalized struct {
		Primary     string `json:"primary"`
		Relating    string `json:"relating"`
		MovingCount int    `json:"movingCount"`
		Lines       []struct {
			Text string `json:"text"`
		} `json:"lines"`
	}
	if err := json.Unmarshal(raw, &normalized); err != nil {
		return ""
	}

	lines := []string{
		"本次东玄六爻：",
		"主卦：" + normalized.Primary,
		"变卦：" + normalized.Relating,
		"动爻数量：" + strconv.Itoa(normalized.MovingCount),
		"六爻明细：",
	}
	for _, line := range normalized.Lines {
		lines = append(lines, "  "+line.Text)
	}
	return strings.Join(lines, "\n")
}

// toPromptsCards 转换卡牌
func toPromptsCards(cards []db.Card) []prompts.Card {
	var out []prompts.Card
	for _, c := range cards {
		out = append(out, prompts.Card{ID: c.ID, Name: c.Name, Emoji: c.Emoji, Keywords: c.Keywords, Reversed: c.Reversed})
	}
	return out
}

// getPetLabel 获取宠物标签
func getPetLabel(petType string) string {
	labels := map[string]string{
		"dog":    "狗狗",
		"cat":    "猫咪",
		"rabbit": "兔子",
		"bird":   "鸟类",
	}
	if label, ok := labels[petType]; ok {
		return label
	}
	return "宠物"
}

// AIError AI 错误
type AIError struct {
	Message string
}

func (e *AIError) Error() string {
	return e.Message
}
