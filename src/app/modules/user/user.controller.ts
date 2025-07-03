import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import AppError from '../../../errors/ApiError';
import { User } from './user.model';
import jwt from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { IUser } from './user.interface';
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
    const { googleId, fullName, email } = req.body;

    if (!googleId || !email || !fullName) {
      throw new AppError(400, 'Missing Google credentials');
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName,
        email,
        googleId,
        isVerified: true,
        isRestricted: false,
        role: USER_ROLES.USER, 
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, {
      expiresIn: '20d',
    });

    res.status(user.isNew ? 201 : 200).json({
      status: 'success',
      message: user.isNew
        ? 'User registered successfully with Google.'
        : 'User logged in successfully with Google.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Error during Google login or registration:', error);
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ status: 'error', message: error.message });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error. Please try again later.',
      });
    }
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
