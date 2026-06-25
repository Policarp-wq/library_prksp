# Электронная библиотека

Курсовая работа: веб-приложение, в котором ведётся каталог книг, а зарегистрированные читатели берут их «на руки» и потом возвращают. Администратор управляет каталогом, обычный пользователь — только своими выдачами.

## Что внутри

Любой посетитель видит каталог: список книг с автором, годом издания и пометкой, выдана ли книга прямо сейчас. По каталогу работает поиск по названию и автору, постранично — по двенадцать карточек.

Зарегистрированный пользователь может взять свободную книгу: создаётся выдача с датой. Пока книга не возвращена, никто другой не сможет её получить, а в каталоге она помечается как недоступная. Свои активные и закрытые выдачи пользователь видит в отдельном разделе, возврат — одной кнопкой.

У каждой книги может быть ссылка-источник — например, на онлайн-версию. Ссылки нормализуются и проверяются: разрешены только `http` и `https`, запрещены `javascript:`, `data:` и адреса на localhost, чтобы через форму редактирования нельзя было подложить вредоносную ссылку.

Администратор управляет каталогом — добавляет, редактирует и удаляет книги. Удалить книгу, которая сейчас на руках у читателя, нельзя — сначала её должны вернуть. При удалении книги, у которой остались только исторические (закрытые) выдачи, эти записи удаляются каскадно.

## Учётные записи

Схема БД накатывается отдельной admin-командой `npm run db:migrate` (или сервисом `migrate` в `docker-compose`). Веб-процесс на старте схему не трогает.

Демонстрационные учётки по умолчанию не создаются. Чтобы засидить их локально, в `.env` нужно выставить:

```
SEED_DEMO_USERS=true
SEED_ADMIN_PASSWORD=<любой пароль для admin>
SEED_USER_PASSWORD=<любой пароль для user>
```

И выполнить `npm run db:seed` (после `db:migrate`). В продакшен-конфигурации `SEED_DEMO_USERS=false`, демо-аккаунтов нет.

Регистрация через UI создаёт только обычного пользователя — сделать второго `admin` через форму нельзя.

## Стек

- Frontend: React 18, TypeScript, Vite, React Router
- Backend: Node.js, Express, TypeScript, `pg`
- База данных: PostgreSQL 15
- Auth: JWT, bcrypt, ролевая модель
- Тесты: Jest, supertest, fast-check (property-based фаззинг)
- Контейнеризация: Docker, Docker Compose
- Reverse proxy: nginx (отдача фронта, проксирование `/api` в бэкенд)

## Структура репозитория

- `src/` — React-клиент.
- `node-postgres/` — Node.js бэкенд.
- `nginx/` — конфигурация reverse-proxy.
- `docker-compose.yml` — локальный запуск со сборкой из исходников.
- `docker-compose.prod.yml` — продакшен-запуск из образов с Docker Hub.

## Запуск

### Локально из исходников

```bash
docker compose up -d --build
```

Открыть http://localhost:8080. API — http://localhost:3000.

Остановить:

```bash
docker compose down
```

### На VPS из образов Docker Hub

```bash
git clone https://github.com/Policarp-wq/library_prksp.git
cd library_prksp
# подготовить .env: DOCKER_USERNAME, IMAGE_TAG, JWT_SECRET
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

HTTPS поднимается отдельно: сертификаты от Let's Encrypt (`certbot certonly --standalone`) кладутся в `./certs/fullchain.pem` и `./certs/privkey.pem`, после чего frontend-контейнер перезапускается.

## Переменные окружения

В `NODE_ENV=production` все обязательные переменные должны быть заданы — иначе бэкенд падает на старте (`requireEnv` в `src/config/env.ts`) или compose не поднимает контейнер (`${VAR:?...}`). Пример значений — `node-postgres/.env.example`.

| Переменная | Назначение | Required в prod |
|---|---|---|
| `NODE_ENV` | `production` / `development` / `test`. | да |
| `PORT` | Порт backend, по умолчанию `3000`. | нет |
| `PGHOST` | Хост Postgres. В docker-compose — `db`. | да |
| `PGPORT` | Порт Postgres, по умолчанию `5432`. | нет |
| `PGUSER`, `PGDATABASE` | Креды и имя БД. | да |
| `PGPASSWORD` | Пароль БД. | да |
| `JWT_SECRET` | Секрет подписи JWT, минимум 32 символа. | да |
| `SEED_DEMO_USERS` | `true`/`false`. Включает сидинг демо-учёток. По умолчанию `false`. | нет |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Пароли демо-учёток. Обязательны при `SEED_DEMO_USERS=true`. | нет |

## Admin-команды

```bash
cd node-postgres
npm run build
npm run db:migrate   # создать/обновить схему
npm run db:seed      # засидить демо-данные (если SEED_DEMO_USERS=true)
```

В `docker-compose.yml`/`docker-compose.prod.yml` миграция выполняется сервисом `migrate` до запуска `backend` (`depends_on: migrate: condition: service_completed_successfully`).

## Health endpoints

- `GET /healthz` — liveness: процесс жив (HTTP 200).
- `GET /readyz` — readiness: процесс держит соединение с БД (HTTP 200, иначе 503). Используется в docker healthcheck сервиса `backend`.

## Graceful shutdown

`SIGTERM`/`SIGINT` закрывают HTTP-сервер и пул `pg` за 10 секунд, после чего процесс выходит. В docker-compose `init: true` гарантирует доставку сигналов до Node-процесса.

## Тесты

```bash
cd node-postgres
npm test
```

## Автор

[Policarp-wq](https://github.com/Policarp-wq)
