import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

import { handleError } from './middlewares/error.middleware.js';
import cors from 'cors';
import { authorize } from './middlewares/auth.middleware.js';
import { ApiResponse } from './utils/apiResponse.js';
import cookieParser from 'cookie-parser';
import { linkedinRoutes } from './modules/linkedin/index.js';
import { authRoutes } from './modules/auth/index.js';
import { XRoutes } from './modules/x/index.js';
import { postRoutes } from './modules/post/index.js';
dotenv.config();
export const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ limit: '16kb', extended: true }));

app.get('/', authorize, (req: Request, res: Response) => {
  const user = req.user;
  res.status(200).json(new ApiResponse(200, user, 'data fetched success'));
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/linkedin', linkedinRoutes);
app.use('/api/v1/x', XRoutes);
app.use('/api/v1/post', postRoutes)
app.use(handleError);
