import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { handleError } from './middlewares/error.middleware.js';
import { linkedinRoutes } from './modules/linkedin/index.js';
import { authRoutes } from './modules/auth/index.js';
import { XRoutes } from './modules/x/index.js';
import { postRoutes } from './modules/post/index.js';
import { subscriptionRoutes } from './modules/subscription/index.js';
import { limiter } from './config/limiter.config.js';
import { analyticsRoutes } from './modules/analytics/index.js';
import { blueskyRoutes } from './modules/blueksky/index.js';
dotenv.config();
export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

app.use(express.urlencoded({ limit: '16kb', extended: true }));

app.set('trust proxy', 1);

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/linkedin', linkedinRoutes);
app.use('/api/v1/x', XRoutes);
app.use('/api/v1/post', postRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/bluesky', blueskyRoutes);

app.use(handleError);
