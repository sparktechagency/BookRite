import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../util/generateOTP';
import { IUser } from './user.interface';
import { User } from './user.model';
import bcrypt from 'bcrypt';
import cron from 'node-cron';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  
  //set role
  payload.role = USER_ROLES.USER;
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } }
  );

  return createUser;
};
//getUserById
export const getUserById = async (id: string): Promise<IUser | null> => {
  console.log("Fetching user by ID:", id);  

  try {
    const user = await User.findById(id);
    if (!user) {
      console.error(`User with ID ${id} not found`);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
    }
    return user;
  } catch (error) {
    console.error("Error fetching user by ID:", error);  
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error fetching user');
  }
};

const createAdminToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const createAdmin = await User.create(payload);
  if (!createAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
  }
  if(createAdmin){
    await User.findByIdAndUpdate({_id: createAdmin?._id}, {verified: true}, {new: true});
  }
  return createAdmin;
};

//create super admin
const createSuperAdminToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  
  //set role
  payload.role = USER_ROLES.SUPER_ADMIN;
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } }
  );

  return createUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload
): Promise<Partial<IUser>> => {
  const id = (user as any)._id || (user as any).id; 
  const isExistUser: any = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};


const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.profile) {
    if (isExistUser.profile) {
      unlinkFile(isExistUser.profile);
    }
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};


 export const UserService = {
  createUserToDB,
  getUserById,
  getUserProfileFromDB,
  updateProfileToDB,
  createAdminToDB,
  createSuperAdminToDB
};
