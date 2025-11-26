
import { linkedinServices } from "./linkedin.services";
import prisma from "../../config/prisma";
import logger from "../../config/logger.config";
import axios from "axios";
import { PostServices } from "./post.services";
import { LinkedinController } from "./linkedin.controller";
import { createLinkedInRoutes } from "./linkedin.router";

export const LinkedinService = new linkedinServices(
    prisma,
    logger,
    axios,
    {
        clientID:process.env.LINKEDIN_CLIENT_ID!,
        clientSecret:process.env.LINKEDIN_CLIENT_SECRET!,
        redirectUri:'http://localhost:5000/api/v1/linkedin/callback'
    }
);

export const postServices = new PostServices(
    prisma,
    logger
)

export const linkedinController = new LinkedinController(
    LinkedinService,
    postServices,
    logger
)

export const linkedinRoutes = createLinkedInRoutes(linkedinController);