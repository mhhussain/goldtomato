import type { Request, Response } from 'express';
import { ALLOWED_ORIGINS } from './config';

/**
 * Manual CORS: we need exact control over the preflight response alongside a
 * streaming body, so no `cors` package (see CLAUDE.md).
 *
 * Returns true if the request was fully handled (preflight or rejected origin)
 * and the caller should stop.
 */
export function handleCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return true;
  }

  return false;
}
