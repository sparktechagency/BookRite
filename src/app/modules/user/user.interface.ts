// import { Model, Types } from 'mongoose';
// import { USER_ROLES } from '../../../enums/user';

// export type IUser = {
//   passwordHash: string;
  
//   name: string;
//   appId: string;
//   role: USER_ROLES;
//   contact: string;
//   dateOfBirth: string;
//   email: string;
//   password?: string;
//   location: string;
//   profile?: string;
//   post?: Types.ObjectId,
//   verified: boolean;
//   authentication?: {
//     isResetPassword: boolean;
//     oneTimeCode: number;
//     expireAt: Date;
//   };
//   accountInformation?: {
//     status: boolean;
//     stripeAccountId: string;
//     externalAccountId: string;
//     currency: string;
//   };
// };

// export type UserModal = {
//   isExistUserById(id: string): any;
//   isExistUserByEmail(email: string): any;
//   isAccountCreated(id: string): any;
//   isMatchPassword(password: string, hashPassword: string): boolean;
// } & Model<IUser>;

import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  service: Types.ObjectId;
  save(): unknown;
  name: string;
  appId: string;
  gender?: string;
  role: USER_ROLES;
  contact: string;
  dateOfBirth: string;
  email: string;
  password?: string;
    location?: {
        type: string;
        coordinates: number[];
    };
  profile?: string;
  post?: Types.ObjectId;
  verified: boolean;
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
 isSubscribed: boolean;
  accountInformation?: {
    status: boolean;
    stripeAccountId: string;
    externalAccountId: string;
    currency: string;
  };
  stripeCustomerId?: string;
  createdAt: Date;
};

export type UserModal = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isAccountCreated(id: string): Promise<boolean>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
} & Model<IUser>;
