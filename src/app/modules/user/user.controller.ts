import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import AppError from '../../../errors/ApiError';
import { User } from './user.model';
import jwt, { Secret } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { IUser } from './user.interface';
import { token } from 'morgan';
import { OAuth2Client } from 'google-auth-library';
import ApiError from '../../../errors/ApiError';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_default_jwt_secret_key';

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createUserToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Please check your email to verify your account. We have sent you an OTP to complete the registration process.',
      data: result,
    })
  }
);


const createAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createAdminToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Admin created successfully',
      data: result,
    });
  }
);

//create super admin
const createSuperAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createSuperAdminToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Super Admin created successfully',
      data: result,
    });
  }
);


const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    let profile;
    if (req.files && 'image' in req.files && req.files.image[0]) {
      profile = `/uploads/images/${req.files.image[0].filename}`;
    }

    const data = {
      profile,
      ...req.body,
    };
    const result = await UserService.updateProfileToDB(user, data);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile updated successfully',
      data: result,
    });
  }
);

//resend otp
const resendOtp = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const result = await UserService.resendOtp(email);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'A new OTP has been sent to your email.',
      data: result,
    });
  }
);

  const updateUserLocationController: any = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }

    const { longitude, latitude } = req.body;

    const updatedUser = await UserService.updateUserLocation(
      userId,
      longitude,
      latitude,
      
    );

    res.json({ message: "Location updated successfully", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

 const getUsersWithLocationController = async (
  req: Request,
  res: Response
) => {
  try {
    const users = await UserService.getUsersWithLocationAccess();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.deleteUserFromDB(req.user, req.body.password);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Account Deleted successfully',
        data: result
    });
});



export const googleLoginOrRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('\n=== GOOGLE AUTH DEBUG START ===');
    console.log('[GoogleLogin] 📥 Incoming request:');
    console.log('[GoogleLogin] - Method:', req.method);
    console.log('[GoogleLogin] - URL:', req.url);
    console.log('[GoogleLogin] - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[GoogleLogin] - Body:', JSON.stringify(req.body, null, 2));

    const { idToken } = req.body;

    if (!idToken) {
      console.warn('[GoogleLogin] ❌ Missing Google ID token from frontend.');
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing Google ID token');
    }

    console.log('[GoogleLogin] ✅ Received ID token:', idToken.substring(0, 50) + '...');

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('[GoogleLogin] ✅ Google token payload:', JSON.stringify(payload, null, 2));

    if (!payload || !payload.email || !payload.name || !payload.sub) {
      console.warn('[GoogleLogin] ❌ Invalid Google token structure:', payload);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Google token');
    }

    const { sub: googleId, email, name } = payload;
    console.log('[GoogleLogin] ✅ Extracted user info:');
    console.log(`[GoogleLogin] - email: ${email}`);
    console.log(`[GoogleLogin] - name: ${name}`);
    console.log(`[GoogleLogin] - googleId: ${googleId}`);

    // Find existing user
    let isExistUser = await User.findOne({ email }).select('+password +role');
    let isNewUser = false;

    console.log('[GoogleLogin] 🔍 Database query result:', isExistUser ? 'USER FOUND' : 'USER NOT FOUND');

    if (!isExistUser) {
      console.log('[GoogleLogin] 🔄 Creating new user...');
      
      const newUserData = {
        name,
        email,
        googleId,
        verified: true,
        isVerified: true,
        status: 'active',
        role: 'user',
        authProvider: 'google',
      };
      
      console.log('[GoogleLogin] 📝 New user data:', JSON.stringify(newUserData, null, 2));
      
      isExistUser = await User.create(newUserData);
      isNewUser = true;
      
      console.log('[GoogleLogin] ✅ New user created:');
      console.log(`[GoogleLogin] - _id: ${isExistUser._id}`);
      console.log(`[GoogleLogin] - email: ${isExistUser.email}`);
      console.log(`[GoogleLogin] - role: ${isExistUser.role}`);
      console.log(`[GoogleLogin] - status: ${isExistUser.status}`);
      console.log(`[GoogleLogin] - verified: ${isExistUser.verified}`);
    } else {
      console.log('[GoogleLogin] ✅ Existing user found:');
      console.log(`[GoogleLogin] - _id: ${isExistUser._id}`);
      console.log(`[GoogleLogin] - email: ${isExistUser.email}`);
      console.log(`[GoogleLogin] - role: ${isExistUser.role}`);
      console.log(`[GoogleLogin] - status: ${isExistUser.status}`);
      console.log(`[GoogleLogin] - verified: ${isExistUser.verified}`);
      console.log(`[GoogleLogin] - googleId: ${isExistUser.googleId}`);
      
      // Status checks
      if (!isExistUser.verified) {
        console.log('[GoogleLogin] ❌ User not verified');
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Please verify your account first!');
      }

      if (isExistUser.status === 'delete') {
        console.log('[GoogleLogin] ❌ User account deleted');
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been deactivated.');
      }

      if (isExistUser.status === 'block') {
        console.log('[GoogleLogin] ❌ User account blocked');
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been blocked.');
      }

      // Update Google ID if not present
      if (!isExistUser.googleId) {
        console.log('[GoogleLogin] 🔄 Updating user with Google ID...');
        isExistUser.googleId = googleId;
        await isExistUser.save();
        console.log('[GoogleLogin] ✅ Google ID updated');
      }
    }

    // JWT Creation
    console.log('[GoogleLogin] 🔐 Creating JWT token...');
    console.log('[GoogleLogin] 🔍 JWT config check:');
    console.log(`[GoogleLogin] - jwt_secret exists: ${config.jwt.jwt_secret ? 'YES' : 'NO'}`);
    console.log(`[GoogleLogin] - jwt_expire_in: ${config.jwt.jwt_expire_in}`);

    const tokenPayload = {
      id: isExistUser._id,
      role: isExistUser.role,
      email: isExistUser.email
    };
    
    console.log('[GoogleLogin] 🔍 Token payload:', JSON.stringify(tokenPayload, null, 2));

    const createToken = jwtHelper.createToken(
      tokenPayload,
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    console.log('[GoogleLogin] ✅ JWT created successfully');
    console.log(`[GoogleLogin] - Token length: ${createToken.length}`);
    console.log(`[GoogleLogin] - Token preview: ${createToken.substring(0, 50)}...`);

    // Verify the token we just created
    try {
      const decoded = jwtHelper.verifyToken(createToken, config.jwt.jwt_secret as Secret);
      console.log('[GoogleLogin] ✅ JWT verification test PASSED');
      console.log('[GoogleLogin] 🔍 Decoded token:', JSON.stringify(decoded, null, 2));
    } catch (jwtError) {
      console.error('[GoogleLogin] ❌ JWT verification test FAILED:', jwtError);
    }

    // Prepare response
    const responseData = {
      success: true,
      statusCode: isNewUser ? StatusCodes.CREATED : StatusCodes.OK,
      message: isNewUser 
        ? 'User registered successfully with Google'
        : 'User login successfully with Google',
      data: {
        Token: createToken,
        role: isExistUser.role,
        user: {
          _id: isExistUser._id,
          name: isExistUser.name,
          email: isExistUser.email,
          role: isExistUser.role,
          status: isExistUser.status,
          verified: isExistUser.verified,
          googleId: isExistUser.googleId
        },
      },
    };

    console.log('[GoogleLogin] 📤 Sending response:');
    console.log(`[GoogleLogin] - Status Code: ${responseData.statusCode}`);
    console.log(`[GoogleLogin] - Message: ${responseData.message}`);
    console.log(`[GoogleLogin] - Token Key: "Token"`);
    console.log(`[GoogleLogin] - Token Length: ${createToken.length}`);
    console.log(`[GoogleLogin] - User Role: ${isExistUser.role}`);
    console.log(`[GoogleLogin] - User ID: ${isExistUser._id}`);
    console.log('[GoogleLogin] - Full Response:', JSON.stringify(responseData, null, 2));

    res.status(isNewUser ? StatusCodes.CREATED : StatusCodes.OK).json(responseData);
    
    console.log('[GoogleLogin] ✅ Response sent successfully');
    console.log('=== GOOGLE AUTH DEBUG END ===\n');

  } catch (error: any) {
    console.error('\n❌ GOOGLE AUTH ERROR ❌');
    console.error('[GoogleLogin] Error type:', error.constructor.name);
    console.error('[GoogleLogin] Error message:', error.message);
    console.error('[GoogleLogin] Error stack:', error.stack);
    console.error('[GoogleLogin] Full error object:', JSON.stringify(error, null, 2));
    console.error('=== GOOGLE AUTH ERROR END ===\n');
    next(error);
  }
};

