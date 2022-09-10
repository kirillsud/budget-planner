import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { catchAsync } from '@planner/common-api';
import { guard } from './guard';
import { legacyApi } from './legacy-api';
import { generateJwt } from './jwt';

export const router = Router();

router.post(
  '/login',
  celebrate(
    {
      [Segments.BODY]: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().min(4),
        remember: Joi.boolean().default(false),
      }),
    },
    {
      abortEarly: false,
    }
  ),
  catchAsync(async (req, res) => {
    const token = await legacyApi.login(
      req.body.email,
      req.body.password,
      req.body.remember
    );
    const jwt = generateJwt(token);

    res.send({ jwt });
  })
);

router.get(
  '/logout',
  guard,
  catchAsync(async (_req, res) => {
    await legacyApi.logout(res.locals['auth']);
    res.send();
  })
);

router.get(
  '/refresh',
  guard,
  catchAsync(async (_req, res) => {
    const token = await legacyApi.refresh(res.locals['auth']);
    const jwt = generateJwt(token);

    res.send({ jwt });
  })
);
