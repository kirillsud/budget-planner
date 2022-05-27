import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

function localize() {
  i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      // the translations
      // (tip move them in a JSON file and import them,
      // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
      resources: {
        en: {
          translation: {
            "Budget planner": "Budget Planner",
            "Not found": "404 Not found :(",
            "Logout": "Logout",
            "Create income": "Create Income",
            "Create expense": "Create Expense",
            "Edit income": "Edit Income",
            "Edit expense": "Edit Expense",
            "Budget form": {
              "Title": "Title",
              "Amount": "Amount",
              "Currency": "Currency",
              "Date": "Date",
              "Create": "Create",
              "Save": "Save",
              "Delete": "Delete",
            },
            "Login form": {
              "Email": "Email",
              "Password": "Password",
              "Submit": "Login",
            },
          }
        },
        ru: {
          translation: {
            "Budget planner": "Планирование бюджета",
            "Not found": "404 Страница не найдена :(",
            "Logout": "Выйти",
            "Create income": "Добавление дохода",
            "Create expense": "Добавление расхода",
            "Edit income": "Редактирование дохода",
            "Edit expense": "Редактирование расхода",
            "Budget form": {
              "Title": "Описание",
              "Amount": "Сумма",
              "Currency": "Валюта",
              "Date": "Дата",
              "Create": "Создать",
              "Save": " Сохранить",
              "Delete": "Удалить",
            },
            "Login form": {
              "Email": "Электронная почта",
              "Password": "Пароль",
              "Submit": "Войти",
            },
          }
        }
      },
      // lng: "en", // if you're using a language detector, do not define the lng option
      fallbackLng: "ru",

      interpolation: {
        escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      }
    });
}

export default localize;
