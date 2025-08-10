import { UserRole } from '../../enum'

export interface IUser {
    id: string
    firstName: string
    lastName: string
    email: string
    password: string
    role: UserRole
    isEmailVerified: boolean
    otpCode: string
    otpExpiresAt: Date
    createdAt: Date
    updatedAt: Date
}
