package draw

import (
	"math/rand"
	"pet-fortune/backend/internal/prompts"
)

var tarotPool = []prompts.Card{
	{ID: 0, Name: "愚者", Emoji: "🃏", Keywords: "新开始、自由、冒险、纯真"},
	{ID: 1, Name: "魔术师", Emoji: "✨", Keywords: "意志力、创造、技巧、主动"},
	{ID: 2, Name: "女祭司", Emoji: "🌙", Keywords: "直觉、神秘、内在智慧、等待"},
	{ID: 3, Name: "女皇", Emoji: "🌸", Keywords: "丰盛、爱、母性、感官享受"},
	{ID: 4, Name: "皇帝", Emoji: "👑", Keywords: "稳定、权威、保护、秩序"},
	{ID: 5, Name: "教皇", Emoji: "🕊️", Keywords: "传统、信任、引导、精神"},
	{ID: 6, Name: "恋人", Emoji: "💕", Keywords: "爱、选择、联结、和谐"},
	{ID: 7, Name: "战车", Emoji: "🏆", Keywords: "胜利、意志、前进、掌控"},
	{ID: 8, Name: "力量", Emoji: "🦁", Keywords: "勇气、耐心、温柔的力量"},
	{ID: 9, Name: "隐士", Emoji: "🕯️", Keywords: "独处、内省、寻找答案"},
	{ID: 10, Name: "命运之轮", Emoji: "☸️", Keywords: "转变、循环、命运、机遇"},
	{ID: 11, Name: "正义", Emoji: "⚖️", Keywords: "公平、真相、因果、平衡"},
	{ID: 12, Name: "倒吊人", Emoji: "🙃", Keywords: "暂停、牺牲、换角度、等待"},
	{ID: 13, Name: "死神", Emoji: "🍂", Keywords: "转变、结束与开始、蜕变"},
	{ID: 14, Name: "节制", Emoji: "🌊", Keywords: "平衡、耐心、融合、疗愈"},
	{ID: 15, Name: "恶魔", Emoji: "🔗", Keywords: "束缚、执着、物质欲望、依赖"},
	{ID: 16, Name: "高塔", Emoji: "⚡", Keywords: "突变、颠覆、释放、觉醒"},
	{ID: 17, Name: "星星", Emoji: "⭐", Keywords: "希望、平静、梦想、疗愈"},
	{ID: 18, Name: "月亮", Emoji: "🌕", Keywords: "幻觉、焦虑、直觉、潜意识"},
	{ID: 19, Name: "太阳", Emoji: "☀️", Keywords: "喜悦、成功、活力、明朗"},
	{ID: 20, Name: "审判", Emoji: "🔔", Keywords: "觉醒、回顾、新生、召唤"},
	{ID: 21, Name: "世界", Emoji: "🌍", Keywords: "圆满、完成、整合、成就"},
}

