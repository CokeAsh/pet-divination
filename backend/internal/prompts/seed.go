package prompts

import (
	"log"
	"pet-fortune/backend/internal/db"
)

// SeedKnowledgeBases writes default tarot and lenormand knowledge for active characters when absent.
func SeedKnowledgeBases() {
	seedTarot := make(map[string]map[string]string)
	for name, meaning := range TarotMeanings {
		seedTarot[name] = map[string]string{
			"upright":  meaning.Upright,
			"reversed": meaning.Reversed,
		}
	}

	characters := []string{"liliana", "yiqing"}
	for _, character := range characters {
		if kb, _ := db.GetKnowledgeBase(character, "tarot"); kb == nil {
			if _, err := db.UpsertKnowledgeBase(character, "tarot", seedTarot); err != nil {
				log.Printf("seed tarot knowledge for %s failed: %v", character, err)
			}
		}

		if kb, _ := db.GetKnowledgeBase(character, "lenormand"); kb == nil {
			if _, err := db.UpsertKnowledgeBase(character, "lenormand", LenormandMeanings); err != nil {
				log.Printf("seed lenormand knowledge for %s failed: %v", character, err)
			}
		}
	}
}
