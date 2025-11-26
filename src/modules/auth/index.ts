import { UserServices } from "./auth.services";
import prisma from "../../config/prisma";
import logger from "../../config/logger.config";
import axios from "axios";
import { googleAuthClient } from "../../config/googleOAuth.config";
import { AuthController } from "./auth.controller";
import { createAuthRoutes } from "./auth.routes";


export const userServices = new UserServices(
    prisma,
    logger,
    axios,
    googleAuthClient,
    process.env.GOOGLE_CLIENT_ID!
);

export const authController = new AuthController(
    logger,
    userServices
);

 export const authRoutes = createAuthRoutes(authController);
