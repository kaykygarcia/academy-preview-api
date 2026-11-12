import { createAppServer } from './app.mjs';

const port = Number(process.env.PORT || 3000);
const server = createAppServer();
server.listen(port, '0.0.0.0', () => {
  console.log(`academy-preview-api listening on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
