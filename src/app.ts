import cors from 'cors';
import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import path from 'path';
import { stripeWebhookHandler } from './app/modules/payment/payment.controller';
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json());
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);
//body parser
app.use(cors());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
