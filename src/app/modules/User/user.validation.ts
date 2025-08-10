import { z } from 'zod'
export const signUpValidationSchema = z.object({
    firstName: z.string().nonempty('First name is required'),
    lastName: z.string().nonempty('Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    otpCode: z.string().nonempty('OTP code is required'),
    otpExpiresAt: z.instanceof(Date).optional(),
})
