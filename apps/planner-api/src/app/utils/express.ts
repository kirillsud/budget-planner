import { RequestHandler } from 'express';

export function catchAsync(func: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await func(req, res, next);
    } catch (e) {
      next(e);
    }
  };
}