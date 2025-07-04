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
    console.log('[GoogleLogin] Incoming body:', req.body);

    const { idToken } = req.body;

    if (!idToken) {
      console.warn('[GoogleLogin] ❌ Missing Google ID token from frontend.');
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing Google ID token');
    }

    console.log('[GoogleLogin] ✅ Received ID token. Verifying...');

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('[GoogleLogin] ✅ Token payload:', payload);

    if (!payload || !payload.email || !payload.name || !payload.sub) {
      console.warn('[GoogleLogin] ❌ Invalid Google token structure:', payload);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Google token');
    }

    const { sub: googleId, email, name: fullName } = payload;
    console.log(`[GoogleLogin] ✅ User info extracted: email=${email}, name=${fullName}, googleId=${googleId}`);

    // Find user with role information (same as your normal login)
    let user = await User.findOne({ email }).select('+role');
    let isNewUser = false;

    if (!user) {
      console.log('[GoogleLogin] 🔄 No user found. Creating new user...');
      user = await User.create({
        fullName,
        email,
        googleId,
        isVerified: true,
        verified: true, // Add both fields to be safe
        isRestricted: false,
        role: 'user',
        status: 'active', // Make sure status is set
        authProvider: 'google',
      });
      isNewUser = true;
      console.log('[GoogleLogin] ✅ New user created:', user);
    } else {
      console.log('[GoogleLogin] ✅ Existing user found:', user.email);
      
      // Check user status (same checks as your normal login)
      if (user.status === 'delete') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been deactivated.');
      }

      if (user.status === 'block') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been blocked.');
      }

      // Update Google ID if not present
      if (!user.googleId) {
        user.googleId = googleId;
        user.verified = true;
        await user.save();
      }
    }

    // Use your existing JWT helper (same as normal login)
    const createToken = jwtHelper.createToken(
      { id: user._id, role: user.role, email: user.email },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    console.log('[GoogleLogin] ✅ JWT created using jwtHelper:', createToken);
    console.log('[GoogleLogin] ✅ User data being returned:', {
      id: user._id,
      role: user.role,
      email: user.email,
  
    });

    // Use your existing response format
    res.status(isNewUser ? StatusCodes.CREATED : StatusCodes.OK).json({
      success: true,
      statusCode: isNewUser ? StatusCodes.CREATED : StatusCodes.OK,
      message: isNewUser
        ? 'User registered successfully with Google'
        : 'User login successfully with Google',
      data: {
        Token: createToken, // Use same key as your normal login
        role: user.role,
        user: user,
      },
    });
  } catch (error: any) {
    console.error('[GoogleLogin] ❌ Error:', error.message || error);
    next(error);
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
   googleLoginOrRegister,
   googleAuthLoginFirebase
  };
