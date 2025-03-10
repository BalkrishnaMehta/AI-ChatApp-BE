import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { Response } from "express";

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const environment = process.env.ENV || "development";

if (!jwtAccessSecret || !jwtRefreshSecret) {
  throw new Error("JWT secrets are not defined in environment variables");
}

export const generateToken = (
  payload: object,
  expiresIn: string | number,
  secret: Secret
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
};

export const generateAuthTokens = (payload: { id: string }) => {
  return {
    accessToken: generateToken(payload, "15m", jwtAccessSecret),
    refreshToken: generateToken(payload, "30d", jwtRefreshSecret),
  };
};

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: environment === "production",
    sameSite: "strict",
    // sameSite: "none",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};
