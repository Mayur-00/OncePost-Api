import logger from '../config/logger.config.js';
import prisma from '../config/prisma.js';

const connectDb = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error(`Failed to Connect Database, Error : ${error}`);
    process.exit(1);
  }
};

export default connectDb;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
