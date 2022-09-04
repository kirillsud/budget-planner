import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

function localize() {
  i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .use(LanguageDetector)
    .init({
      // the translations
      // (tip move them in a JSON file and import them,
      // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
      resources: {
        en: {
          translation: {
            'Budget planner': 'Budget Planner',
            'Application loading': 'Loading application...',
            'Not found': '404 Not found 😭',
            'Sign in': 'Sign in',
            'Logout': 'Logout',
            'Locale': 'Locale',
            'Loading': 'Loading...',
            'Create income': 'Create Income',
            'Create expense': 'Create Expense',
            'Edit income': 'Edit Income',
            'Edit expense': 'Edit Expense',
            'Budget form': {
              Title: 'Title',
              Amount: 'Amount',
              Currency: 'Currency',
              'Date.from': 'Date',
              Create: 'Create',
              Save: 'Save',
              Delete: 'Delete',
            },
            'Login form': {
              Email: 'Email',
              Password: 'Password',
              'Remember me': 'Remember me',
              Submit: 'Sing In',
            },
            'Errors': {
              'Common': {
                'any.required': '{{label}} must not be empty',
                'string.empty': '{{label}} must not be empty',
                'number.empty': '{{label}} must not be empty',
                'number.min': '{{label}} must be greater than or equal to {{limit}}',
                'number.greater': '{{label}} must be greater than {{limit}}',
                'date.empty': '{{label}} must not be empty',
                'date.min': '{{label}} must be greater than or equal to {{limit}}',
                'string.email': '{{label}} has invalid format',
                'string.min': '{{label}} must be at least {{limit}} characters long',
                'auth.wrong-credentials': 'Wrong email or password',
                'unknown': 'Unexpected error 😭',
              }
            },
          },
        },
        ru: {
          translation: {
            'Budget planner': 'Планирование бюджета',
            'Application loading': 'Загрузка приложения...',
            'Not found': '404 Страница не найдена 😭',
            'Sign in': 'Авторизация',
            'Logout': 'Выйти',
            'Locale': 'Язык',
            'Loading': 'Выполняет загрузка данных...',
            'Create income': 'Добавление дохода',
            'Create expense': 'Добавление расхода',
            'Edit income': 'Редактирование дохода',
            'Edit expense': 'Редактирование расхода',
            'Forgot password?': 'Забыли пароль?',
            'Don\'t have an account? Sign Up': 'Нет аккаунта? Зарегистрируйтесь',
            'Budget form': {
              Title: 'Описание',
              Amount: 'Сумма',
              Currency: 'Валюта',
              'Date.from': 'Дата',
              Create: 'Создать',
              Save: ' Сохранить',
              Delete: 'Удалить',
            },
            'Login form': {
              Email: 'Электронная почта',
              Password: 'Пароль',
              'Remember me': 'Запомнить меня',
              Submit: 'Войти',
            },
            'Errors': {
              'Messages': {
                'Budget form.Title': {
                  'string.empty': '{{label}} должно быть указано',
                },
                'Login form.Password': {
                  'string.empty': '{{label}} должен быть указан',
                  'string.min': 'Длина пароля должна быть не менее {{limit}} символов',
                },
              },
              'Common': {
                'any.required': '{{label}} должна быть указана',
                'number.empty': '{{label}} должна быть указана',
                'number.min': '{{label}} должна быть не меньше {{limit}}',
                'number.greater': '{{label}} должна быть больше {{limit}}',
                'date.base': '{{label}} указана в неверном формате',
                'date.empty': '{{label}} должна быть указана',
                'date.min': '{{label}} должна быть не меньше {{limit}}',
                'string.empty': '{{label}} должна быть указана',
                'string.email': 'Адрес электронной почты указан в неверном формате',
                'string.min': '{{label}} должен быть не менее {{limit}} символов',
                'auth.wrong-credentials': 'Неверный адрес электронной почты или пароль',
                'unknown': 'Неизвестная ошибка 😭',
              },
            }
          },
        },
      },
      // lng: "en", // if you're using a language detector, do not define the lng option
      // fallbackLng: 'ru',

      interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      },
    });
}

export default localize;
