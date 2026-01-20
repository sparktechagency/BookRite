import colors from 'colors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import http from 'http';
import app from './app';
import config from './config';
import { socketHelper } from './helpers/socketHelper';
import { errorLogger, logger } from './shared/logger';
import seedSuperAdmin from './DB';
import { initSocket } from './helpers/socket';
import { startInAppCron } from './app/modules/inApp/cron.scheduler';

// uncaught exception
process.on('uncaughtException', error => {
  errorLogger.error('UnhandledException Detected', error);
  process.exit(1);
});

let server: any;
// let io: Server;

// Extend NodeJS.Global to include 'io'
declare global {
  // eslint-disable-next-line no-var
  var io: Server;
}

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    logger.info(colors.green('🚀 Database connected successfully'));
    await seedSuperAdmin();


    const port =
      typeof config.port === 'number' ? config.port : Number(config.port);

    server = app.listen(port, config.ip_address as string, () => {
      logger.info(
        colors.yellow(`♻️  Application listening on port:${config.port}`)
      );
    });

    //socket
    const io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: '*',
      },
    });

    socketHelper.socket(io);
    //@ts-ignore
    global.io = io;


  } catch (error) {
    errorLogger.error(colors.red('🤢 Failed to connect Database'));
  }

  // handle unhandledRejection
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        errorLogger.error('UnhandledRejection Detected', error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();
startInAppCron();
// SIGTERM
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM IS RECEIVED');
//   if (server) {
//     server.close();
//   }
// });