var lenormandPool = []prompts.Card{
	{ID: 1, Name: "骑士", Emoji: "🏇", Keywords: "消息、快速到来、访客"},
	{ID: 2, Name: "三叶草", Emoji: "🍀", Keywords: "小运气、机会、短暂喜悦"},
	{ID: 3, Name: "船", Emoji: "⛵", Keywords: "旅行、远方、冒险、愿望"},
	{ID: 4, Name: "房子", Emoji: "🏠", Keywords: "家、安全感、舒适、归属"},
	{ID: 5, Name: "树", Emoji: "🌳", Keywords: "健康、成长、根基、生命力"},
	{ID: 6, Name: "云朵", Emoji: "☁️", Keywords: "不确定、混乱、疑虑"},
	{ID: 7, Name: "蛇", Emoji: "🐍", Keywords: "诱惑、复杂、嫉妒、智慧"},
	{ID: 8, Name: "棺材", Emoji: "⬛", Keywords: "结束、变化、低潮、休眠"},
	{ID: 9, Name: "花束", Emoji: "💐", Keywords: "礼物、惊喜、优雅、感谢"},
	{ID: 10, Name: "镰刀", Emoji: "⚔️", Keywords: "突然、分离、决断、收割"},
	{ID: 11, Name: "鞭子", Emoji: "💥", Keywords: "争执、重复、纪律、冲突"},
	{ID: 12, Name: "鸟", Emoji: "🐦", Keywords: "对话、焦虑、流言、沟通"},
	{ID: 13, Name: "孩童", Emoji: "👶", Keywords: "新事物、天真、开始、小事"},
	{ID: 14, Name: "狐狸", Emoji: "🦊", Keywords: "谨慎、技巧、自我保护、聪明"},
	{ID: 15, Name: "熊", Emoji: "🐻", Keywords: "力量、保护、权威、领导"},
	{ID: 16, Name: "星星", Emoji: "⭐", Keywords: "希望、指引、梦想、好运"},
	{ID: 17, Name: "鹳鸟", Emoji: "🦢", Keywords: "变化、迁移、新生、期待"},
	{ID: 18, Name: "狗", Emoji: "🐕", Keywords: "忠诚、友谊、信任、陪伴"},
	{ID: 19, Name: "塔", Emoji: "🗼", Keywords: "孤独、权威机构、自我、界限"},
	{ID: 20, Name: "花园", Emoji: "🌿", Keywords: "社交、公共场合、聚会、展示"},
	{ID: 21, Name: "山脉", Emoji: "⛰️", Keywords: "障碍、挑战、延迟、阻力"},
	{ID: 22, Name: "十字路", Emoji: "🛤️", Keywords: "选择、岔路、决定、方向"},
	{ID: 23, Name: "老鼠", Emoji: "🐭", Keywords: "损耗、焦虑、偷偷流失、压力"},
	{ID: 24, Name: "心", Emoji: "❤️", Keywords: "爱、情感、感受、温柔"},
	{ID: 25, Name: "戒指", Emoji: "💍", Keywords: "承诺、约定、循环、合同"},
	{ID: 26, Name: "书", Emoji: "📖", Keywords: "秘密、知识、学习、隐藏"},
	{ID: 27, Name: "信", Emoji: "✉️", Keywords: "文件、消息、书写、通知"},
	{ID: 28, Name: "男人", Emoji: "👤", Keywords: "重要男性、自己（女性来访者）"},
	{ID: 29, Name: "女人", Emoji: "👤", Keywords: "重要女性、自己（男性来访者）"},
	{ID: 30, Name: "百合", Emoji: "🌷", Keywords: "纯洁、和谐、满足、成熟"},
	{ID: 31, Name: "太阳", Emoji: "☀️", Keywords: "成功、喜悦、活力、明朗"},
	{ID: 32, Name: "月亮", Emoji: "🌙", Keywords: "感性、荣誉、直觉、情绪"},
	{ID: 33, Name: "钥匙", Emoji: "🗝️", Keywords: "开启、成功、答案、必然"},
	{ID: 34, Name: "鱼", Emoji: "🐟", Keywords: "财富、流动、丰盛、商业"},
	{ID: 35, Name: "锚", Emoji: "⚓", Keywords: "稳定、坚持、目标、安全"},
	{ID: 36, Name: "十字架", Emoji: "✝️", Keywords: "重担、命运、信仰、考验"},
}

func DrawCards(typ string, count int) []prompts.Card {
	var pool []prompts.Card
	if typ == "tarot" {
		pool = make([]prompts.Card, len(tarotPool))
		copy(pool, tarotPool)
	} else {
		pool = make([]prompts.Card, len(lenormandPool))
		copy(pool, lenormandPool)
	}
	var result []prompts.Card
	for i := 0; i < count && len(pool) > 0; i++ {
		idx := rand.Intn(len(pool))
		card := pool[idx]
		pool = append(pool[:idx], pool[idx+1:]...)
		if typ == "tarot" {
			card.Reversed = rand.Float32() < 0.5
		}
		result = append(result, card)
	}
	return result
}
