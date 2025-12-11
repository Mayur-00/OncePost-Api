import axios from "axios";
import { XServices } from "./x.services.js";
import logger from "../../config/logger.config.js";
import Prisma from "../../config/prisma.js"
import { XController } from "./x.controller.js";
import { jwtToken } from "../shared/jwt/jwtCookie.service.js";
import { createXRoutes } from "./x.router.js";

 export const xServices = new XServices(axios, logger, Prisma);
 export const jwtService = new jwtToken()
 export const xController = new XController(logger, xServices, Prisma, jwtService);

 export const XRoutes = createXRoutes(xController);


export * from './x.types.js';
export * from './x.dto.js';