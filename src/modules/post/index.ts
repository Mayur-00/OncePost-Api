import { PostService } from "./post.services.js";
import prisma from '../../config/prisma.js';
import logger from "../../config/logger.config.js";
import { PostController } from "./post.controller.js";
import { createPostRoutes } from "./post.routes.js";
import { LinkedinService } from "../linkedin/index.js";
import { xServices } from "../x/index.js";

export  const postServices = new PostService(prisma, logger);

export const postController = new PostController(logger,postServices, LinkedinService, xServices);

export const postRoutes = createPostRoutes(postController);

export * from './post.dto.js'
