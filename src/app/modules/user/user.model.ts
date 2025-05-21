import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema, Types } from 'mongoose';
import config from '../../../config';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { IUser, UserModal } from './user.interface';

const userSchema = new Schema<IUser, UserModal>(
  {
    _id: Types.ObjectId,
    service: {
      type: Schema.Types.ObjectId,
      ref: "Servicewc",
      select: 0
    },
    name: {
      type: String,
      required: false,
    },
    appId: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true, 
      lowercase: true,
    },
    contact: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: false,
      select: 0,
      minlength: 8,
    },
    location: {
      type: String,
      default: ""
    },
    profile: {
      type: String,
      default: 'https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2247726673.jpg',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      select: 0
    },
   isSubscribed: {
            type: Boolean,
            default: false
        },
    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },
 
    accountInformation: {
      status: {
        type: Boolean,
        default: false,
      },
      stripeAccountId: {
        type: String,
      },
      externalAccountId: {
        type: String,
      },
      currency: {
        type: String,
      }
    },
    stripeCustomerId: {
      type: String,
    },
  },

  { timestamps: true }
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id).select('+password +subscription +authentication');
  return JSON.parse(JSON.stringify(isExist));
};

//service exist
userSchema.statics.isServiceExist = async (id: string) => {
  const isExist = await User.findById(id).select('+service +category');
  return isExist;
}
userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

//account check
userSchema.statics.isAccountCreated = async (id: string) => {
  const isUserExist:any = await User.findById(id);
  return isUserExist.accountInformation.status;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  const existingUser = await User.findOne({ email: this.email });
  if (existingUser && existingUser._id.toString() !== this._id.toString()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
  }

  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds)
    );
  }
  next();
});


export const User = model<IUser, UserModal>('User', userSchema);
