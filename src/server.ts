import { app } from './app.js';
import redis from './config/redis.config.js';
import connectDb from './lib/db.js';

async function startServer() {
  try {
    // 1. Connect DB
    await connectDb();
    console.log('✅ Database connected');

    // 3. Start listening Request
    app.listen(Number(process.env.PORT), '0.0.0.0', () => {
      console.log(`✅ Server running on port ${process.env.PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error("❌ Couldn't start server:", err);
    process.exit(1);
  }
}

startServer();
