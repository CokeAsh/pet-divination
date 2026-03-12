const TAROT_MAJOR = [
  { id: 0,  name: '愚者',     emoji: '🃏', keywords: '新开始、自由、冒险、纯真' },
  { id: 1,  name: '魔术师',   emoji: '✨', keywords: '意志力、创造、技巧、主动' },
  { id: 2,  name: '女祭司',   emoji: '🌙', keywords: '直觉、神秘、内在智慧、等待' },
  { id: 3,  name: '女皇',     emoji: '🌸', keywords: '丰盛、爱、母性、感官享受' },
  { id: 4,  name: '皇帝',     emoji: '👑', keywords: '稳定、权威、保护、秩序' },
  { id: 5,  name: '教皇',     emoji: '🕊️', keywords: '传统、信任、引导、精神' },
  { id: 6,  name: '恋人',     emoji: '💕', keywords: '爱、选择、联结、和谐' },
  { id: 7,  name: '战车',     emoji: '🏆', keywords: '胜利、意志、前进、掌控' },
  { id: 8,  name: '力量',     emoji: '🦁', keywords: '勇气、耐心、温柔的力量' },
  { id: 9,  name: '隐士',     emoji: '🕯️', keywords: '独处、内省、寻找答案' },
  { id: 10, name: '命运之轮', emoji: '☸️', keywords: '转变、循环、命运、机遇' },
  { id: 11, name: '正义',     emoji: '⚖️', keywords: '公平、真相、因果、平衡' },
  { id: 12, name: '倒吊人',   emoji: '🙃', keywords: '暂停、牺牲、换角度、等待' },
  { id: 13, name: '死神',     emoji: '🍂', keywords: '转变、结束与开始、蜕变' },
  { id: 14, name: '节制',     emoji: '🌊', keywords: '平衡、耐心、融合、疗愈' },
  { id: 15, name: '恶魔',     emoji: '🔗', keywords: '束缚、执着、物质欲望、依赖' },
  { id: 16, name: '高塔',     emoji: '⚡', keywords: '突变、颠覆、释放、觉醒' },
  { id: 17, name: '星星',     emoji: '⭐', keywords: '希望、平静、梦想、疗愈' },
  { id: 18, name: '月亮',     emoji: '🌕', keywords: '幻觉、焦虑、直觉、潜意识' },
  { id: 19, name: '太阳',     emoji: '☀️', keywords: '喜悦、成功、活力、明朗' },
  { id: 20, name: '审判',     emoji: '🔔', keywords: '觉醒、回顾、新生、召唤' },
  { id: 21, name: '世界',     emoji: '🌍', keywords: '圆满、完成、整合、成就' },
]

const LENORMAND = [
  { id: 1,  name: '骑士',   emoji: '🏇', keywords: '消息、快速到来、访客' },
  { id: 2,  name: '三叶草', emoji: '🍀', keywords: '小运气、机会、短暂喜悦' },
  { id: 3,  name: '船',     emoji: '⛵', keywords: '旅行、远方、冒险、愿望' },
  { id: 4,  name: '房子',   emoji: '🏠', keywords: '家、安全感、舒适、归属' },
  { id: 5,  name: '树',     emoji: '🌳', keywords: '健康、成长、根基、生命力' },
  { id: 6,  name: '云朵',   emoji: '☁️', keywords: '不确定、混乱、疑虑' },
  { id: 7,  name: '蛇',     emoji: '🐍', keywords: '诱惑、复杂、嫉妒、智慧' },
  { id: 8,  name: '棺材',   emoji: '⬛', keywords: '结束、变化、低潮、休眠' },
  { id: 9,  name: '花束',   emoji: '💐', keywords: '礼物、惊喜、优雅、感谢' },
  { id: 10, name: '镰刀',   emoji: '⚔️', keywords: '突然、分离、决断、收割' },
  { id: 11, name: '鞭子',   emoji: '💥', keywords: '争执、重复、纪律、冲突' },
  { id: 12, name: '鸟',     emoji: '🐦', keywords: '对话、焦虑、流言、沟通' },
  { id: 13, name: '孩童',   emoji: '👶', keywords: '新事物、天真、开始、小事' },
  { id: 14, name: '狐狸',   emoji: '🦊', keywords: '谨慎、技巧、自我保护、聪明' },
  { id: 15, name: '熊',     emoji: '🐻', keywords: '力量、保护、权威、领导' },
  { id: 16, name: '星星',   emoji: '⭐', keywords: '希望、指引、梦想、好运' },
  { id: 17, name: '鹳鸟',   emoji: '🦢', keywords: '变化、迁移、新生、期待' },
  { id: 18, name: '狗',     emoji: '🐕', keywords: '忠诚、友谊、信任、陪伴' },
  { id: 19, name: '塔',     emoji: '🗼', keywords: '孤独、权威机构、自我、界限' },
  { id: 20, name: '花园',   emoji: '🌿', keywords: '社交、公共场合、聚会、展示' },
  { id: 21, name: '山脉',   emoji: '⛰️', keywords: '障碍、挑战、延迟、阻力' },
  { id: 22, name: '十字路', emoji: '🛤️', keywords: '选择、岔路、决定、方向' },
  { id: 23, name: '老鼠',   emoji: '🐭', keywords: '损耗、焦虑、偷偷流失、压力' },
  { id: 24, name: '心',     emoji: '❤️', keywords: '爱、情感、感受、温柔' },
  { id: 25, name: '戒指',   emoji: '💍', keywords: '承诺、约定、循环、合同' },
  { id: 26, name: '书',     emoji: '📖', keywords: '秘密、知识、学习、隐藏' },
  { id: 27, name: '信',     emoji: '✉️', keywords: '文件、消息、书写、通知' },
  { id: 28, name: '男人',   emoji: '👤', keywords: '重要男性、自己（女性来访者）' },
  { id: 29, name: '女人',   emoji: '👤', keywords: '重要女性、自己（男性来访者）' },
  { id: 30, name: '百合',   emoji: '🌷', keywords: '纯洁、和谐、满足、成熟' },
  { id: 31, name: '太阳',   emoji: '☀️', keywords: '成功、喜悦、活力、明朗' },
  { id: 32, name: '月亮',   emoji: '🌙', keywords: '感性、荣誉、直觉、情绪' },
  { id: 33, name: '钥匙',   emoji: '🗝️', keywords: '开启、成功、答案、必然' },
  { id: 34, name: '鱼',     emoji: '🐟', keywords: '财富、流动、丰盛、商业' },
  { id: 35, name: '锚',     emoji: '⚓', keywords: '稳定、坚持、目标、安全' },
  { id: 36, name: '十字架', emoji: '✝️', keywords: '重担、命运、信仰、考验' },
]

export function drawCards(type, count) {
  const pool = type === 'tarot' ? [...TAROT_MAJOR] : [...LENORMAND]
  const result = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const card = { ...pool.splice(idx, 1)[0] }
    card.reversed = type === 'tarot' ? Math.random() < 0.5 : false
    result.push(card)
  }
  return result
}
