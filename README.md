# Repair Story Pro

Полнофункциональное приложение для сервисного центра **ТехноДимак** — управление заявками на ремонт, отслеживание статусов, назначение техников, экспорт отчётов.

## Стек технологий

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express 5 + TypeScript
- **ORM**: Drizzle ORM + PostgreSQL
- **Realtime**: Socket.io
- **Auth**: JWT + bcrypt
- **API Contract**: OpenAPI 3.1 + Orval (кодогенерация)
- **Экспорт**: PDFKit (PDF), CSV

## Структура проекта

```
├── artifacts/
│   ├── api-server/          # Express API сервер
│   │   ├── src/
│   │   │   ├── routes/      # auth, bookings, calendar, export, users
│   │   │   ├── middlewares/  # auth middleware (JWT)
│   │   │   ├── lib/         # auth utils, booking code generator, calendar slots
│   │   │   └── services/    # Socket.io
│   │   └── package.json
│   └── repair-story-pro/    # React frontend (Vite)
│       ├── src/
│       │   ├── pages/       # home, auth, dashboard, admin, technician, track, troubleshooter
│       │   ├── components/  # Navbar, StatusBadge, PageTransition
│       │   └── lib/         # auth context, utils
│       └── public/data/tree.json  # Decision tree для troubleshooter
├── lib/
│   ├── api-spec/            # OpenAPI спецификация
│   ├── api-client-react/    # Сгенерированные React Query хуки
│   ├── api-zod/             # Сгенерированные Zod схемы
│   └── db/                  # Drizzle ORM схема
├── scripts/
│   └── src/seed.ts          # Seed скрипт
└── README.md
```

## Установка и запуск

```bash
# Установка зависимостей
pnpm install

# Создание тестовых пользователей
pnpm --filter @workspace/scripts run seed

# Запуск в режиме разработки (frontend + backend)
# Frontend и backend запускаются автоматически через Replit workflows
```

## Тестовые пользователи

| Email | Пароль | Роль |
|-------|--------|------|
| admin@example.com | Passw0rd! | admin |
| tech1@example.com | Passw0rd! | technician |
| client1@example.com | Passw0rd! | client |

## API Endpoints

| Метод | Путь | Описание | Доступ |
|-------|------|----------|--------|
| POST | /api/auth/register | Регистрация | Публичный |
| POST | /api/auth/login | Вход | Публичный |
| GET | /api/auth/me | Текущий пользователь | Auth |
| GET | /api/bookings | Список заявок | Admin/Tech |
| POST | /api/bookings | Создать заявку | Auth |
| GET | /api/bookings/my | Мои заявки | Auth |
| GET | /api/bookings/track/:code | Публичный трекинг | Публичный |
| PATCH | /api/bookings/:id/status | Изменить статус | Admin/Tech |
| PATCH | /api/bookings/:id/assign | Назначить техника | Admin |
| GET | /api/calendar/slots?date= | Слоты календаря | Публичный |
| GET | /api/export/:id/pdf | Экспорт PDF | Auth |
| GET | /api/export/csv | Экспорт CSV | Admin |
| GET | /api/users/technicians | Список техников | Admin |

## Workflow статусов

```
new → accepted → diagnosing → repairing → ready → closed
```

При каждой смене статуса:
1. Создаётся запись в `repair_logs`
2. Socket.io отправляет событие `booking:update`

## Что показывать на защите

### Сценарий 1: Регистрация и создание заявки
1. Открыть главную страницу
2. Нажать "Регистрация" → заполнить форму
3. После входа перейти на "Записаться на ремонт"
4. Заполнить форму: устройство, проблема, выбрать время
5. Увидеть код заявки R-XXXXX

### Сценарий 2: Публичный трекинг
1. Открыть страницу "Трекинг"
2. Ввести код R-XXXXX
3. Увидеть текущий статус и таймлайн

### Сценарий 3: Админ-панель
1. Войти как admin@example.com
2. Увидеть таблицу всех заявок
3. Назначить техника на заявку
4. Изменить статус → увидеть лог
5. Экспортировать CSV / PDF

### Сценарий 4: Техник
1. Войти как tech1@example.com
2. Увидеть назначенные заявки
3. Изменить статус на "diagnosing" → "repairing" → "ready"

### Сценарий 5: Realtime обновления
1. Открыть панель клиента в одном окне
2. Открыть панель админа в другом окне
3. Изменить статус в админ-панели → увидеть обновление у клиента

### Сценарий 6: Troubleshooter
1. Открыть "Частые проблемы"
2. Пройти по дереву решений
3. Получить рекомендацию

## Demo-скрипт (API тестирование)

```bash
# 1. Seed (создание тестовых пользователей)
pnpm --filter @workspace/scripts run seed

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@example.com","password":"Passw0rd!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

# 3. Создать заявку
curl -s -X POST http://localhost:80/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"device":"iPhone 14","issue":"Не заряжается"}'

# 4. Трекинг по коду
curl -s http://localhost:80/api/bookings/track/R-00001

# 5. Изменить статус (как admin)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Passw0rd!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -X PATCH http://localhost:80/api/bookings/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"to":"accepted","note":"Принято в работу"}'
```

## Деплой на Replit

Приложение готово к деплою через Replit. Нажмите кнопку "Deploy" / "Publish" в интерфейсе Replit.

## Checklist приёмки

- [x] `pnpm install` в корне
- [x] `pnpm --filter @workspace/scripts run seed` создаёт тестовых пользователей
- [x] Логин admin → назначить техника → изменить статус → увидеть realtime у клиента
- [x] Ввести R-XXXXX в публичный трекер → видно timeline
- [x] Экспорт PDF работает
- [x] REST API полностью функционален
- [x] Socket.io для realtime обновлений
- [x] Troubleshooter с деревом решений
- [x] Календарь слотов (30 мин, 9:00-18:00)
