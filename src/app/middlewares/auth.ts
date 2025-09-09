import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: any;
        _id: string;
        role: string;
        email: string;
      };
    }
  }
}

const auth = (...roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenWithBearer = req.headers.authorization;

    if (!tokenWithBearer) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }

    if (!tokenWithBearer.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid authorization header format');
    }

    const token = tokenWithBearer.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'JWT secret key not found');
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (err: any) {
      if (err instanceof TokenExpiredError) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token expired, please login again');
      }
      if (err instanceof JsonWebTokenError) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
      }
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token verification failed');
    }

    // Assign user info on req.user
    req.user = {
      id: decoded.id,
      _id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    console.log('Authenticated User:', req.user);

    // Role-based access check
    if (roles.length && !roles.includes(decoded.role)) {
      throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this API");
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default auth;

// declare global {
//   namespace Express {
//     interface Request {
//       user: {
//         id: any;
//         _id: string;
//         role: string;
//         email: string;
//       };
//     }
//   }
// }

// const auth = (...roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const tokenWithBearer = req.headers.authorization;

//     if (!tokenWithBearer) {
//       throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
//     }

//     if (!tokenWithBearer.startsWith('Bearer ')) {
//       throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid authorization header format');
//     }

//     const token = tokenWithBearer.split(' ')[1];

//     if (!process.env.JWT_SECRET) {
//       throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'JWT secret key not found');
//     }

//     const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

//     // Assign user info on req.user
//     req.user = {
//       id: decoded.id,
//       _id: decoded.id,
//       role: decoded.role,
//       email: decoded.email,
//     };

//     console.log('Authenticated User:', req.user);

//     // Role-based access check
//     if (roles.length && !roles.includes(decoded.role)) {
//       throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this API");
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// export default auth;
