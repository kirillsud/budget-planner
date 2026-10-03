import { createContext, useContext } from 'react'

const ru = {
  'app.title': 'Планировщик бюджета',
  'login.title': 'Планировщик бюджета',
  'login.subtitle': 'Прогноз баланса по дням: сколько останется до зарплаты и сколько ещё можно потратить.',
  'login.email': 'Email',
  'login.send': 'Прислать ссылку для входа',
  'login.sent': 'Письмо отправлено на {email}. Откройте ссылку из него на этом устройстве.',
  'login.google': 'Войти через Google',
  'login.or': 'или',
  'login.error': 'Не получилось: {message}',
  'login.password': 'Пароль',
  'login.signIn': 'Войти',
  'login.usePassword': 'Войти с паролем',
  'login.useLink': 'Войти по ссылке из письма',
  'login.demoTitle': 'Хотите сначала посмотреть?',
  'login.demoHint': 'Демо-аккаунт с примером бюджета. Можно всё трогать: данные сбрасываются каждую ночь.',
  'login.demo': 'Открыть демо',
  'demo.banner': 'Это демо-аккаунт. Изменения исчезнут ночью.',
  'demo.exit': 'Выйти из демо',
  'home.balanceNow': 'Баланс сейчас',
  'home.updated': 'Обновлён {ago} · сверить',
  'home.lowestUntilIncome': 'Минимум до дохода · {date}',
  'home.lowestInWindow': 'Минимум за период · {date}',
  'home.headroom': 'Можно потратить ещё {amount} и не опуститься ниже {critical}',
  'home.belowCritical': 'Ниже критичного уровня {critical} на {amount}',
  'home.dailyIncluded': 'повседневные {amount} в день учтены',
  'home.overdue': 'Записи в прошлом ждут решения',
  'home.empty': 'Записей пока нет. Добавьте ближайшую зарплату и обязательные платежи, и здесь появится прогноз.',
  'home.lowestRow': 'Самая низкая точка',
  'home.lowestRowHint': 'только повседневные траты',
  'home.final': 'Итого на {date}',
  'home.after': 'остаток {amount}',
  'home.add': 'Запись',
  'home.settings': 'Настройки',
  'home.today': 'сегодня',
  'record.newExpense': 'Новый расход',
  'record.newIncome': 'Новый доход',
  'record.edit': 'Запись',
  'record.expense': 'Расход',
  'record.income': 'Доход',
  'record.amount': 'Сумма',
  'record.title': 'Что это',
  'record.when': 'Когда',
  'record.from': 'Не раньше',
  'record.to': 'Не позже',
  'record.period': 'Период',
  'record.singleDay': 'Один день',
  'record.today': 'Сегодня',
  'record.tomorrow': 'Завтра',
  'record.nextIncome': 'В день дохода',
  'record.save': 'Сохранить',
  'record.add': 'Добавить',
  'record.delete': 'Удалить',
  'record.deleteConfirm': 'Удалить запись «{title}»?',
  'record.markDone': 'Отметить выполненной',
  'record.markUndone': 'Снять отметку',
  'record.copyNextMonth': 'Копия на +1 месяц',
  'record.repeatMonthly': 'Повторять каждый месяц',
  'record.repeatMonthlyHint': 'Записи на год вперёд появятся сами, каждый месяц можно поправить отдельно',
  'record.repeatTooLong': 'Повторять можно записи с периодом до 28 дней',
  'record.applyFollowing': 'Изменить и следующие месяцы',
  'record.applyFollowingHint': 'Иначе изменится только этот месяц',
  'record.stopRepeat': 'Остановить повтор',
  'record.stopConfirm': 'Остановить повтор «{title}»? Этот и следующие невыполненные месяцы удалятся.',
  'record.deleteThisMonth': 'Удалить месяц',
  'record.monthly': 'каждый месяц',
  'record.completed': 'выполнено',
  'record.anyDay': 'в любой день {from} – {to}',
  'record.impactBelow': 'Минимум до дохода станет {amount}, это ниже критичного уровня {critical}.',
  'record.impactWarning': 'Минимум до дохода станет {amount}, это ниже уровня предупреждения {warning}.',
  'record.impactOk': 'Минимум до дохода станет {amount}.',
  'record.errorTitle': 'Введите описание',
  'record.errorAmount': 'Введите сумму',
  'record.errorPeriod': 'Дата «не позже» раньше даты «не раньше»',
  'record.close': 'Закрыть',
  'overdue.title': 'Записи в прошлом',
  'overdue.subtitle': 'Срок этих записей прошёл. Отметьте, что случилось, чтобы прогноз был честным.',
  'overdue.empty': 'Всё разобрано.',
  'overdue.paid': 'Оплачено',
  'overdue.received': 'Получено',
  'overdue.move': 'Перенести',
  'overdue.cancel': 'Отменить',
  'overdue.until': 'до {date}',
  'settings.title': 'Настройки',
  'settings.balance': 'Текущий баланс',
  'settings.balanceHint': 'Сколько сейчас на счетах. Обновляйте, когда сверяетесь с банком.',
  'settings.daily': 'Повседневные расходы в день',
  'settings.dailyHint': 'Еда, проезд и прочие мелочи, которые не хочется записывать по отдельности.',
  'settings.warning': 'Уровень предупреждения',
  'settings.critical': 'Критичный уровень',
  'settings.scale': 'Горизонт прогноза, месяцев',
  'settings.currency': 'Валюта',
  'settings.language': 'Язык',
  'settings.saved': 'Сохранено',
  'settings.signOut': 'Выйти',
  'settings.password': 'Пароль для входа',
  'settings.passwordHint': 'Чтобы входить с паролем, а не ждать письмо. Минимум 8 символов.',
  'settings.passwordShort': 'Минимум 8 символов',
  'settings.passwordSave': 'Сохранить пароль',
  'settings.passwordSaved': 'Пароль сохранён. Теперь можно входить через «Войти с паролем».',
  'common.back': 'Назад',
  'common.loading': 'Загрузка…',
  'common.error': 'Что-то пошло не так: {message}',
  'common.retry': 'Повторить',
  'ago.justNow': 'только что',
  'ago.minutes': '{n} мин назад',
  'ago.hours': '{n} ч назад',
  'ago.days': '{n} дн назад',
} as const

