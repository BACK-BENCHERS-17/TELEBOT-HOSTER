import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";
import { ADMIN_CREDENTIALS } from "./adminConfig";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  return session({
    secret: process.env.SESSION_SECRET || 'telebot-hoster-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session && req.session.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
  }
  
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin: RequestHandler = async (req: any, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  
  res.status(403).json({ message: "Forbidden - Admin access required" });
};
