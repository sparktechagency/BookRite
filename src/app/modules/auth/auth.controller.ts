import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import { User } from 'mercadopago';
import ApiError from '../../../errors/ApiError';

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { ...verifyData } = req.body;
  const result = await AuthService.verifyEmailToDB(verifyData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result.data,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body;
  const result = await AuthService.loginUserFromDB(loginData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User login successfully',
    data: {
      Token: result.createToken,
      role: result.role,
      user: result.user, 
    },
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  const result = await AuthService.forgetPasswordToDB(email);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Please check your email, we send a OTP!',
    data: result,
  });
});

// const resetPassword = catchAsync(async (req: Request, res: Response) => {
//   const token = req.headers.authorization;
//   const { ...resetData } = req.body;
//   const result = await AuthService.resetPasswordToDB(token!, resetData);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'Password reset successfully',
//     data: result,
//   });
// });
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authorization header is missing");
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid authorization header format");
  }

  const { ...resetData } = req.body;
  const result = await AuthService.resetPasswordToDB(token, resetData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Password reset successfully',
    data: result,
  });
});


const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...passwordData } = req.body;
  await AuthService.changePasswordToDB(user, passwordData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Password changed successfully',
  });
});

export const AuthController = {
  verifyEmail,
  loginUser,
  forgetPassword,
  resetPassword,
  changePassword,
};
