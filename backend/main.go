package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"pet-fortune/backend/internal/ai"
	"pet-fortune/backend/internal/db"
	"pet-fortune/backend/internal/prompts"

	"github.com/gin-gonic/gin"
)

func min() {
	// 加载 .env（简单实现：读取项目根目录 .env）
	loadEnv()

	// 初始化数据库
	if err := db.Init(""); err != nil {
		log.Fatal("db init:", err)
	}

	// 启动时写入塔罗/雷诺曼牌义到知识库（若为空）
	prompts.SeedKnowledgeBases()

	// 初始化 AI
	useDeepSeek := os.Getenv("USE_DEEPSEEK") != "false"
	ai.Init(
		os.Getenv("DEEPSEEK_API_KEY"),
		os.Getenv("DEEPSEEK_BASE_URL"),
		os.Getenv("OPENAI_API_KEY"),
		os.Getenv("OPENAI_BASE_URL"),
		useDeepSeek,
	)

	// 设置路由
	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	// 设置所有路由
	SetupRoutes(r)

	// 启动服务
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

// loadEnv 加载环境变量
func loadEnv() {
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
}

// corsMiddleware CORS 中间件
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
