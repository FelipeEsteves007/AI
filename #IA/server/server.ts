import { createApp } from './app';
import { logger } from './utils/logger';

const port = Number(process.env.API_PORT ?? 3001);

createApp().listen(port, (error?: Error) => {
  if (error) {
    throw error;
  }
  logger.info({ port }, `API ouvindo em http://localhost:${port}`);
});
