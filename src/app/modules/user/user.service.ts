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
// import fetch from 'node-fetch';
import { geocodeAddress } from '../../../util/map';
import { Servicewc } from '../service/serviceswc.model';
const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  
  //set role
  payload.role;
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

// const getUserProfileFromDB = async (
//   user: JwtPayload
// ): Promise<Partial<IUser>> => {
//   const id = (user as any)._id || (user as any).id; 
//   const isExistUser: any = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   return isExistUser;
// };

const getUserProfileFromDB = async (
  user: JwtPayload
): Promise<Partial<IUser> & { totalServices?: number }> => {
  const id = (user as any)._id || (user as any).id;

  const isExistUser: any = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // Count services created by this user
  const totalServices = await Servicewc.countDocuments({ userId: id });

  return {
    ...isExistUser,
    totalServices
  };
};




// const updateProfileToDB = async (
//   user: JwtPayload,
//   payload: Partial<IUser>
// ): Promise<Partial<IUser | null>> => {
//   const { id } = user;
//   const isExistUser = await User.isExistUserById(id);
//   if (!isExistUser) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   // Remove old profile image if replaced
//   if (payload.profile && isExistUser.profile) {
//     unlinkFile(isExistUser.profile);
//   }

//   // If location is passed as string, geocode it
//   if (payload as any && typeof (payload as any).location === 'string') {
//     const address = (payload as any).location;
//     const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
//     const geoData = await geoRes.json();

//     if (geoData.length > 0) {
//       const { lat, lon } = geoData[0];
//       payload.location = {
//         type: "Point",
//         coordinates: [parseFloat(lon), parseFloat(lat)]
//       };
//     } else {
//       throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid location provided");
//     }
//   }

//   const updatedDoc = await User.findOneAndUpdate({ _id: id }, payload, {
//     new: true,
//   });

//   return updatedDoc;
// };

export const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // Remove old profile image if replaced
  if (payload.profile && isExistUser.profile) {
    unlinkFile(isExistUser.profile);
  }

  // If location is a string, convert it via Google Maps API
  if (payload.location && typeof payload.location === 'string') {
    try {
      const [lng, lat] = await geocodeAddress(payload.location);

      payload.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    } catch (err) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid address: failed to geocode");
    }
  }

  const updatedDoc = await User.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return updatedDoc;
};

const resendOtp = async (email: string): Promise<{ email: string }> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Generate new OTP
  const otp = generateOTP();

  // Send email with new OTP
  const values = {
    name: user.name,  
    otp: otp,
    email: user.email!,
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  await emailHelper.sendEmail(createAccountTemplate);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };

  await User.findOneAndUpdate(
    { _id: user._id },
    { $set: { authentication } }
  );

  // Return only email as requested
  return { email: user.email };
};

 const updateUserLocation = async (
  userId: string,
  longitude: number,
  latitude: number,
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.location = {
    type: "Point",
    coordinates: [longitude, latitude],
  };
  await user.save();
  return user;
};

 const getUsersWithLocationAccess = async () => {
  const users = await User.find(
    { location: { $exists: true, $ne: null } },
    { name: 1, email: 1, location: 1 } // Select only necessary fields
  );
  return users;
};

const getNearbyUsers = async (userId: string) => {
  const currentUser = await User.findById(userId).select('location');

  if (!currentUser || !currentUser.location || !currentUser.location.coordinates) {
    throw new Error('User location not found');
  }

  const [longitude, latitude] = currentUser.location.coordinates;

  const nearbyUsers = await User.find({
    _id: { $ne: userId }, // exclude current user
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: 5000, // 5km = 5000 meters
      },
    },
  }).select('name profile');

  return nearbyUsers;
};

const deleteUserFromDB = async (user: JwtPayload, password: string) => {

    const isExistUser = await User.findById(user.id).select('+password');
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    if (typeof isExistUser.password !== 'string') {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User password is not set!");
    }
    if (password && !(await User.isMatchPassword(password, isExistUser.password))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
    }

    const updateUser = await User.findByIdAndDelete(user.id);
    if (!updateUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    return;
};

// Service function
const deleteUserByEmailAndPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  if (typeof user.password !== 'string') {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User password is not set!");
  }
  const isPasswordCorrect = await User.isMatchPassword(password, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  await User.findByIdAndDelete(user._id);
  return;
};


 export const UserService = {
  createUserToDB,
  getUserById,
  getUserProfileFromDB,
  updateProfileToDB,
  createAdminToDB,
  createSuperAdminToDB,
  resendOtp,
  updateUserLocation,
  getUsersWithLocationAccess,
  getNearbyUsers,
  deleteUserFromDB,
  deleteUserByEmailAndPassword
};
