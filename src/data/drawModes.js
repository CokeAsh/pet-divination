export const DRAW_MODES = {
  direct: {
    id: 'direct',
    needsDraw: false,
    deckType: null,
    drawCount: 0,
  },
  tarot1: {
    id: 'tarot1',
    needsDraw: true,
    deckType: 'tarot',
    drawCount: 1,
  },
  tarot3: {
    id: 'tarot3',
    needsDraw: true,
    deckType: 'tarot',
    drawCount: 3,
  },
  lenormand: {
    id: 'lenormand',
    needsDraw: true,
    deckType: 'lenormand',
    drawCount: 2,
  },
}

export function getDrawMode(modeId) {
  return DRAW_MODES[modeId] || DRAW_MODES.direct
}
