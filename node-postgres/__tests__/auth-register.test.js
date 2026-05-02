process.env.NODE_ENV = "test";

const mockQuery = jest.fn();

jest.mock("pg", () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const { app } = require("../server");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("creates user and returns token + user for immediate auth", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 77, username: "newuser", role: "user" }],
    });

    const response = await request(app).post("/api/auth/register").send({
      username: "newuser",
      password: "pass1234",
      role: "user",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: 77,
      username: "newuser",
      role: "user",
    });
    expect(typeof response.body.token).toBe("string");

    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET || "super-secret-key-change-me"
    );

    expect(decoded).toMatchObject({
      id: 77,
      username: "newuser",
      role: "user",
    });
  });
});
