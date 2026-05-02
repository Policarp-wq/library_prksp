const fc = require('fast-check');

process.env.NODE_ENV = 'test';

const {
  ALLOWED_ROLES,
  isValidUsername,
  isValidPassword,
  parsePositiveIntId,
  validateBookPayload,
  validateLoanPayload,
} = require('../server');

const QUICK_FC = { numRuns: 20 };

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
      }),
      QUICK_FC
    );
  });

  test('username validator accepts only trimmed length 3..50 strings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 3, maxLength: 50 }), (raw) => {
        const value = raw.trim();
        fc.pre(value.length >= 3 && value.length <= 50);
        return isValidUsername(value) === true;
      }),
      QUICK_FC
    );

    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object()), (value) => {
        return isValidUsername(value) === false;
      }),
      QUICK_FC
    );
  });

  test('password validator rejects non-strings and empty/too short strings', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.object()), (value) => {
        return isValidPassword(value) === false;
      }),
      QUICK_FC
    );

    fc.assert(
      fc.property(fc.string({ maxLength: 3 }), (value) => {
        return isValidPassword(value) === false;
      }),
      QUICK_FC
    );
  });

  test('id parser returns only positive integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (id) => {
        return parsePositiveIntId(String(id)) === id;
      }),
      QUICK_FC
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
      ),
      QUICK_FC
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
          url: fc.option(
            fc.webUrl({
              validSchemes: ['http', 'https'],
            }),
            { nil: undefined }
          ),
        }),
        (payload) => {
          const result = validateBookPayload(payload);
          return result.ok === true;
        }
      ),
      QUICK_FC
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
        }),
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          author: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          year: fc.integer({ min: 1000, max: new Date().getFullYear() + 1 }),
          image: fc.option(fc.string(), { nil: null }),
          url: fc.oneof(
            fc.constantFrom(
              'javascript:alert(1)',
              'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
              'ftp://example.com/book'
            ),
            fc.constant('http://localhost/test'),
            fc.constant('https://127.0.0.1/test'),
            fc.integer(),
            fc.boolean()
          ),
        })
      ), (payload) => {
        const result = validateBookPayload(payload);
        return result.ok === false;
      }),
      QUICK_FC
    );
  });

  test('loan payload validator accepts only positive integer bookId', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (bookId) => {
        const result = validateLoanPayload({ bookId });
        return result.ok === true && result.data.bookId === bookId;
      }),
      QUICK_FC
    );

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.boolean(),
          fc.record({}),
          fc.record({ bookId: fc.integer({ max: 0 }) }),
          fc.record({
            bookId: fc.string().filter((s) => !/^[1-9]\d*$/.test(s.trim())),
          }),
          fc.record({
            bookId: fc.double({ noNaN: true }).filter(
              (n) => !Number.isInteger(n) || n <= 0
            ),
          }),
          fc.record({ bookId: fc.constant(null) })
        ),
        (payload) => {
          const result = validateLoanPayload(payload);
          return result.ok === false;
        }
      ),
      QUICK_FC
    );
  });
});
