export const LIUYAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

const TRIGRAM_NAMES = {
  '111': '乾',
  '110': '兑',
  '101': '离',
  '100': '震',
  '011': '巽',
  '010': '坎',
  '001': '艮',
  '000': '坤',
}

function createCoin(id) {
  const isYang = Math.random() > 0.5
  return {
    id,
    side: isYang ? 'yang' : 'yin',
  }
}

function buildHexagramName(lines) {
  const binary = lines.map((line) => (line.lineType === 'yang' ? '1' : '0'))
  const lower = binary.slice(0, 3).join('')
  const upper = binary.slice(3, 6).join('')
  return `${TRIGRAM_NAMES[upper] || '未知'}上${TRIGRAM_NAMES[lower] || '未知'}下`
}

function mapCoinsToLine(coins) {
  const yangCount = coins.filter((coin) => coin.side === 'yang').length
  const yinCount = coins.length - yangCount

  if (yangCount === 3) {
    return {
      value: 6,
      lineType: 'yin',
      isMoving: true,
    }
  }

  if (yinCount === 3) {
    return {
      value: 9,
      lineType: 'yang',
      isMoving: true,
    }
  }

  if (yangCount === 2) {
    return {
      value: 7,
      lineType: 'yang',
      isMoving: false,
    }
  }

  return {
    value: 8,
    lineType: 'yin',
    isMoving: false,
  }
}

export function getLinePreviewText(line) {
  return `${LIUYAO_LABELS[line.lineIndex]}：${line.lineType === 'yang' ? '阳' : '阴'}${line.isMoving ? ' · 动爻' : ' · 静爻'}`
}

export function generateLineResult(lineIndex) {
  const coins = Array.from({ length: 3 }, (_, index) => createCoin(index))
  const mapped = mapCoinsToLine(coins)

  return {
    lineIndex,
    label: LIUYAO_LABELS[lineIndex],
    coins,
    ...mapped,
  }
}

export function buildLiuyaoCast(lineResults) {
  const lines = [...lineResults].sort((a, b) => a.lineIndex - b.lineIndex)
  const relatingLines = lines.map((line) =>
    line.isMoving
      ? {
          ...line,
          lineType: line.lineType === 'yang' ? 'yin' : 'yang',
          isMoving: false,
        }
      : line
  )
  const movingLineIndices = lines.filter((line) => line.isMoving).map((line) => line.lineIndex)

  return {
    lines,
    primary: buildHexagramName(lines),
    relating: buildHexagramName(relatingLines),
    movingCount: movingLineIndices.length,
    movingLineIndices,
  }
}
