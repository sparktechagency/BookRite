import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';



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
const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;

      if (!tokenWithBearer) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }

      if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
        const token = tokenWithBearer.split(' ')[1];

        // Ensure that the secret key is loaded
        if (!process.env.JWT_SECRET) {
          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'JWT secret key not found');
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

        // Ensure that req.user is populated correctly
        req.user = {
          _id: decoded.id,  // Explicitly assigning the decoded id field
          role: decoded.role,
          email: decoded.email,
        };

        console.log('Authenticated User:', req.user);

        // Check for role-based access control
        if (roles.length && !roles.includes(decoded.role)) {
          throw new ApiError(StatusCodes.FORBIDDEN, "You don't have permission to access this API");
        }

        next();
      }
    } catch (error) {
      next(error);
    }
  };


export default auth;


