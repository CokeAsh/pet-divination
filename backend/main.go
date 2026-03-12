package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"pet-fortune/backend/internal/ai"
	"pet-fortune/backend/internal/auth"
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/internal/draw"
	"pet-fortune/backend/internal/prompts"

	openai "github.com/sashabaranov/go-openai"
)

func main() {
	// 加载 .env（简单实现：读取项目根目录 .env）
	if wd, err := os.Getwd(); err == nil {
		envPath := filepath.Join(wd, "..", ".env")
		if b, err := os.ReadFile(envPath); err == nil {
			for _, line := range strings.Split(string(b), "\n") {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					val := strings.TrimSpace(parts[1])
					val = strings.Trim(val, "\"'")
					os.Setenv(key, val)
				}
			}
		}
	}

	// Supabase PostgreSQL：从 SUPABASE_DB_URL 或 DATABASE_URL 读取
	if err := db.Init(""); err != nil {
		log.Fatal("db init:", err)
	}

	// 启动时写入塔罗/雷诺曼牌义到知识库（若为空）
	prompts.SeedKnowledgeBases()

	useDeepSeek := os.Getenv("USE_DEEPSEEK") != "false"
	ai.Init(
		os.Getenv("DEEPSEEK_API_KEY"),
		os.Getenv("DEEPSEEK_BASE_URL"),
		os.Getenv("OPENAI_API_KEY"),
		os.Getenv("OPENAI_BASE_URL"),
		useDeepSeek,
	)

	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	// health
	r.GET("/api/health", func(c *gin.Context) {
		hasKey := ai.HasProvider()
		names := ai.ProviderNames()
		c.JSON(200, gin.H{"ok": true, "hasKey": hasKey, "providers": names})
	})

	// auth
	r.POST("/api/auth/register", handleRegister)
	r.POST("/api/auth/login", handleLogin)
	r.GET("/api/auth/me", auth.RequireAuth, handleMe)

	// admin
	admin := r.Group("/api/admin")
	admin.Use(auth.RequireRole("admin"))
	{
		admin.GET("/users", handleAdminListUsers)
		admin.POST("/users", handleAdminCreateUser)
		admin.GET("/stats", handleAdminStats)
		admin.PUT("/users/:id", handleAdminUpdateUser)
		admin.PUT("/users/:id/permissions", handleAdminUpdatePermissions)
	}

	// prompts & knowledge
	r.GET("/api/prompts/:characterKey", auth.RequireAuth, handleGetPrompt)
	r.PUT("/api/prompts/:characterKey", auth.RequireAuth, handlePutPrompt)
	r.GET("/api/knowledge/:characterKey/:type", auth.RequireAuth, handleGetKnowledge)
	r.PUT("/api/knowledge/:characterKey/:type", auth.RequireAuth, handlePutKnowledge)

	// fortune-teller
	r.GET("/api/fortune-teller/profile", auth.RequireRole("admin", "fortune_teller"), handleFortuneTellerProfile)
	r.PUT("/api/fortune-teller/profile", auth.RequireRole("admin", "fortune_teller"), handleFortuneTellerUpdate)

	// conversations
	r.GET("/api/conversations", handleListConversations)
	r.GET("/api/conversations/:id", handleGetConversation)
	r.POST("/api/conversations", handleCreateConversation)
	r.PUT("/api/conversations/:id", handleUpdateConversation)
	r.DELETE("/api/conversations/:id", handleDeleteConversation)

	// fortune & chat
	r.POST("/api/fortune", handleFortuneV2)
	r.POST("/api/chat", handleChatV2)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("后端已启动: http://localhost:%s", port)
	if !ai.HasProvider() {
		log.Println("未检测到 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，请在 .env 中配置")
	} else {
		log.Println("已启用 API 提供商:", strings.Join(ai.ProviderNames(), ", "))
	}
	r.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func handleRegister(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Username == "" || body.Password == "" {
		c.JSON(400, gin.H{"error": "用户名和密码不能为空"})
		return
	}
	u, _ := db.GetUserByUsername(body.Username)
	if u != nil {
		c.JSON(409, gin.H{"error": "用户名已存在"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	email := body.Email
	user, err := db.CreateUser(body.Username, &email, string(hash), "user", "")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	token, _ := auth.SignToken(user.ID, user.Username, user.Role)
	c.JSON(200, gin.H{
		"token": token,
		"user":  userSafe(user),
	})
}

func handleLogin(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Username == "" || body.Password == "" {
		c.JSON(400, gin.H{"error": "用户名和密码不能为空"})
		return
	}
	u, _ := db.GetUserByUsername(body.Username)
	if u == nil {
		c.JSON(401, gin.H{"error": "用户名或密码错误"})
		return
	}
	if u.Disabled != 0 {
		c.JSON(403, gin.H{"error": "账号已被禁用"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(body.Password)) != nil {
		c.JSON(401, gin.H{"error": "用户名或密码错误"})
		return
	}
	token, _ := auth.SignToken(u.ID, u.Username, u.Role)
	c.JSON(200, gin.H{
		"token": token,
		"user":  userSafe(u),
	})
}

func handleMe(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	u, _ := db.GetUserByID(cl.ID)
	if u == nil {
		c.JSON(404, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(200, userSafeFull(u))
}

func userSafe(u *db.User) gin.H {
	return gin.H{
		"id":           u.ID,
		"username":     u.Username,
		"role":         u.Role,
		"display_name": nullStrVal(u.DisplayName),
	}
}

func userSafeFull(u *db.User) gin.H {
	return gin.H{
		"id":                 u.ID,
		"username":           u.Username,
		"email":              nullStrVal(u.Email),
		"role":               u.Role,
		"display_name":       nullStrVal(u.DisplayName),
		"bio":                nullStrVal(u.Bio),
		"character_key":      nullStrVal(u.CharacterKey),
		"can_edit_knowledge": u.CanEditKnowledge,
		"disabled":           u.Disabled,
		"created_at":         u.CreatedAt,
		"updated_at":         u.UpdatedAt,
	}
}

func nullStrVal(n sql.NullString) interface{} {
	if n.Valid {
		return n.String
	}
	return nil
}

func handleAdminListUsers(c *gin.Context) {
	role := c.Query("role")
	list, err := db.ListUsers(role)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, list)
}

func handleAdminCreateUser(c *gin.Context) {
	var body struct {
		Username    string `json:"username"`
		Email       string `json:"email"`
		Password    string `json:"password"`
		Role        string `json:"role"`
		DisplayName string `json:"display_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "缺少必填字段"})
		return
	}
	if body.Username == "" || body.Password == "" || body.Role == "" {
		c.JSON(400, gin.H{"error": "缺少必填字段"})
		return
	}
	if body.Role != "admin" && body.Role != "fortune_teller" && body.Role != "user" {
		c.JSON(400, gin.H{"error": "无效的角色"})
		return
	}
	u, _ := db.GetUserByUsername(body.Username)
	if u != nil {
		c.JSON(409, gin.H{"error": "用户名已存在"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	email := body.Email
	user, err := db.CreateUser(body.Username, &email, string(hash), body.Role, body.DisplayName)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, userSafeFull(user))
}

func handleAdminUpdateUser(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		DisplayName *string `json:"display_name"`
		Bio         *string `json:"bio"`
		Disabled    *bool   `json:"disabled"`
		Role        *string `json:"role"`
		Password    *string `json:"password"`
	}
	c.ShouldBindJSON(&body)
	fields := make(map[string]interface{})
	if body.DisplayName != nil {
		fields["display_name"] = *body.DisplayName
	}
	if body.Bio != nil {
		fields["bio"] = *body.Bio
	}
	if body.Disabled != nil {
		fields["disabled"] = *body.Disabled
	}
	if body.Role != nil {
		fields["role"] = *body.Role
	}
	if body.Password != nil && *body.Password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(*body.Password), 10)
		fields["password"] = string(hash)
	}
	user, err := db.UpdateUser(id, fields)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, userSafeFull(user))
}

func handleAdminUpdatePermissions(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		CanEditKnowledge *bool   `json:"can_edit_knowledge"`
		CharacterKey     *string `json:"character_key"`
	}
	c.ShouldBindJSON(&body)
	fields := make(map[string]interface{})
	if body.CanEditKnowledge != nil {
		fields["can_edit_knowledge"] = *body.CanEditKnowledge
	}
	if body.CharacterKey != nil {
		fields["character_key"] = *body.CharacterKey
	}
	user, err := db.UpdateUser(id, fields)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, userSafeFull(user))
}

func handleAdminStats(c *gin.Context) {
	counts, _ := db.CountUsers()
	c.JSON(200, gin.H{"userCounts": counts})
}

func canEditKnowledge(u *db.User) bool {
	return u.Role == "admin" || (u.Role == "fortune_teller" && u.CanEditKnowledge != 0)
}

func handleGetPrompt(c *gin.Context) {
	key := c.Param("characterKey")
	cp, _ := db.GetCharacterPrompt(key)
	char := prompts.LilianaDefault
	if cp != nil {
		if cp.Persona.Valid {
			char.Persona = cp.Persona.String
		}
		if cp.ChatFlow.Valid {
			char.ChatFlow = cp.ChatFlow.String
		}
		if cp.FortuneInstructions.Valid {
			// parse JSON
			var m map[string]string
			if err := jsonUnmarshal(cp.FortuneInstructions.String, &m); err == nil {
				char.FortuneInstructions = m
			}
		}
	}
	isDefault := cp == nil
	c.JSON(200, gin.H{
		"character_key":         key,
		"persona":               char.Persona,
		"chat_flow":             char.ChatFlow,
		"fortune_instructions":  char.FortuneInstructions,
		"is_default":            isDefault,
	})
}

func jsonUnmarshal(s string, v interface{}) error {
	return json.Unmarshal([]byte(s), v)
}

func handlePutPrompt(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	u, _ := db.GetUserByID(cl.ID)
	if u == nil || !canEditKnowledge(u) {
		c.JSON(403, gin.H{"error": "权限不足"})
		return
	}
	key := c.Param("characterKey")
	var body struct {
		Persona             *string                `json:"persona"`
		ChatFlow             *string                `json:"chat_flow"`
		FortuneInstructions  map[string]string      `json:"fortune_instructions"`
	}
	c.ShouldBindJSON(&body)
	err := db.UpsertCharacterPrompt(key, body.Persona, body.ChatFlow, body.FortuneInstructions)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	cp, _ := db.GetCharacterPrompt(key)
	c.JSON(200, cp)
}

func handleGetKnowledge(c *gin.Context) {
	key := c.Param("characterKey")
	typ := c.Param("type")
	kb, _ := db.GetKnowledgeBase(key, typ)
	var data interface{}
	if kb != nil {
		jsonUnmarshal(kb.Data, &data)
	} else {
		if typ == "tarot" {
			data = tarotToMap()
		} else if typ == "lenormand" {
			data = prompts.LenormandMeanings
		} else {
			data = map[string]interface{}{}
		}
	}
	c.JSON(200, gin.H{
		"character_key": key,
		"type":          typ,
		"data":          data,
		"is_default":    kb == nil,
	})
}

func tarotToMap() map[string]map[string]string {
	m := make(map[string]map[string]string)
	for name, v := range prompts.TarotMeanings {
		m[name] = map[string]string{"upright": v.Upright, "reversed": v.Reversed}
	}
	return m
}

func handlePutKnowledge(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	u, _ := db.GetUserByID(cl.ID)
	if u == nil || !canEditKnowledge(u) {
		c.JSON(403, gin.H{"error": "权限不足"})
		return
	}
	key := c.Param("characterKey")
	typ := c.Param("type")
	var body struct {
		Data map[string]interface{} `json:"data"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Data == nil {
		c.JSON(400, gin.H{"error": "data 格式错误"})
		return
	}
	kb, err := db.UpsertKnowledgeBase(key, typ, body.Data)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	var data interface{}
	jsonUnmarshal(kb.Data, &data)
	c.JSON(200, gin.H{"character_key": key, "type": typ, "data": data})
}

func handleFortuneTellerProfile(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	u, _ := db.GetUserByID(cl.ID)
	if u == nil {
		c.JSON(404, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(200, userSafeFull(u))
}

func handleFortuneTellerUpdate(c *gin.Context) {
	claims, _ := c.Get("user")
	cl := claims.(*auth.Claims)
	var body struct {
		DisplayName *string `json:"display_name"`
		Bio         *string `json:"bio"`
	}
	c.ShouldBindJSON(&body)
	fields := make(map[string]interface{})
	if body.DisplayName != nil {
		fields["display_name"] = *body.DisplayName
	}
	if body.Bio != nil {
		fields["bio"] = *body.Bio
	}
	user, _ := db.UpdateUser(cl.ID, fields)
	c.JSON(200, userSafeFull(user))
}

func handleListConversations(c *gin.Context) {
	deviceID := c.Query("deviceId")
	if deviceID == "" {
		c.JSON(400, gin.H{"error": "deviceId required"})
		return
	}
	list, _ := db.ListConversations(deviceID)
	c.JSON(200, list)
}

func handleGetConversation(c *gin.Context) {
	conv, _ := db.GetConversation(c.Param("id"))
	if conv == nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}
	c.JSON(200, conv)
}

func handleCreateConversation(c *gin.Context) {
	var body struct {
		DeviceID string          `json:"deviceId"`
		Title    string          `json:"title"`
		Messages []db.ChatMessage `json:"messages"`
	}
	c.ShouldBindJSON(&body)
	if body.DeviceID == "" {
		c.JSON(400, gin.H{"error": "deviceId required"})
		return
	}
	title := body.Title
	if title == "" {
		title = "新对话"
	}
	meta, err := db.CreateConversation(body.DeviceID, title, body.Messages)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, meta)
}

func handleUpdateConversation(c *gin.Context) {
	var body struct {
		Messages []db.ChatMessage `json:"messages"`
		Title    *string          `json:"title"`
	}
	c.ShouldBindJSON(&body)
	err := db.UpdateConversation(c.Param("id"), body.Messages, body.Title)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"ok": true})
}

func handleDeleteConversation(c *gin.Context) {
	db.DeleteConversation(c.Param("id"))
	c.JSON(200, gin.H{"ok": true})
}

func handleFortune(c *gin.Context) {
	if !ai.HasProvider() {
		c.JSON(500, gin.H{
			"error":   "未配置 API Key",
			"message": "请在 .env 中配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY",
		})
		return
	}
	var body struct {
		PetType  string         `json:"petType"`
		PetName  string         `json:"petName"`
		Emotion  string         `json:"emotion"`
		Question string         `json:"question"`
		Method   string         `json:"method"`
		Cards    []prompts.Card `json:"cards"`
	}
	c.ShouldBindJSON(&body)
	if body.PetType == "" {
		body.PetType = "other"
	}
	if body.PetName == "" {
		body.PetName = "毛孩子"
	}
	if body.Method == "" {
		body.Method = "direct"
	}
	petLabel := map[string]string{"dog": "狗狗", "cat": "猫咪", "rabbit": "兔子", "bird": "鸟"}[body.PetType]
	if petLabel == "" {
		petLabel = "宠物"
	}
	sysPrompt := prompts.BuildSystemPrompt(body.Method, "liliana")
	posLabel := func(c prompts.Card) string {
		if c.Reversed {
			return "逆位"
		}
		return "正位"
	}
	reversedNote := ""
	for _, c := range body.Cards {
		if c.Reversed {
			reversedNote = "\n注意：逆位牌代表该牌的能量受到阻碍、内化或尚未释放，请在解读中体现出这种张力与转化的可能。"
			break
		}
	}
	cardList := ""
	if len(body.Cards) > 0 && body.Method == "tarot3" {
		positions := []string{"过去", "现在", "未来"}
		for i, c := range body.Cards {
			if i < 3 {
				cardList += "  " + positions[i] + "：" + c.Name + " " + posLabel(c) + "\n"
			}
		}
		cardList = "\n本次三张牌阵：\n" + cardList + reversedNote
	} else if len(body.Cards) > 0 {
		for _, c := range body.Cards {
			cardList += "  " + c.Name + " " + posLabel(c) + "\n"
		}
		cardList = "\n本次抽到的牌：\n" + cardList + reversedNote
	}
	isTarot := body.Method == "tarot1" || body.Method == "tarot3"
	tarotCards := []prompts.Card{}
	lenormandCards := []prompts.Card{}
	if isTarot {
		tarotCards = body.Cards
	} else if body.Method == "lenormand" {
		lenormandCards = body.Cards
	}
	cardMeanings := prompts.BuildCardMeaningsContext(tarotCards, lenormandCards, "liliana")
	userPrompt := "宠物类型：" + petLabel + "，名字：" + body.PetName + "。"
	if body.Emotion != "" {
		userPrompt += "\n主人感应到 TA 现在的状态：" + body.Emotion + "。"
	}
	userPrompt += cardList + cardMeanings
	if body.Question != "" {
		userPrompt += "\n\n主人的问题：" + body.Question
	} else {
		userPrompt += "\n\n主人想感应 TA 此刻最想说的话。"
	}
	msgs := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: sysPrompt},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}
	content, err := ai.CreateChatCompletion(context.Background(), msgs, 800, 0.85)
	if err != nil {
		c.JSON(500, gin.H{"error": "占卜服务暂时不可用", "message": err.Error()})
		return
	}
	if content == "" {
		content = "（暂时没有收到回复，请稍后再试。）"
	}
	c.JSON(200, gin.H{"message": strings.TrimSpace(content)})
}

func handleChat(c *gin.Context) {
	if !ai.HasProvider() {
		c.JSON(500, gin.H{"error": "未配置 API Key，请在 .env 中配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY"})
		return
	}
	var body struct {
		Messages []db.ChatMessage `json:"messages"`
		Confirm  bool             `json:"confirm"`
		Intro    *string          `json:"intro"`
	}
	c.ShouldBindJSON(&body)
	confirmedIntro := ""
	if body.Intro != nil {
		confirmedIntro = *body.Intro
	}
	msgs := body.Messages
	if msgs == nil {
		msgs = []db.ChatMessage{}
	}
	buildCleanMessages := func(ms []db.ChatMessage) []openai.ChatCompletionMessage {
		var out []openai.ChatCompletionMessage
		for _, m := range ms {
			if m.Role != "user" && m.Role != "assistant" {
				continue
			}
			content := m.Content
			if m.Role == "user" && strings.HasPrefix(content, "[已抽牌]") {
				meanings := prompts.BuildCardMeaningsContext(toPromptsCards(m.Tarot), toPromptsCards(m.Lenormand), "liliana")
				content += meanings
			}
			out = append(out, openai.ChatCompletionMessage{Role: m.Role, Content: content})
		}
		return out
	}
	normalizeSignals := func(s string) string {
		re := regexp.MustCompile(`[【\[［]DRAW_CARDS[】\]］]`)
		return re.ReplaceAllString(s, "[DRAW_CARDS]")
	}
	T_POSITIONS := []string{"T1（现在的情绪底色）", "T2（压力/不适的来源）", "T3（它想对你传达的需求）", "T4（你们关系的互动模式）", "T5（未来 7-14 天的情绪走向）"}
	L_POSITIONS := []string{"L1（日常安全感来源）", "L2（触发点/敏感点）", "L3（最有效的安抚/沟通方式）"}
	formatCardsForAI := func(tarot, lenormand []prompts.Card) string {
		s := "[已抽牌]\n塔罗 T1-T5：\n"
		for i, c := range tarot {
			if i < len(T_POSITIONS) {
				pos := "正位"
				if c.Reversed {
					pos = "逆位"
				}
				s += "  " + T_POSITIONS[i] + "：" + c.Name + " " + pos + " — 关键词：" + c.Keywords + "\n"
			}
		}
		s += "\n雷诺曼 L1-L3：\n"
		for i, c := range lenormand {
			if i < len(L_POSITIONS) {
				s += "  " + L_POSITIONS[i] + "：" + c.Name + " — 关键词：" + c.Keywords + "\n"
			}
		}
		return s
	}

	var intro string
	if body.Confirm {
		intro = confirmedIntro
	} else {
		// 第一次调用
		clean := buildCleanMessages(msgs)
		content, err := ai.CreateChatCompletion(context.Background(), append(
			[]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt("liliana")}},
			clean...,
		), 900, 0.8)
		if err != nil {
			c.JSON(500, gin.H{"error": "占卜服务暂时不可用", "message": err.Error()})
			return
		}
		rawContent := normalizeSignals(strings.TrimSpace(content))
		if rawContent == "" {
			rawContent = "（暂时没有收到回复，请稍后再试。）"
		}
		if !strings.Contains(rawContent, "[DRAW_CARDS]") {
			drawHint := regexp.MustCompile(`我来抽牌|帮你抽|帮您抽|开始抽牌|为你抽|为您抽|抽取牌面|牌面落下`).MatchString(rawContent)
			if drawHint {
				c.JSON(200, gin.H{"drawReady": true, "intro": strings.TrimSpace(rawContent)})
				return
			}
			c.JSON(200, gin.H{"message": rawContent})
			return
		}
		idx := strings.Index(rawContent, "[DRAW_CARDS]")
		intro = strings.TrimSpace(rawContent[:idx])
		c.JSON(200, gin.H{"drawReady": true, "intro": intro})
		return
	}

	// 抽牌 + 解读
	tarotCards := draw.DrawCards("tarot", 5)
	lenormandCards := draw.DrawCards("lenormand", 3)
	cardText := formatCardsForAI(tarotCards, lenormandCards)
	cardMeanings := prompts.BuildCardMeaningsContext(tarotCards, lenormandCards, prompts.CharacterLiliana)
	readingMsgs := buildCleanMessages(msgs)
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "assistant", Content: intro})
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "user", Content: cardText + cardMeanings})
	fullMsgs := append([]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt("liliana")}}, readingMsgs...)
	reading, err := ai.CreateChatCompletion(context.Background(), fullMsgs, 2400, 0.85)
	if err != nil {
		c.JSON(500, gin.H{"error": "占卜服务暂时不可用", "message": err.Error()})
		return
	}
	reading = normalizeSignals(strings.TrimSpace(strings.ReplaceAll(reading, "[DRAW_CARDS]", "")))
	if reading == "" {
		reading = "（暂时没有收到解读，请稍后重试。）"
	}
	resp := gin.H{"message": reading, "cards": gin.H{"tarot": tarotCards, "lenormand": lenormandCards}}
	if !body.Confirm {
		resp["intro"] = intro
	} else {
		resp["intro"] = nil
	}
	c.JSON(200, resp)
}

