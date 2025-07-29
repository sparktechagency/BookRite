import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { IUser } from '../user/user.interface';

//login
// const loginUserFromDB = async (payload: ILoginData) => {
//   const { email, password } = payload;
//   const isExistUser:any = await User.findOne({ email }).select('+password');
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   //check verified and status
//   if (!isExistUser.verified) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'Please verify your account, then try to login again'
//     );
//   }

//   //check user status
//   if (isExistUser.status === 'delete') {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'You don’t have permission to access this content.It looks like your account has been deactivated.'
//     );
//   }

//   //check match password
//   if (
//     password &&
//     !User.isMatchPassword(password, isExistUser.password)
//   ) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
//   }

//   //check user status
//   if (isExistUser.status === 'block') {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'You don’t have permission to access this content.It looks like your account has been blocked.'
//     );
//   }

//   //create token
//   const createToken = jwtHelper.createToken(
//     { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
//     config.jwt.jwt_secret as Secret,
//     config.jwt.jwt_expire_in as string
//   );

//   return { createToken };
// };


export const socialLoginFromDB = async (payload: IUser) => {
  const { appId, name, email } = payload;

  // Validate input payload
  if (!appId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'appId is required for social login');
  }

  // Log input payload for debugging
  console.log('Input payload:', { appId, name, email });

  const role = USER_ROLES.USER;

  // Search for existing user
  let isExistUser = await User.findOne({ appId, role }).select('name email isSubscribed role');

  if (isExistUser) {
    // Log the retrieved user for debugging
    console.log('Existing user found:', isExistUser);

    // Update name and email if provided in the payload
    const updateData: Partial<IUser> = {};
    if (name && isExistUser.name !== name) updateData.name = name;
    if (email && isExistUser.email !== email) updateData.email = email;

    if (Object.keys(updateData).length > 0) {
      isExistUser = await User.findOneAndUpdate(
        { appId, role },
        { $set: updateData },
        { new: true, select: 'name email isSubscribed role' }
      );
      console.log('Updated user:', isExistUser);
    }

    if (!isExistUser) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve or update user');
    }

    const accessToken = jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    const refreshToken = jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role },
      config.jwt.jwtRefreshSecret as Secret,
      config.jwt.jwtRefreshExpiresIn as string
    );

    return {
      accessToken,
      refreshToken,
      isRegister: false,
      isSubscribed: isExistUser.isSubscribed || false,
      userId: isExistUser._id.toString(),
      name: isExistUser.name || '',
      email: isExistUser.email || '',
      role: isExistUser.role,
    };
  } else {
    if (!name && !email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one of name or email is required for new user');
    }

    // Create a new user
    const newUserData: Partial<IUser> = {
      appId,
      role,
      verified: true,
      name: name || '',
      email: email || '',
    };

    console.log('Creating new user with data:', newUserData);

    const user = await User.create(newUserData);

    console.log('New user created:', user);

    const accessToken = jwtHelper.createToken(
      { id: user._id, role: user.role },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );

    const refreshToken = jwtHelper.createToken(
      { id: user._id, role: user.role },
      config.jwt.jwtRefreshSecret as Secret,
      config.jwt.jwtRefreshExpiresIn as string
    );

    return {
      accessToken,
      refreshToken,
      isRegister: true,
      isSubscribed: user.isSubscribed || false,
      userId: user._id.toString(),
      name: user.name || '',
      email: user.email || '',
      role: user.role,
    };
  }
};

// export const socialLoginFromDB = async (payload: IUser) => {
//   const { appId } = payload;

//   if (!appId) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'appId is required for social login');
//   }

//   const role = USER_ROLES.USER;

//   // Only search for users with role USER
//   const isExistUser = await User.findOne({ appId, role: USER_ROLES.USER });

//   if (isExistUser) {
//     const accessToken = jwtHelper.createToken(
//       { id: isExistUser._id, role: isExistUser.role },
//       config.jwt.jwt_secret as Secret,
//       config.jwt.jwt_expire_in as string
//     );

//     const refreshToken = jwtHelper.createToken(
//       { id: isExistUser._id, role: isExistUser.role },
//       config.jwt.jwtRefreshSecret as Secret,
//       config.jwt.jwtRefreshExpiresIn as string
//     );

//     return {
//       accessToken,
//       refreshToken,
//       isRegister: false,
//       isSubscribed: isExistUser.isSubscribed,
//       userId: isExistUser._id.toString(),
//       name: isExistUser.name,
//       email: isExistUser.email,
//       role: isExistUser.role,
//     };
//   } else {
//     // Always create new users as role USER
//     const user = await User.create({ appId, role, verified: true });
//     if (!user) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
//     }

//     const accessToken = jwtHelper.createToken(
//       { id: user._id, role: user.role },
//       config.jwt.jwt_secret as Secret,
//       config.jwt.jwt_expire_in as string
//     );

//     const refreshToken = jwtHelper.createToken(
//       { id: user._id, role: user.role },
//       config.jwt.jwtRefreshSecret as Secret,
//       config.jwt.jwtRefreshExpiresIn as string
//     );

//     return {
//       accessToken,
//       refreshToken,
//       isRegister: true,
//       isSubscribed: false,
//       userId: user._id.toString(),
//       name: user.name,
//       email: user.email,
//       role: user.role,
//     };
//   }
// };

const loginUserFromDB = async (payload: ILoginData) => {
  const { email, password, role } = payload; // Note: getting role here from client

  const isExistUser: any = await User.findOne({ email }).select('+password +role');
  
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!isExistUser.verified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please verify your account first!');
  }

  if (isExistUser.status === 'delete') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been deactivated.');
  }

  if (isExistUser.status === 'block') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account has been blocked.');
  }

  const isPasswordMatched = await User.isMatchPassword(password, isExistUser.password);
  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  // 🚨 Now very important role check
  if (role !== isExistUser.role) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Role mismatch! Your account role is ${isExistUser.role}, not ${role}`
    );
  }

  const createToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  return { createToken, role, user: isExistUser };
};

//forget password
const forgetPasswordToDB = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //send mail
  const otp = generateOTP();
  const value = {
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.resetPassword(value);
  emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

//verify email
const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;
  const isExistUser = await User.findOne({ email }).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!oneTimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give the otp, check your email we send a code'
    );
  }

  if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (date > isExistUser.authentication?.expireAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again'
    );
  }

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { oneTimeCode: null, expireAt: null } }
    );
    message = 'Email verify successfully';
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      }
    );

    //create token ;
    const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: createToken,
      expireAt: new Date(Date.now() + 5 * 60000),
    });
    message =
      'Verification Successful: Please securely store and utilize this code for reset password';
    data = createToken;
  }
  
  return { data, message };
};

//forget password
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  const { newPassword, confirmPassword } = payload;
  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication'
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'"
    );
  }

  //validity check
  const isValid = ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password'
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      
      "New password and Confirm password doesn't match!"
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData, {
    new: true,
  });
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (
    currentPassword &&
    isExistUser.password && !User.isMatchPassword(currentPassword, isExistUser.password)
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password'
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched"
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  socialLoginFromDB,
};
