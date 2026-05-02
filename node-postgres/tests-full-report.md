# Отчёт по тестам node-postgres

## 1) Найденные тестовые файлы
- node-postgres/__tests__/validation.fuzz.test.js

## 2) Полное содержимое тестового файла

```js
const fc = require('fast-check');

process.env.NODE_ENV = 'test';

const {
  ALLOWED_ROLES,
  isValidUsername,
  isValidPassword,
  parsePositiveIntId,
  validateBookPayload,
} = require('../server');

describe('fuzz: role model and input validators', () => {
  test('only admin/user are allowed roles', () => {
    const allowed = [...ALLOWED_ROLES];

    expect(allowed).toEqual(expect.arrayContaining(['admin', 'user']));
    expect(allowed).toHaveLength(2);

    fc.assert(
      fc.property(fc.string(), (role) => {
        if (role === 'admin' || role === 'user') {
          return ALLOWED_ROLES.has(role) === true;
        }
        return ALLOWED_ROLES.has(role) === false;
      })
    );
  });

  test('username validator accepts only trimmed length 3..50 strings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 3, maxLength: 50 }), (raw) => {
        const value = raw.trim();
        fc.pre(value.length >= 3 && value.length <= 50);
        return isValidUsername(value) === true;
      })
    );

    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object()), (value) => {
        return isValidUsername(value) === false;
      })
    );
  });

  test('password validator rejects non-strings and empty/too short strings', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object()), (value) => {
        return isValidPassword(value) === false;
      })
    );

    fc.assert(
      fc.property(fc.string({ maxLength: 3 }), (value) => {
        return isValidPassword(value) === false;
      })
    );
  });

  test('id parser returns only positive integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (id) => {
        return parsePositiveIntId(String(id)) === id;
      })
    );

    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.string().filter((s) => !/^[1-9]\d*$/.test(s.trim())),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (value) => {
          const parsed = parsePositiveIntId(String(value));
          return parsed === null;
        }
      )
    );
  });

  test('book payload validator accepts valid payload and rejects malformed payload', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
          author: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
          year: fc.integer({ min: 1000, max: new Date().getFullYear() + 1 }),
          image: fc.option(fc.string(), { nil: null }),
        }),
        (payload) => {
          const result = validateBookPayload(payload);
          return result.ok === true;
        }
      )
    );

    fc.assert(
      fc.property(fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.boolean(),
        fc.string(),
        fc.record({
          title: fc.oneof(fc.integer(), fc.constant(''), fc.string({ maxLength: 300 }).filter((s) => s.trim().length === 0 || s.length > 255)),
          author: fc.string({ minLength: 1, maxLength: 100 }),
          year: fc.integer({ min: 1000, max: new Date().getFullYear() + 1 }),
          image: fc.option(fc.string(), { nil: null }),
        }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          author: fc.oneof(fc.integer(), fc.constant(''), fc.string({ maxLength: 300 }).filter((s) => s.trim().length === 0 || s.length > 255)),
          year: fc.integer({ min: 1000, max: new Date().getFullYear() + 1 }),
          image: fc.option(fc.string(), { nil: null }),
        }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          author: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          year: fc.oneof(fc.string(), fc.float(), fc.integer({ max: 999 }), fc.integer({ min: new Date().getFullYear() + 2, max: 9999 })),
          image: fc.option(fc.string(), { nil: null }),
        }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          author: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          year: fc.integer({ min: 1000, max: new Date().getFullYear() + 1 }),
          image: fc.oneof(fc.integer(), fc.boolean(), fc.object()),
        })
      ), (payload) => {
        const result = validateBookPayload(payload);
        return result.ok === false;
      })
    );
  });
});
```

## 3) Разбор каждого теста

### Тест: only admin/user are allowed roles
- Что тестируется: множество ALLOWED_ROLES.
- Arbitrary: fc.string().
- Свойство: для любой строки role вхождение в ALLOWED_ROLES истинно только для admin/user, иначе ложно.
- Корректный вход: admin, user.
- Некорректный вход: любая другая строка.

### Тест: username validator accepts only trimmed length 3..50 strings
- Что тестируется: isValidUsername.
- Arbitraries:
  - fc.string({ minLength: 3, maxLength: 50 }) + trim + fc.pre(...)
  - fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object())
- Свойства:
  - строки, которые после trim имеют длину 3..50, должны проходить.
  - нестроковые значения должны отклоняться.
- Корректный вход: строка после trim длиной 3..50.
- Некорректный вход: integer/boolean/null/undefined/object.

### Тест: password validator rejects non-strings and empty/too short strings
- Что тестируется: isValidPassword.
- Arbitraries:
  - fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object())
  - fc.string({ maxLength: 3 })
- Свойства:
  - нестроки отклоняются.
  - строки длины <= 3 отклоняются.
- Корректный вход: явно не покрыт в этом тесте.
- Некорректный вход: нестроки и слишком короткие строки.

### Тест: id parser returns only positive integers
- Что тестируется: parsePositiveIntId.
- Arbitraries:
  - позитив: fc.integer({ min: 1, max: 1000000 })
  - негатив: fc.oneof(fc.integer({ max: 0 }), fc.string().filter(...), fc.constant(null), fc.constant(undefined))
- Свойства:
  - положительный integer в строке парсится обратно в исходный integer.
  - невалидные значения дают null.
- Корректный вход: строка с положительным целым.
- Некорректный вход: 0/отрицательные, строки не формата positive integer, null, undefined.

### Тест: book payload validator accepts valid payload and rejects malformed payload
- Что тестируется: validateBookPayload.
- Arbitraries:
  - позитивный fc.record с корректными title/author/year/image
  - негативный fc.oneof для не-объектов и malformed-объектов
- Свойства:
  - корректный payload => result.ok === true
  - некорректный payload => result.ok === false
- Корректный вход:
  - title/author: непустые после trim, длина до 255
  - year: integer от 1000 до currentYear+1
  - image: string или null
- Некорректный вход:
  - payload не объект
  - неверные title/author/year/image по типу/ограничениям

## 4) Явное разделение позитивных и негативных сценариев
- Да, в большинстве тестов оно есть через отдельные fc.assert blocks для valid/invalid.
- Исключения:
  - role-тест: одна property с ветвлением if/else.
  - password-тест: только негативные сценарии, позитивный явно не проверяется.

## 5) Количество итераций fast-check
- В тестах не задано numRuns явно.
- Значит используется дефолт fast-check: 100 успешных прогонов на один fc.assert.
- В файле 9 вызовов fc.assert, ориентировочно 9 x 100 = 900 успешных прогонов суммарно.
- Из-за fc.pre(...) и filter(...) попыток генерации может быть больше, чем 100 на property.

## 6) Фактический вывод запуска тестов
Команда:

```bash
npm test
```

Вывод:

```text
> postgres@1.0.0 test
> jest --runInBand

  console.log
    ◇ injected env (7) from .env // tip: ◈ encrypted .env [www.dotenvx.com]

      at _log (node_modules/dotenv/lib/main.js:131:11)

 PASS  __tests__/validation.fuzz.test.js (9.931 s)
  fuzz: role model and input validators
    √ only admin/user are allowed roles (7 ms)
    √ username validator accepts only trimmed length 3..50 strings (10 ms)
    √ password validator rejects non-strings and empty/too short strings (4 ms)
    √ id parser returns only positive integers (1 ms)
    √ book payload validator accepts valid payload and rejects malformed payload (6 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        10.948 s
Ran all test suites.
```
