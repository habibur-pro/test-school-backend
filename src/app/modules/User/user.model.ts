import { Document, Model, model, Schema } from 'mongoose'
import { IUser } from './user.interface'
import { UserRole } from '../../enum'
import idGenerator from '../../helpers/idGenerator'
const UserSchema = new Schema<IUser>(
    {
        id: {
            type: String,
            required: [true, 'User ID is required'],
            unique: true,
        },
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            required: [true, 'User role is required'],
            default: UserRole.STUDENT,
        },
        isEmailVerified: {
            type: Boolean,
            required: [true, 'Email verification status is required'],
            default: false,
        },
        otpCode: {
            type: String,
            required: [true, 'OTP code is required'],
        },
        otpExpiresAt: {
            type: Date,
            required: [true, 'OTP expiry date is required'],
        },
    },
    {
        timestamps: true,
    }
)
UserSchema.pre<IUser>('validate', async function (next) {
    if (!this.id) {
        this.id = await idGenerator(this.constructor as Model<Document & IUser>)
    }
    next()
})
const User = model<IUser>('User', UserSchema)
export default User
