import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import path from 'path';
import { handleStripeWebhooks, PaymentController } from './app/modules/payment/payment.controller';
import handleStripeWebhook, { unifiedStripeWebhookHandler } from './app/modules/webhook/handleStripeWebhook';
import auth from './app/middlewares/auth';
import { User } from './app/modules/user/user.model';
const app = express();
// app.get('/', (req, res) => {
//   res.send('Server is running');
// });

// app.post('/api/v1/webhook', express.raw({ type: 'application/json' }), PaymentController.handleStripeWebhooks); 
app.post('/api/v1/webhook/stripe', express.raw({ type: 'application/json' }), unifiedStripeWebhookHandler);
// Add to your routes file
app.get('/api/v1/purchase/test-apple-auth', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
        const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
        const APPLE_BUNDLE_ID = process.env.IOS_BUNDLE_ID;
        
        console.log('🔍 Apple Configuration Check:');
        console.log('   APPLE_KEY_ID:', APPLE_KEY_ID);
        console.log('   APPLE_KEY_ID length:', APPLE_KEY_ID?.length);
        console.log('   APPLE_ISSUER_ID:', APPLE_ISSUER_ID);
        console.log('   APPLE_ISSUER_ID length:', APPLE_ISSUER_ID?.length);
        console.log('   APPLE_BUNDLE_ID:', APPLE_BUNDLE_ID);
        
        // Generate a test token
        const jwt = require('jsonwebtoken');
        const fs = require('fs');
        const path = require('path');
        
        const keyPath = path.join(__dirname, '../AuthKey_N246NQZA36.p8');
        const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
        
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: APPLE_ISSUER_ID,
            iat: now,
            exp: now + 3600,
            aud: "appstoreconnect-v1",
            bid: APPLE_BUNDLE_ID
        };
        
        const token = jwt.sign(payload, privateKey, {
            algorithm: "ES256",
            header: {
                alg: "ES256",
                kid: APPLE_KEY_ID,
                typ: "JWT"
            }
        });
        
        res.json({
            success: true,
            message: 'JWT generated successfully',
            config: {
                keyId: APPLE_KEY_ID,
                keyIdLength: APPLE_KEY_ID?.length,
                issuerId: APPLE_ISSUER_ID,
                issuerIdLength: APPLE_ISSUER_ID?.length,
                bundleId: APPLE_BUNDLE_ID,
                tokenPreview: token.substring(0, 50) + '...',
                tokenLength: token.length
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
});
app.use('/htmlResponse', express.static(path.join(__dirname, '..', 'htmlResponse')));
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
