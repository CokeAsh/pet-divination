// 初始化管理员账号
// 用法: go run ./cmd/init-admin <用户名> <密码>
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"pet-fortune/backend/internal/db"
)

func main() {
	args := os.Args
	if len(args) < 3 {
		fmt.Println("用法: npm run init-admin -- <用户名> <密码>")
		os.Exit(1)
	}
	username, password := args[1], args[2]
	// 加载 .env（从 backend/../.env）
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
	if err := db.Init(""); err != nil {
		fmt.Fprintf(os.Stderr, "db init: %v\n", err)
		os.Exit(1)
	}
	u, _ := db.GetUserByUsername(username)
	if u != nil {
		db.UpdateUser(u.ID, map[string]interface{}{"role": "admin"})
		fmt.Printf("用户 %q 已存在，已更新为管理员角色\n", username)
	} else {
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), 10)
		_, err := db.CreateUser(username, nil, string(hash), "admin", username)
		if err != nil {
			fmt.Fprintf(os.Stderr, "创建失败: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("管理员账号已创建：%s\n", username)
	}
}