export type MessageKey = keyof typeof ru

const en: Record<MessageKey, string> = {
  'app.title': 'Budget planner',
  'login.title': 'Budget planner',
  'login.subtitle': 'A day-by-day balance forecast: what is left until payday and how much more you can spend.',
  'login.email': 'Email',
  'login.send': 'Email me a sign-in link',
  'login.sent': 'We sent an email to {email}. Open the link on this device.',
  'login.google': 'Sign in with Google',
  'login.or': 'or',
  'login.error': 'Failed: {message}',
  'login.password': 'Password',
  'login.signIn': 'Sign in',
  'login.usePassword': 'Sign in with a password',
  'login.useLink': 'Sign in with an email link',
  'login.demoTitle': 'Want to look around first?',
  'login.demoHint': 'A demo account with a sample budget. Change anything you like: it resets every night.',
  'login.demo': 'Open the demo',
  'demo.banner': 'This is a demo account. Changes disappear overnight.',
  'demo.exit': 'Leave demo',
  'home.balanceNow': 'Balance now',
  'home.updated': 'Updated {ago} · reconcile',
  'home.lowestUntilIncome': 'Lowest until income · {date}',
  'home.lowestInWindow': 'Lowest in the period · {date}',
  'home.headroom': 'You can spend {amount} more and stay above {critical}',
  'home.belowCritical': 'Below the critical level {critical} by {amount}',
  'home.dailyIncluded': 'daily spending of {amount} included',
  'home.overdue': 'Past records need a decision',
  'home.empty': 'No records yet. Add your next salary and fixed payments to see the forecast.',
  'home.lowestRow': 'Lowest point',
  'home.lowestRowHint': 'daily spending only',
  'home.final': 'Total on {date}',
  'home.after': 'left {amount}',
  'home.add': 'Record',
  'home.settings': 'Settings',
  'home.today': 'today',
  'record.newExpense': 'New expense',
  'record.newIncome': 'New income',
  'record.edit': 'Record',
  'record.expense': 'Expense',
  'record.income': 'Income',
  'record.amount': 'Amount',
  'record.title': 'What is it',
  'record.when': 'When',
  'record.from': 'Not earlier than',
  'record.to': 'Not later than',
  'record.period': 'Period',
  'record.singleDay': 'One day',
  'record.today': 'Today',
  'record.tomorrow': 'Tomorrow',
  'record.nextIncome': 'On income day',
  'record.save': 'Save',
  'record.add': 'Add',
  'record.delete': 'Delete',
  'record.deleteConfirm': 'Delete "{title}"?',
  'record.markDone': 'Mark as done',
  'record.markUndone': 'Mark as not done',
  'record.copyNextMonth': 'Copy to +1 month',
  'record.repeatMonthly': 'Repeat every month',
  'record.repeatMonthlyHint': 'Records for the next year appear automatically; each month can be edited on its own',
  'record.repeatTooLong': 'Only records with a period of up to 28 days can repeat',
  'record.applyFollowing': 'Also change later months',
  'record.applyFollowingHint': 'Otherwise only this month changes',
  'record.stopRepeat': 'Stop repeating',
  'record.stopConfirm': 'Stop repeating "{title}"? This and later months that are not done will be removed.',
  'record.deleteThisMonth': 'Delete month',
  'record.monthly': 'every month',
  'record.completed': 'done',
  'record.anyDay': 'any day {from} – {to}',
  'record.impactBelow': 'The lowest balance until income becomes {amount}, below the critical level {critical}.',
  'record.impactWarning': 'The lowest balance until income becomes {amount}, below the warning level {warning}.',
  'record.impactOk': 'The lowest balance until income becomes {amount}.',
  'record.errorTitle': 'Enter a description',
  'record.errorAmount': 'Enter an amount',
  'record.errorPeriod': '"Not later than" is before "not earlier than"',
  'record.close': 'Close',
  'overdue.title': 'Past records',
  'overdue.subtitle': 'These records are past due. Mark what happened to keep the forecast honest.',
  'overdue.empty': 'All sorted.',
  'overdue.paid': 'Paid',
  'overdue.received': 'Received',
  'overdue.move': 'Move',
  'overdue.cancel': 'Cancel',
  'overdue.until': 'until {date}',
  'settings.title': 'Settings',
  'settings.balance': 'Current balance',
  'settings.balanceHint': 'What is in your accounts now. Update it when you check your bank.',
  'settings.daily': 'Daily spending',
  'settings.dailyHint': 'Food, transport and other small things you do not want to record one by one.',
  'settings.warning': 'Warning level',
  'settings.critical': 'Critical level',
  'settings.scale': 'Forecast horizon, months',
  'settings.currency': 'Currency',
  'settings.language': 'Language',
  'settings.saved': 'Saved',
  'settings.signOut': 'Sign out',
  'settings.password': 'Sign-in password',
  'settings.passwordHint': 'Sign in with a password instead of waiting for an email. At least 8 characters.',
  'settings.passwordShort': 'At least 8 characters',
  'settings.passwordSave': 'Save password',
  'settings.passwordSaved': 'Password saved. You can now use "Sign in with a password".',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong: {message}',
  'common.retry': 'Retry',
  'ago.justNow': 'just now',
  'ago.minutes': '{n} min ago',
  'ago.hours': '{n} h ago',
  'ago.days': '{n} days ago',
}

export type Locale = 'ru' | 'en'
const dictionaries: Record<Locale, Record<MessageKey, string>> = { ru, en }

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

export function createTranslator(locale: Locale): Translate {
  const dict = dictionaries[locale]
  return (key, params) => {
    let text = dict[key] ?? ru[key]
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v))
    return text
  }
}

const LOCALE_KEY = 'budget-planner.locale'

/** Language before sign-in: the visitor's last choice, else the browser language. */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    // storage unavailable (private mode): fall back to the browser language
  }
  return browserLocale()
}

/**
 * Picks the first supported language from the browser's preference list
 * (e.g. ["nl-NL", "ru", "en"] -> "ru"). Unsupported-only lists fall back to English.
 */
export function browserLocale(preferred: readonly string[] = browserLanguages()): Locale {
  for (const tag of preferred) {
    const lang = tag.toLowerCase().split('-')[0]
    if (lang === 'ru' || lang === 'en') return lang
  }
  return 'en'
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

export function rememberLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // not critical
  }
}

export interface I18n {
  locale: Locale
  t: Translate
}

export const I18nContext = createContext<I18n>({ locale: 'ru', t: createTranslator('ru') })

export function useI18n(): I18n {
  return useContext(I18nContext)
}
