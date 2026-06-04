import axios from "axios";
import logger from "../../config/logger.config.js";
import prisma from "../../config/prisma.js";
import { BlueskyService } from "./bluesky.services.js";
import { BlueskyControllerClass } from "./bluesky.controller.js";
import { createBlueskyRoutes } from "./bluesky.router.js";

export const BlueskyServices = new BlueskyService(prisma, axios, logger);

export const BlueskyController = new BlueskyControllerClass(BlueskyServices, logger);

export const blueskyRoutes = createBlueskyRoutes(BlueskyController);

export * from "./bluesky.dto.js";
export * from "./bluesky.types.js";

