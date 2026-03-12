import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'pet-fortune-secret-change-in-prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未登录' })
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Token 无效或已过期' })
  req.user = payload
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) return res.status(403).json({ error: '权限不足' })
      next()
    })
  }
}
