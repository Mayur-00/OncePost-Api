import { CookieOptions } from 'express';
const isProd = process.env.NODE_ENV === 'production'

export const generateCookieOptions = (name: TokenName): CookieOptions => {
  switch (name) {
    case "access": {
      return {
         httpOnly: true,
        secure: isProd, // Always true for Render/Vercel HTTPS
        sameSite:isProd?'none' : "lax" as const,
        domain: process.env.DOMAIN,
        path: '/',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
    case "refresh" : {
        return {
        httpOnly: true,
        secure: isProd, // Always true for Render/Vercel HTTPS
        sameSite:isProd? 'none' : "lax" as const,
        domain: process.env.DOMAIN,
        path: '/',
        expires: new Date(Date.now() +30 * 24 * 60 * 60 * 1000),
      };
    }

    default :{
        throw new Error("Unknown token name");
    }
  }
};

type TokenName = "access"|"refresh";

export type generateCookieOptionsType = (name:TokenName) => CookieOptions;