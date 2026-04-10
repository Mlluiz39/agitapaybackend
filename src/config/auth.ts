import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in .env");
}

export const authConfig = {
  jwt: {
    secret: JWT_SECRET,
  },
  algorithms: ["HS256"] as const,
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
  iat?: number;
  exp?: number;
}