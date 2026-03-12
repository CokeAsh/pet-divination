package service

import (
	"encoding/json"
)

// parseJSON 解析 JSON
func parseJSON(s string, v interface{}) {
	_ = json.Unmarshal([]byte(s), v)
}

// parseJSONMap 解析 JSON 为 map
func parseJSONMap(s string) map[string]string {
	var m map[string]string
	if err := json.Unmarshal([]byte(s), &m); err == nil {
		return m
	}
	return make(map[string]string)
}