func toPromptsCards(cards []db.Card) []prompts.Card {
	var out []prompts.Card
	for _, c := range cards {
		out = append(out, prompts.Card{ID: c.ID, Name: c.Name, Emoji: c.Emoji, Keywords: c.Keywords, Reversed: c.Reversed})
	}
	return out
}

func handleFortuneV2(c *gin.Context) {
	if !ai.HasProvider() {
		c.JSON(500, gin.H{
			"error":   "API key not configured",
			"message": "Please configure DEEPSEEK_API_KEY or OPENAI_API_KEY in .env",
		})
		return
	}

	type liuyaoLine struct {
		Label  string `json:"label"`
		Kind   string `json:"kind"`
		Moving bool   `json:"moving"`
		Text   string `json:"text"`
	}
	type liuyaoPayload struct {
		Primary     string       `json:"primary"`
		Relating    string       `json:"relating"`
		MovingCount int          `json:"movingCount"`
		Lines       []liuyaoLine `json:"lines"`
	}

	var body struct {
		CharacterID string         `json:"characterId"`
		PetType     string         `json:"petType"`
		PetName     string         `json:"petName"`
		Emotion     string         `json:"emotion"`
		Question    string         `json:"question"`
		Method      string         `json:"method"`
		Cards       []prompts.Card `json:"cards"`
		Liuyao      *liuyaoPayload `json:"liuyao"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "invalid request body"})
		return
	}

	characterID := body.CharacterID
	if characterID == "" {
		characterID = prompts.CharacterLiliana
	}
	if body.PetType == "" {
		body.PetType = "other"
	}
	if body.PetName == "" {
		body.PetName = "毛孩子"
	}
	if body.Method == "" {
		body.Method = "direct"
	}

	petLabel := map[string]string{
		"dog":    "狗狗",
		"cat":    "猫咪",
		"rabbit": "兔子",
		"bird":   "鸟类",
	}[body.PetType]
	if petLabel == "" {
		petLabel = "宠物"
	}

	userPrompt := buildFortuneUserPromptV2(characterID, petLabel, body.PetName, body.Emotion, body.Question, body.Method, body.Cards, body.Liuyao)
	msgs := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: prompts.BuildSystemPrompt(body.Method, characterID)},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}

	content, err := ai.CreateChatCompletion(context.Background(), msgs, 1100, 0.85)
	if err != nil {
		c.JSON(500, gin.H{"error": "fortune service unavailable", "message": err.Error()})
		return
	}
	if strings.TrimSpace(content) == "" {
		content = "暂时没有收到清晰的回应，请稍后再试。"
	}

	resp := gin.H{"message": strings.TrimSpace(content)}
	if body.Method == "liuyao" && body.Liuyao != nil {
		resp["divination"] = body.Liuyao
	}
	c.JSON(200, resp)
}

func handleChatV2(c *gin.Context) {
	if !ai.HasProvider() {
		c.JSON(500, gin.H{"error": "API key not configured"})
		return
	}

	var body struct {
		CharacterID string           `json:"characterId"`
		Messages    []db.ChatMessage `json:"messages"`
		Confirm     bool             `json:"confirm"`
		Intro       *string          `json:"intro"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "invalid request body"})
		return
	}

	characterID := body.CharacterID
	if characterID == "" {
		characterID = prompts.CharacterLiliana
	}
	confirmedIntro := ""
	if body.Intro != nil {
		confirmedIntro = *body.Intro
	}
	msgs := body.Messages
	if msgs == nil {
		msgs = []db.ChatMessage{}
	}

	buildCleanMessages := func(ms []db.ChatMessage) []openai.ChatCompletionMessage {
		var out []openai.ChatCompletionMessage
		for _, m := range ms {
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

	normalizeSignals := func(s string) string {
		re := regexp.MustCompile(`[\[\【\(]DRAW_CARDS[\]\】\)]`)
		return re.ReplaceAllString(s, "[DRAW_CARDS]")
	}

	formatCardsForAI := func(tarot, lenormand []prompts.Card) string {
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

	var intro string
	if body.Confirm {
		intro = confirmedIntro
	} else {
		clean := buildCleanMessages(msgs)
		content, err := ai.CreateChatCompletion(
			context.Background(),
			append([]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt(characterID)}}, clean...),
			900,
			0.8,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": "chat service unavailable", "message": err.Error()})
			return
		}
		rawContent := normalizeSignals(strings.TrimSpace(content))
		if rawContent == "" {
			rawContent = "暂时没有收到清晰回应，请稍后再试。"
		}
		if !strings.Contains(rawContent, "[DRAW_CARDS]") {
			if regexp.MustCompile(`抽牌|起牌|进入牌阵`).MatchString(rawContent) {
				c.JSON(200, gin.H{"drawReady": true, "intro": strings.TrimSpace(rawContent)})
				return
			}
			c.JSON(200, gin.H{"message": rawContent})
			return
		}
		idx := strings.Index(rawContent, "[DRAW_CARDS]")
		intro = strings.TrimSpace(rawContent[:idx])
		c.JSON(200, gin.H{"drawReady": true, "intro": intro})
		return
	}

	tarotCards := draw.DrawCards("tarot", 5)
	lenormandCards := draw.DrawCards("lenormand", 3)
	cardText := formatCardsForAI(tarotCards, lenormandCards)
	cardMeanings := prompts.BuildCardMeaningsContext(tarotCards, lenormandCards, characterID)

	readingMsgs := buildCleanMessages(msgs)
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "assistant", Content: intro})
	readingMsgs = append(readingMsgs, openai.ChatCompletionMessage{Role: "user", Content: cardText + cardMeanings})

	fullMsgs := append([]openai.ChatCompletionMessage{{Role: "system", Content: prompts.BuildChatSystemPrompt(characterID)}}, readingMsgs...)
	reading, err := ai.CreateChatCompletion(context.Background(), fullMsgs, 2400, 0.85)
	if err != nil {
		c.JSON(500, gin.H{"error": "chat service unavailable", "message": err.Error()})
		return
	}
	reading = normalizeSignals(strings.TrimSpace(strings.ReplaceAll(reading, "[DRAW_CARDS]", "")))
	if reading == "" {
		reading = "暂时没有收到完整解读，请稍后重试。"
	}

	resp := gin.H{
		"message": reading,
		"cards": gin.H{
			"tarot":     tarotCards,
			"lenormand": lenormandCards,
		},
	}
	if !body.Confirm {
		resp["intro"] = intro
	}
	c.JSON(200, resp)
}

func buildFortuneUserPromptV2(characterID, petLabel, petName, emotion, question, method string, cards []prompts.Card, liuyao interface{}) string {
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
		if section := formatCardSectionV2(characterID, method, cards); section != "" {
			sections = append(sections, section)
		}
	case "liuyao":
		if section := formatLiuyaoSectionV2(liuyao); section != "" {
			sections = append(sections, section)
		}
	}

	return strings.Join(sections, "\n")
}

func formatCardSectionV2(characterID, method string, cards []prompts.Card) string {
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

func formatLiuyaoSectionV2(payload interface{}) string {
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
