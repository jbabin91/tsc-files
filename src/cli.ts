#!/usr/bin/env node
import { main } from '@/cli/main';
import { logger } from '@/utils/logger';

// Handle unhandled rejections - exit immediately for critical errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error}`);
  process.exit(99);
});

// Run CLI with immediate exit after completion
main()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    logger.error(`Fatal error: ${error}`);
    process.exit(99);
  });
