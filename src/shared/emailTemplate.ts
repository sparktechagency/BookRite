import { ICreateAccount, IResetPassword } from '../types/emailTamplate';

const createAccount = (values: ICreateAccount) => {
  const data = {
    to: values.email,
    subject: 'Verify your account',
    html: `
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px; color: #555;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fff; border-radius: 15px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
          
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.postimg.cc/JzdQzfjq/Flx-Book-logo.png" alt="FlxBook Logo" style="width: 150px;" />
          </div>

          <!-- Greeting -->
          <h2 style="color: #3389d0; font-size: 26px; text-align: center; margin-bottom: 25px; font-weight: bold;">Hey, ${values.name}!</h2>

          <!-- Verification Instructions -->
          <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 20px;">Thank you for signing up for FlxBook. Please verify your email address to activate your account.</p>

          <!-- OTP Section -->
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">Your single use code is:</p>
            <div style="background-color: #33a4d0; color: #fff; font-size: 28px; padding: 12px; border-radius: 8px; letter-spacing: 2px; width: 120px; margin: 20px auto; font-weight: bold;">${values.otp}</div>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">This code is valid for 3 minutes.</p>
          </div>

          <!-- Footer -->
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you did not sign up for FlxBook, please ignore this email.</p>
          <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2024 FlxBook. All rights reserved.</p>

        </div>
      </body>
    `,
  };
  return data;
};

const resetPassword = (values: IResetPassword) => {
  const data = {
    to: values.email,
    subject: 'Reset your password',
    html: `
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px; color: #555;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fff; border-radius: 15px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
          
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.postimg.cc/JzdQzfjq/Flx-Book-logo.png" alt="FlxBook Logo" style="width: 150px;" />
          </div>

          <!-- OTP Section -->
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">Your password reset code is:</p>
            <div style="background-color: #277E16; color: #fff; font-size: 28px; padding: 12px; border-radius: 8px; letter-spacing: 2px; width: 120px; margin: 20px auto; font-weight: bold;">${values.otp}</div>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">This code is valid for 3 minutes.</p>
          </div>

          <!-- Footer -->
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you did not request a password reset, please ignore this email.</p>
          <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2024 FlxBook. All rights reserved.</p>

        </div>
      </body>
    `,
  };
  return data;
};

export const emailTemplate = {
  createAccount,
  resetPassword,
};
