// import colors from 'colors';
// import mongoose from 'mongoose';
// import { Server } from 'socket.io';
// import app from './app';
// import config from './config';
// import { socketHelper } from './helpers/socketHelper';
// import { errorLogger, logger } from './shared/logger';
// import seedSuperAdmin from './DB';

// //uncaught exception
// process.on('uncaughtException', error => {
//   errorLogger.error('UnhandledException Detected', error);
//   process.exit(1);
// });
// //hello

// let server: any;
// async function main() {
//   try {
//     seedSuperAdmin();
//     mongoose.connect(config.database_url as string);
//     logger.info(colors.green('🚀 Database connected successfully'));

//     const port =
//       typeof config.port === 'number' ? config.port : Number(config.port);

//     server = app.listen(port, config.ip_address as string, () => {
//       logger.info(
//         colors.yellow(`♻️  Application listening on port:${config.port}`)
//       );
//     });
    
//     //socket
//     const io = new Server(server, {
//       pingTimeout: 60000,
//       cors: {
//         origin: '*',
//       },
//     });

//     socketHelper.socket(io);
//     //@ts-ignore
//     global.io = io;


//   } catch (error) {
//     errorLogger.error(colors.red('🤢 Failed to connect Database'));
//   }

//   //handle unhandledRejection
//   process.on('unhandledRejection', error => {
//     if (server) {
//       server.close(() => {
//         errorLogger.error('UnhandledRejection Detected', error);
//         process.exit(1);
//       });
//     } else {
//       process.exit(1);
//     }
//   });
// }

// main();

// //SIGTERM
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM IS RECEIVE');
//   if (server) {
//     server.close();
//   }
// });

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

// uncaught exception
process.on('uncaughtException', error => {
  errorLogger.error('UnhandledException Detected', error);
  process.exit(1);
});

let server: any;
let io: Server;

// Extend NodeJS.Global to include 'io'
declare global {
  // eslint-disable-next-line no-var
  var io: Server;
}

async function main() {
  try {
    seedSuperAdmin();
    await mongoose.connect(config.database_url as string);
    logger.info(colors.green('🚀 Database connected successfully'));

    // Express server port (e.g. 4000)
//     const port =
//       typeof config.port === 'number' ? config.port : Number(config.port);

//     server = app.listen(port, config.ip_address as string, () => {
//       logger.info(
//         colors.yellow(`♻️  Application listening on port: ${port}`)
//       );
//     });

//     // Create separate HTTP server just for socket.io
//     const socketPort = process.env.SOCKET_PORT || 5001; // socket server port
//     const socketHttpServer = http.createServer();
//    io = initSocket(server);

// // optionally call your socket helper with io instance
// socketHelper.socket(io);
//     io = new Server(socketHttpServer, {
//       pingTimeout: 60000,
//       cors: {
//         origin: '*',
//       },
//     });

//     socketHelper.socket(io);

//     // Start socket server on its own port
//     socketHttpServer.listen(socketPort, () => {
//       logger.info(
//         colors.yellow(`🚀 Socket.IO server listening on port: ${socketPort}`)
//       );
//     });

//     io = initSocket(server);
//   socketHelper.socket(io);
//     global.io = io;

//   } catch (error) {
//     errorLogger.error(colors.red('🤢 Failed to connect Database'), error);
//   }
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

// SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM IS RECEIVED');
  if (server) {
    server.close();
  }
});
