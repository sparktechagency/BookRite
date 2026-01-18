import jwt, { JwtPayload, Secret, TokenExpiredError } from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// Create a new JWT token
const createToken = (payload: object, secret: Secret, expireTime: string) => {
  return jwt.sign(payload, secret, { expiresIn: expireTime });
};

// Verify the JWT token and handle expiration
const verifyToken = (token: string, secret: Secret) => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // If the token is expired, throw a custom error message
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Your session has expired. Please log in again.'
      );
    }
    // If the token is invalid for any other reason, throw a general error
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token.');
  }
};

export const jwtHelper = { createToken, verifyToken };
