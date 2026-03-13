package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	// 测试不同的连接字符串
	urls := []string{
		"postgresql://postgres.jwyesgpzoiodngojmbso:JingyunLi0814@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
		"postgresql://postgres.jwyesgpzoiodngojmbso:JingyunLi0814@aws-1-ap-southeast-2.supabase.com:5432/postgres",
	}

	for i, url := range urls {
		fmt.Printf("\nTesting connection %d: %s\n", i+1, url)
		db, err := sql.Open("pgx", url)
		if err != nil {
			log.Printf("Failed to open: %v", err)
			continue
		}

		// 设置超时
		db.SetConnMaxLifetime(5 * time.Second)
		db.SetMaxOpenConns(1)

		err = db.Ping()
		if err != nil {
			log.Printf("Failed to ping: %v", err)
		} else {
			fmt.Println("✓ Connection successful!")
			db.Close()
			return
		}
		db.Close()
	}

	fmt.Println("\n❌ All connection attempts failed")
}
