package auth

import (
	"errors"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var Secret string

func init() {
	Secret = os.Getenv("JWT_SECRET")
	if Secret == "" {
		Secret = "pet-fortune-secret-change-in-prod"
	}
}

type Claims struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func SignToken(id, username, role string) (string, error) {
	claims := Claims{
		ID:       id,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(Secret))
}

func VerifyToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(Secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

func RequireAuth(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}
	if token == "" {
		c.JSON(401, gin.H{"error": "未登录"})
		c.Abort()
		return
	}
	claims, err := VerifyToken(token)
	if err != nil {
		c.JSON(401, gin.H{"error": "Token 无效或已过期"})
		c.Abort()
		return
	}
	c.Set("user", claims)
	c.Next()
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		RequireAuth(c)
		if c.IsAborted() {
			return
		}
		u, _ := c.Get("user")
		claims := u.(*Claims)
		for _, r := range roles {
			if claims.Role == r {
				c.Next()
				return
			}
		}
		c.JSON(403, gin.H{"error": "权限不足"})
		c.Abort()
	}
}
