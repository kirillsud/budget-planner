import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { BudgetRecord } from '@planner/budget-domain';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/express';
import { legacyApi } from '../utils/legacy-api';

const router = Router();

router.get(
  '/api/budget',
  catchAsync(async (req: AuthRequest, res) => {
    const records = await legacyApi.getAll(req.auth);
    res.send(records);
  })
);

router.post(
  '/api/budget/:id',
  celebrate(
    {
      [Segments.PARAMS]: Joi.object().keys({
        id: Joi.number().min(1).required(),
      }),
      [Segments.BODY]: Joi.object().keys({
        type: Joi.string().valid('income', 'expense').required(),
        title: Joi.string().required(),
        amount: Joi.number().positive().greater(0).required(),
        date: Joi.object().keys({
          from: Joi.date().required(),
          to: Joi.date().required().min(Joi.ref('from')),
        }),
      }),
    },
    {
      abortEarly: false,
    }
  ),
  catchAsync(async (req: AuthRequest, res) => {
    const id = parseInt(req.params['id']);
    const change: BudgetRecord = {
      ...req.body,
      id,
    };

    const record = await legacyApi.updateOrCreate(req.auth, change);
    res.send(record);
  })
);

router.delete(
  '/api/budget/:id',
  celebrate(
    {
      [Segments.PARAMS]: Joi.object().keys({
        id: Joi.number().min(1).required(),
      }),
      [Segments.BODY]: Joi.object().keys({
        type: Joi.string().valid('income', 'expense').required(),
      }),
    },
    {
      abortEarly: false,
    }
  ),
  catchAsync(async (req: AuthRequest, res) => {
    const id = parseInt(req.params['id']);
    const type: BudgetRecord['type'] = req.body.type;

    await legacyApi.remove(req.auth, id, type);
    res.status(204).send();
  })
);

router.put(
  '/api/budget',
  celebrate(
    {
      [Segments.BODY]: Joi.object().keys({
        type: Joi.string().valid('income', 'expense').required(),
        title: Joi.string().required(),
        amount: Joi.number().min(0).required(),
        date: Joi.object().keys({
          from: Joi.date().required(),
          to: Joi.date().required().min(Joi.ref('from')),
        }),
      }),
    },
    {
      abortEarly: false,
    }
  ),
  catchAsync(async (req: AuthRequest, res) => {
    const data: Omit<BudgetRecord, 'id'> = {
      ...req.body,
    };

    const record = await legacyApi.updateOrCreate(req.auth, data);
    res.status(201).send(record);
  })
);

export default router;
