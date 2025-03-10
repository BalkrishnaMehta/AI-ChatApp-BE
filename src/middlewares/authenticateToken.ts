import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET!;

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, jwtAccessSecret, (err, decoded) => {
    if (err) return res.sendStatus(403);

    req.user = decoded as JwtPayload;
    next();
  });
};
