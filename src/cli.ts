#!/usr/bin/env node
import { main } from '@/cli/main';
import { logger } from '@/utils/logger';

// Handle unhandled rejections - exit immediately for critical errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error}`);
  process.exit(99);
});

// Run CLI and handle process exit
main()
  .then((exitCode) => {
    // Give spinners/async operations minimal time to clean up, then exit
    // This ensures the process exits with the correct code in CI/test environments
    // while still allowing ora spinners to finish their cleanup
    setTimeout(() => {
      process.exit(exitCode);
    }, 10);
  })
  .catch((error) => {
    logger.error(`Fatal error: ${error}`);
    process.exit(99);
  });
