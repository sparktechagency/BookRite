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

// JWT token generation
const generateTokens = (userId: string) => {
  const payload = {
    userId,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
  };

  const accessToken = jwt.sign(payload, config.jwt.jwt_secret || JWT_SECRET_KEY, {
    expiresIn: config.jwt.jwt_expire_in,
  });

  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your_default_refresh_secret';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    refreshSecret,
    { expiresIn: refreshExpiresIn },
  );

  return { accessToken, refreshToken };
};

// Google OAuth2 client setup
// const client = new OAuth2Client();
// export const googleLoginOrRegister = async (req: Request, res: Response) => {
//   try {
//     const { idToken } = req.body;

//     if (!idToken) {
//       return sendResponse(res, {
//         statusCode: StatusCodes.BAD_REQUEST,
//         success: false,
//         message: 'Google ID token is required',
//       });
//     }

//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: [
//         process.env.GOOGLE_CLIENT_ID_ANDROID || '',
//         process.env.GOOGLE_CLIENT_ID_IOS || '',
//         process.env.GOOGLE_CLIENT_ID_WEB || '',
//       ],
//     });

//     const payload = ticket.getPayload();
//     if (!payload) {
//       return sendResponse(res, {
//         statusCode: StatusCodes.UNAUTHORIZED,
//         success: false,
//         message: 'Invalid Google token payload',
//       });
//     }

//     const {
//       sub: googleId,
//       email,
//       name: fullName,
//       picture: image,
//       email_verified: emailVerified,
//     } = payload;

//     if (!emailVerified) {
//       return sendResponse(res, {
//         statusCode: StatusCodes.BAD_REQUEST,
//         success: false,
//         message: 'Google email not verified',
//       });
//     }

//     let user = await User.findOne({ googleId });
//     const isNewUser = !user;

//     if (!user) {
//       user = await User.create({
//         googleId,
//         fullName: fullName || '',
//         email: email || '',
//         image: image || '',
//         isVerified: true,
//         isRestricted: false,
//         role: USER_ROLES.USER,
//       });
//     } else {
//       user.name = fullName || '';
//       user.email = user.email || email || '';
//       user.verified = true;
//       await user.save();
//     }

//     const { accessToken, refreshToken } = generateTokens(user._id.toString());

//     await User.findByIdAndUpdate(user._id, {
//       $push: { refreshTokens: refreshToken },
//     });

//     return sendResponse(res, {
//       statusCode: isNewUser ? StatusCodes.CREATED : StatusCodes.OK,
//       success: true,
//       message: isNewUser
//         ? 'User registered successfully with Google.'
//         : 'User logged in successfully with Google.',
//       data: {
//         tokens: { accessToken, refreshToken },
//         user: {
//           id: user._id,
//           googleId: user.googleId,
//           fullName: user.name,
//           email: user.email,
//           role: user.role,
//           isVerified: user.verified,
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Google login error:', error.message);
//     return sendResponse(res, {
//       statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
//       success: false,
//       message: 'Google authentication failed',
//     });
//   }
// };

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

// Controller function
const deleteUserByEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await UserService.deleteUserByEmailAndPassword(email, password);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Account deleted successfully',
    data: result, // this will be undefined but can be changed if needed
  });
});


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
  //  googleLoginOrRegister,
   googleAuthLoginFirebase,
   deleteUserByEmail
  };
