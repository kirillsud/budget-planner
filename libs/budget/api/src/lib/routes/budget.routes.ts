import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { BudgetRecord } from '@planner/budget-core';
import { catchAsync } from '@planner/common-api';
import { legacyApi } from '../utils/legacy-api';

export const router = Router();

router.get(
  '/',
  catchAsync(async (_req, res) => {
    const records = await legacyApi.getAll(res.locals['auth']);
    res.send(records);
  })
);

router.post(
  '/:id',
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
  catchAsync(async (req, res) => {
    const id = parseInt(req.params['id']);
    const change: BudgetRecord = {
      ...req.body,
      id,
    };

    const record = await legacyApi.updateOrCreate(res.locals['auth'], change);
    res.send(record);
  })
);

router.delete(
  '/:id',
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
  catchAsync(async (req, res) => {
    const id = parseInt(req.params['id']);
    const type: BudgetRecord['type'] = req.body.type;

    await legacyApi.remove(res.locals['auth'], id, type);
    res.status(204).send();
  })
);

router.put(
  '/',
  celebrate(
    {
      [Segments.BODY]: Joi.object().keys({
        type: Joi.string().valid('income', 'expense').required(),
        title: Joi.string().required(),
        amount: Joi.number().greater(0).required(),
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
  catchAsync(async (req, res) => {
    const data: Omit<BudgetRecord, 'id'> = {
      ...req.body,
    };

    const record = await legacyApi.updateOrCreate(res.locals['auth'], data);
    res.status(201).send(record);
  })
);
