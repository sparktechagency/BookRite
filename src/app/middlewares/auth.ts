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

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

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


// const auth =
//   (...roles: string[]) =>
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const tokenWithBearer = req.headers.authorization;

//       if (!tokenWithBearer) {
//         throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
//       }

//       if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
//         const token = tokenWithBearer.split(' ')[1];

//         // Ensure that the secret key is loaded
//         if (!process.env.JWT_SECRET) {
//           throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'JWT secret key not found');
//         }

//         const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
//         req.user = decoded;

//         if (roles.length && !roles.includes(decoded.role)) {
//           throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this api");
//         }

//         next();
//       }
//     } catch (error) {
//       next(error);
//     }
//   };

// const auth =
//   (...roles: string[]) =>
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const tokenWithBearer = req.headers.authorization;

//       if (!tokenWithBearer) {
//         throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
//       }

//       if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
//         const token = tokenWithBearer.split(' ')[1];

//         // Ensure that the secret key is loaded
//         if (!process.env.JWT_SECRET) {
//           throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'JWT secret key not found');
//         }

//         const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

//         // Ensure that req.user is populated correctly
//         req.user = {
//           _id: decoded.id,  // Explicitly assigning the decoded id field
//           role: decoded.role,
//           email: decoded.email,
//         };

//         console.log('Authenticated User:', req.user);

//         // Check for role-based access control
//         if (roles.length && !roles.includes(decoded.role)) {
//           throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this API");
//         }

//         next();
//       }
//     } catch (error) {
//       next(error);
//     }
//   };





