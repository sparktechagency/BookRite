import cors from 'cors';
import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import path from 'path';
import {handleStripeWebhooks, PaymentController} from './app/modules/payment/payment.controller';
import handleStripeWebhook, { unifiedStripeWebhookHandler } from './app/modules/webhook/handleStripeWebhook';
import auth from './app/middlewares/auth';
import { User } from './app/modules/user/user.model';
const app = express();
// app.get('/', (req, res) => {
//   res.send('Server is running');
// });

// app.post('/api/v1/webhook', express.raw({ type: 'application/json' }), PaymentController.handleStripeWebhooks); 
app.post('/api/v1/webhook/stripe', express.raw({ type: 'application/json' }), unifiedStripeWebhookHandler);

app.use(express.json());
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);
//body parser
app.use(cors());
app.use(express.urlencoded({ extended: true }));

//file retrieve
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads/images', express.static(path.join(process.cwd(), 'uploads/images')));
app.get('/api/v1/user/subscription-status', auth('ADMIN'), (req, res, next) => {
  (async () => {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      isSubscribed: user.isSubscribed,
    });
  })().catch(next);
});


//router
app.use('/api/v1', router);
// Increase timeout to 30 seconds
app.use((req, res, next) => {
  res.setTimeout(30000, () => {  // 30 seconds timeout
      console.log('Request has timed out.');
      res.sendStatus(408);  // HTTP 408 Request Timeout
  });
  next();
});


//live response
app.get('/', (req: Request, res: Response) => {
  res.send(
    '<h1 style="text-align:center; color:#A55FEF; font-family:Verdana;">Hey, How can I assist you today!</h1>'
  );
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
