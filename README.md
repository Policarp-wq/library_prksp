## library_prksp

Клиент-серверное приложение управления библиотечным фондом.

### Стек

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT (role-based access)
- Tests: Jest + fast-check (fuzz)
- Containerization: Docker, Docker Compose

### Структура проекта

- src/: клиентская часть
	- app/: роутинг, layout, store, hooks
	- features/auth/: логика авторизации и хранения сессии
	- pages/: страницы (Home, Auth, Books, Admin)
	- components/: UI-компоненты
	- repositories/: клиентские вызовы API
- node-postgres/: серверная часть
	- server.js: API, auth, валидация, инициализация БД
	- __tests__/validation.fuzz.test.js: фаззинг-тесты
	- Dockerfile: контейнер backend
- nginx/default.conf: проксирование frontend -> backend
- Dockerfile: контейнер frontend
- docker-compose.yml: запуск db + backend + frontend

### Авторизация и роли

- Роли: admin, user
- Регистрация создает только user
- После успешной регистрации пользователь автоматически авторизуется
- Саморегистрация admin запрещена
- Каталогом управляет только администратор: POST/PUT/DELETE /api/books доступны только роли admin
- Защищенные маршруты проверяются по роли
- Для API используется Bearer JWT

### База данных и тестовые данные

При старте backend автоматически:

- создает таблицы users, books и loans
- добавляет пользователей:
	- admin/admin (role: admin)
	- user/user (role: user)
- добавляет стартовые книги в каталог
- добавляет демонстрационные выдачи книг (одна активная и одна возвращенная)

### Выдача книг

API выдачи/возврата:

- POST /api/loans (auth user): body { "bookId": number }, создает выдачу, если книга свободна
- PATCH /api/loans/:id/return (auth user): возврат книги владельцем выдачи или администратором
- GET /api/loans (auth user): admin видит все выдачи, user — только свои
- GET /api/loans?active=true: только активные выдачи

Логика:

- Если на книгу есть активная выдача (returned_at IS NULL), повторная выдача возвращает 409
- В GET /api/books каждая книга содержит поле available (boolean), показывающее доступность
- Книгу нельзя удалить, если на неё есть активная выдача; при удалении книги исторические выдачи удаляются каскадно
- Поиск каталога поддерживает query-параметры q, title, author (case-insensitive)

### Запуск через Docker Compose

Из корня проекта:

1. docker compose up -d --build
2. Открыть frontend: http://localhost:8080
3. Backend API: http://localhost:3000

Остановка:

1. docker compose down

### Продакшн compose (образы из Docker Hub)

Файл: docker-compose.prod.yml (без сборки, только pull image).

Из корня проекта:

1. задать переменные окружения DOCKER_USERNAME, IMAGE_TAG, JWT_SECRET
2. docker compose -f docker-compose.prod.yml pull
3. docker compose -f docker-compose.prod.yml up -d

Let's Encrypt (certbot):

1. DNS A-запись домена должна указывать на VPS (если Cloudflare используется, для выпуска сертификата выставить DNS only на время проверки)
2. На VPS выпустить сертификат:
	- sudo certbot certonly --standalone -d your-domain.com --agree-tos -m you@example.com --non-interactive
3. Положить сертификаты в ./certs:
	- cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/fullchain.pem
	- cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/privkey.pem
4. Перезапустить frontend:
	- docker compose -f docker-compose.prod.yml up -d frontend

Rate limit в nginx:

- POST: не более 5 запросов в минуту на IP
- Остальные методы: не более 60 запросов в минуту на IP
- При превышении возвращается 429

### Фаззинг-тестирование

Тесты находятся в node-postgres/__tests__/validation.fuzz.test.js.

Запуск:

1. cd node-postgres
2. npm test

Проверяются:

- валидация ролей
- валидация username/password
- валидация id
- валидация payload книги

### Docker

- Frontend Dockerfile: Dockerfile
- Backend Dockerfile: node-postgres/Dockerfile
