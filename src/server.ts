import { app } from './app.js';
import connectDb from './lib/db.js';

connectDb()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server running on port ${process.env.PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error("❌ Couldn't start server:", err);
    process.exit(1);
  });
