# Galaxor - Telegram Mini App

MVP-проект на `Vite + React 18 + TypeScript` с интеграцией:

- `@tma.js/sdk` для Telegram Mini Apps
- `@tonconnect/ui-react` для подключения TON-кошелька
- `Tailwind CSS` через `postcss`

## Быстрый старт

1. Скопируй переменные окружения:
   - `copy .env.example .env` (Windows)
2. Проверь, что в `.env` указан `TON_CONNECT_MANIFEST_URL`.
3. Установи зависимости:
   - `npm install`
4. Запусти локальный сервер:
   - `npm run dev`

## Скрипты

- `npm run dev` - запуск в режиме разработки
- `npm run build` - production-сборка
- `npm run preview` - локальный просмотр production-сборки

## TON Connect Manifest

В `.env.example` уже задан placeholder:

```env
TON_CONNECT_MANIFEST_URL=https://galaxor.ru/tonconnect-manifest.json
```

Перед релизом нужно создать и разместить по этому URL файл `tonconnect-manifest.json`.
Минимальный пример:

```json
{
  "url": "https://galaxor.ru",
  "name": "Galaxor",
  "iconUrl": "https://galaxor.ru/icon-192.png",
  "termsOfUseUrl": "https://galaxor.ru/terms",
  "privacyPolicyUrl": "https://galaxor.ru/privacy"
}
```

## Деплой на Vercel

1. Создай репозиторий и загрузи проект.
2. В Vercel нажми **Add New -> Project** и выбери репозиторий.
3. Build settings:
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. В Environment Variables добавь:
   - `TON_CONNECT_MANIFEST_URL=https://galaxor.ru/tonconnect-manifest.json`
5. Нажми **Deploy**.

## Привязка Mini App в BotFather

1. Открой `@BotFather`.
2. Выполни путь:
   - `/mybots -> Galaxor_bot -> Bot Settings`
3. Настрой один из вариантов:
   - `Menu Button` (кнопка меню)
   - или `Main Mini App` (основное мини-приложение)
4. Укажи URL: `https://galaxor.ru`
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
