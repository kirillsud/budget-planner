import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { auth, AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/express';
import { legacyApi } from '../utils/legacy-api';
import { generateJwt } from '../utils/jwt';

const router = Router();

router.post('/api/auth/login',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required(),
      remember: Joi.boolean().default(false),
    }),
  }),
  catchAsync(async (req, res) => {
    const token = await legacyApi.login(req.body.email, req.body.password, req.body.remember);
    const jwt = generateJwt(token);

    res.send({ jwt });
  })
);

router.get('/api/auth/logout', auth, catchAsync(async (req: AuthRequest, res) => {
  await legacyApi.logout(req.auth);
  res.send();
}));

export default router;
