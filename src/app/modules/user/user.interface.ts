
// import { Schema, Types, Model } from 'mongoose';
// import { USER_ROLES } from '../../../enums/user';

import { Model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";

// export type IUser = {
//   _id: Schema.Types.ObjectId; // Use Schema.Types.ObjectId
//   service: Schema.Types.ObjectId;
//   save(): unknown;
//   name: string;
//   appId: string;
//   gender?: string;
//   role: USER_ROLES;
//   contact: string;
//   dateOfBirth: string;
//   status?: 'active' | 'delete' | 'block';
//   googleId?: string;
//   email: string;
//   password?: string;
//   location?: {
//     type: string;
//     coordinates: number[];
//   };
  
//   company?: string;
//   profile?: string;
//   post?: Schema.Types.ObjectId;
//   verified: boolean;
//   authentication?: {
//     isResetPassword: boolean;
//     oneTimeCode: number;
//     expireAt: Date;
//   };
//   isSubscribed: boolean;
//   accountInformation?: {
//     status: boolean;
//     stripeAccountId: string;
//     externalAccountId: string;
//     currency: string;
//   };
//   totalService: number;
//   stripeCustomerId?: string;
//   createdAt: Date;
// };


// export type UserModal = {
//   isExistUserById(id: string): Promise<IUser | null>;
//   isExistUserByEmail(email: string): Promise<IUser | null>;
//   isAccountCreated(id: string): Promise<boolean>;
//   isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
// } & Model<IUser>;

// export type IPackage = {
//   _id: Schema.Types.ObjectId; // Use Schema.Types.ObjectId
//   title: string;
//   description: string[];
//   price: number;
//   priceId?: string;
//   duration: '1 month' | '3 months' | '6 months' | '1 year';
//   paymentType: 'Monthly' | 'Yearly';
//   productId: string;
//   credit: number;
//   paymentLink: string;
//   status: 'Active' | 'Delete';
//   createdAt: Date;
// };

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