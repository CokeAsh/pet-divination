package ai

import (
	"context"
	"sync"

	openai "github.com/sashabaranov/go-openai"
)

type Provider struct {
	Client *openai.Client
	Model  string
	Name   string
}

var (
	providers []Provider
	callIndex  int
	mu        sync.Mutex
)

func Init(deepseekKey, deepseekBase, openaiKey, openaiBase string, useDeepSeek bool) {
	if useDeepSeek && deepseekKey != "" {
		base := deepseekBase
		if base == "" {
			base = "https://api.deepseek.com/v1"
		}
		config := openai.DefaultConfig(deepseekKey)
		config.BaseURL = base
		providers = append(providers, Provider{
			Client: openai.NewClientWithConfig(config),
			Model:  "deepseek-chat",
			Name:   "DeepSeek",
		})
	}
	if openaiKey != "" {
		base := openaiBase
		if base == "" {
			base = "https://api.openai.com/v1"
		}
		config := openai.DefaultConfig(openaiKey)
		config.BaseURL = base
		providers = append(providers, Provider{
			Client: openai.NewClientWithConfig(config),
			Model:  "gpt-4o",
			Name:   "OpenAI",
		})
	}
}

func HasProvider() bool {
	return len(providers) > 0
}

func ProviderNames() []string {
	var names []string
	for _, p := range providers {
		names = append(names, p.Name)
	}
	return names
}

func CreateChatCompletion(ctx context.Context, messages []openai.ChatCompletionMessage, maxTokens int, temperature float32) (string, error) {
	if len(providers) == 0 {
		return "", nil
	}
	mu.Lock()
	p := providers[callIndex%len(providers)]
	callIndex++
	mu.Unlock()

	resp, err := p.Client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       p.Model,
		Messages:    messages,
		MaxTokens:   maxTokens,
		Temperature: temperature,
	})
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", nil
	}
	return resp.Choices[0].Message.Content, nil
}
