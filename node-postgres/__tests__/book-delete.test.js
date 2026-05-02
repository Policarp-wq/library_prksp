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

function adminToken() {
  const secret = process.env.JWT_SECRET || "super-secret-key-change-me";
  return jwt.sign({ id: 1, username: "admin", role: "admin" }, secret, {
    expiresIn: "1h",
  });
}

describe("DELETE /api/books/:id", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("returns 409 when book has an active loan", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }] });

    const response = await request(app)
      .delete("/api/books/10")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Нельзя удалить: книга сейчас выдана",
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      "SELECT id FROM loans WHERE book_id = $1 AND returned_at IS NULL LIMIT 1",
      [10]
    );
  });

  test("returns 204 and deletes book when there is no active loan", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app)
      .delete("/api/books/11")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      "SELECT id FROM loans WHERE book_id = $1 AND returned_at IS NULL LIMIT 1",
      [11]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM books WHERE id = $1",
      [11]
    );
  });
});
