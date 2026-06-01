import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'No autorizado'))
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    next(new AppError(401, 'Token inválido o expirado'))
  }
}