// Also add this middleware to log all incoming requests
export const logAllRequests = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`🔍 Headers:`, JSON.stringify(req.headers, null, 2));
  
  if (req.headers.authorization) {
    console.log(`🔐 Authorization header found: ${req.headers.authorization.substring(0, 50)}...`);
  } else {
    console.log(`❌ No Authorization header found`);
  }
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📝 Body:`, JSON.stringify(req.body, null, 2));
  }
  
  next();
};

// Add this to your auth middleware to debug token verification
export const debugAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`\n🔒 AUTH MIDDLEWARE DEBUG - ${req.method} ${req.url}`);
    console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers.authorization;
    console.log('🔍 Authorization header:', authHeader);
    
    if (!authHeader) {
      console.log('❌ No authorization header found');
      return res.status(401).json({ message: 'No authorization header' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization format - should start with Bearer');
      return res.status(401).json({ message: 'Invalid authorization format' });
    }
    
    const token = authHeader.substring(7);
    console.log('🔍 Extracted token:', token.substring(0, 50) + '...');
    console.log('🔍 Token length:', token.length);
    
    // Verify token
    const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
    console.log('✅ Token verified successfully');
    console.log('🔍 Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Add user info to request
    req.user = {
      ...(decoded as object),
      // Optionally, ensure all required fields are present
      id: (decoded as any).id,
      _id: (decoded as any)._id,
      role: (decoded as any).role,
      email: (decoded as any).email,
    };
    console.log('✅ User attached to request:', JSON.stringify(req.user, null, 2));
    
    next();
  } catch (error: any) {
    console.error('❌ AUTH MIDDLEWARE ERROR:', error.message);
    console.error('❌ Full error:', error);
    res.status(401).json({ message: 'You are not authorized' });
  }
};


export const googleAuthLoginFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, profile } = req.body;

    if (!email) {
       res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      const newUser: Partial<IUser> = {
        email,
        name: name || '',
        profile: profile || '',
        role: USER_ROLES.USER, 
        verified: true,
      };

      user = await User.create(newUser);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User logged in successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        token: jwt.sign({ userId: user._id }, JWT_SECRET_KEY, {
          expiresIn: '20d',
        }),
      },
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to login',
    });
  }
};

export const UserController = { 
  createUser,
   createAdmin, 
   getUserProfile, 
   updateProfile,
   createSuperAdmin,
   resendOtp,
   getUsersWithLocationController, 
   updateUserLocationController,
   deleteUser,
  //  googleLoginOrRegister,
   googleLoginOrRegister,
   googleAuthLoginFirebase
  };
