/**
 * 占卜师角色配置（与 server prompts 的 id 一致）
 */
export const CHARACTERS = [
  {
    id: 'liliana',
    name: '莉莉安娜',
    nameEn: 'Lilliana',
    tagline: '心理学硕士 · 塔罗与雷诺曼',
    shortDesc: '擅长捕捉宠物的情绪纹理与依恋波动，用塔罗与雷诺曼把那些难以言说的信号翻译成可理解的回应。',
    tags: ['情绪感应', '依恋关系', '塔罗解读', '雷诺曼', '行为洞察'],
    emoji: '🔮',
    theme: {
      primary: 'mystic',
      secondary: 'verdant',
      cardClass: 'bg-mystic-500 text-white shadow-lg shadow-mystic-900/15',
      chipClass: 'border border-white/20 bg-white/14 text-white',
      ringClass: '',
      buttonClass: 'bg-mystic-600 text-white shadow-lg shadow-mystic-700/20 hover:bg-mystic-700',
    },
    opening: `我是莉莉安娜。
在你开口前，我通常已经感到一些东西。不是语言本身，而是它携带的情绪密度、依恋方向，和那些还没被说出口的拉扯。
我研究动物情绪、关系张力，也使用塔罗与雷诺曼作为语言化的工具。它们不是答案本身，而是把感应落到可读结构里的路径。
现在，把它的名字在心里轻轻唤三次。
然后告诉我：它是什么动物、多大了，你今天最想问的是什么。`,
  },
  {
    id: 'yiqing',
    name: '易清',
    nameEn: 'Yiqing',
    tagline: '气场与因果线索 · 塔罗与东方卜感',
    shortDesc: '更关注整体气场、环境牵引与关系里的因果线索，适合承接即将加入的东玄六爻与东方占感体系。',
    tags: ['气场感应', '因果线索', '东方卜感', '节奏边界'],
    emoji: '🌿',
    theme: {
      primary: 'verdant',
      secondary: 'mystic',
      cardClass: 'bg-verdant-500 text-white shadow-lg shadow-verdant-900/15',
      chipClass: 'border border-white/20 bg-white/14 text-white',
      ringClass: '',
      buttonClass: 'bg-verdant-600 text-white shadow-lg shadow-verdant-800/20 hover:bg-verdant-700',
    },
    opening: `我是易清。
我更习惯从整体气场与因果线索里看一只动物的状态。你、它、环境与时间，常常不是彼此分开的，而是在同一条线上缓慢拉扯、变形与回流。
六爻会接入这条路径，让那些更东方、更纵深的感应结构落下来。
现在，把它的名字在心里轻轻唤三次。
然后告诉我：它是什么动物，你们相处多久了，此刻你最想确认的是什么。`,
  },
]

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]
}

export const DEFAULT_CHARACTER_ID = 'liliana'
