
import { Model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";


export type IUser = {
  _id: Schema.Types.ObjectId;
  service: Schema.Types.ObjectId;
  save(): unknown;
  name: string;
  appId: string;
  gender?: string;
  role: USER_ROLES;
  contact: string;
  dateOfBirth: string;
  status?: 'active' | 'delete' | 'block';
  // googleId?: string;
  email: string;
  //inApp
  proActive?: boolean;
  subscriptionId?: string;
  proExpiresAt?: Date;
  password?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  company?: string;
  profile?: string;
  post?: Schema.Types.ObjectId;
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
  totalService: number;
  stripeCustomerId?: string;
  createdAt: Date;

  avatar?: string;
  lastLoginAt?: Date;


};
export type UserModal = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isAccountCreated(id: string): Promise<boolean>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
} & Model<IUser>;