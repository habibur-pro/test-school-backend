import ApiError from '../../helpers/ApiErrot'
import httpStatus from 'http-status'
import { getErrorMessage } from '../../utils/getErrorMessage'
import { IUser } from '../User/user.interface'
import User from '../User/user.model'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config from '../../config'
import { signUpValidationSchema } from '../User/user.validation'
import { mailSender } from '../../utils/mailSender'
import AuthUtils from './auth.utils'
const refreshTokensDB: string[] = []
function generateAccessToken(user: any) {
    return jwt.sign(user, config.access_token_secret, { expiresIn: '15m' })
}

function generateRefreshToken(user: any) {
    const token = jwt.sign(user, config.refresh_token_secret, {
        expiresIn: '7d',
    })
    refreshTokensDB.push(token)
    return token
}

const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

const getOTPExpiration = (): Date => {
    return new Date(Date.now() + 3 * 60 * 1000) // 3 minutes in ms
}

const sendOtpEmail = async (name: string, otp: string, email: string) => {
    const content = AuthUtils.generateOtpHtml(name, otp)
    await mailSender({
        to: email,
        subject: 'Email validation email from test school',
        html: content,
    })
}

const signup = async (payload: Partial<IUser>) => {
    try {
        const isExist = await User.findOne({ email: payload.email })
        if (isExist)
            throw new ApiError(httpStatus.CONFLICT, 'email already exist')
        if (!payload.password) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required')
        }
        // hash password
        const hashedPassword = await bcrypt.hash(payload.password, 10)
        payload.password = hashedPassword

        const otpCode = generateOTP()
        const otpExpiration = getOTPExpiration()
        payload.otpCode = otpCode
        payload.otpExpiresAt = otpExpiration
        signUpValidationSchema.parse(payload)
        await User.create(payload)
        await sendOtpEmail(
            payload?.firstName as string,
            otpCode,
            payload?.email as string
        )

        return { message: 'success' }
    } catch (error) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            getErrorMessage(error) || 'something went wrong'
        )
    }
}

const signin = async (payload: { email: string; password: string }) => {
    if (!payload?.email || !payload?.password) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            'email, password is required'
        )
    }

    const user = await User.findOne({ email: payload.email })
    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'user not found')
    }
    const isMatched = await bcrypt.compare(payload.password, user.password)
    if (!isMatched) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'wrong email or password')
    }

    const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
    })
    const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
    })

    const responseData = {
        accessToken,
        refreshToken,
        userId: user.id,
        email: user.email,
        name: `${user?.firstName} ${user?.lastName}`,
    }
    return responseData
}
const verifySignin = async (payload: { email: string; password: string }) => {
    if (!payload?.email || !payload?.password) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            'email and password is required'
        )
    }

    const user = await User.findOne({ email: payload.email })
    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'user not found')
    }
    const isMatched = await bcrypt.compare(payload.password, user.password)
    if (!isMatched) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'wrong email or password')
    }
    if (!user.isEmailVerified) {
        const otpCode = generateOTP()
        const otpExpiration = getOTPExpiration()
        user.otpCode = otpCode
        user.otpExpiresAt = otpExpiration
        await user.save()
        await sendOtpEmail(
            user?.firstName as string,
            otpCode,
            user?.email as string
        )
        throw new ApiError(
            httpStatus.FORBIDDEN,
            'your emil is not verified, verify your email first'
        )
    }
    return { role: user.role }
}

const verifyOtp = async (payload: { otp: string }) => {
    if (!payload?.otp) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'please provide otp')
    }
    const user = await User.findOne({ otpCode: payload?.otp })
    if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'unauthorize user')
    }
    // Check if OTP expired (assuming you have otpExpires field as Date)
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP has expired')
    }

    await User.findOneAndUpdate(
        { otpCode: payload?.otp },
        { isEmailVerified: true },
        { new: true }
    )
    return { message: 'success' }
}

const resendOtp = async (email: string) => {
    try {
        const user = await User.findOne({ email })
        if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'user not found')
        const otpCode = generateOTP()
        const otpExpiration = getOTPExpiration()
        await sendOtpEmail(
            user?.firstName as string,
            otpCode,
            user?.email as string
        )
        await User.findOneAndUpdate(
            { id: user.id },
            { otpCode, otpExpiresAt: otpExpiration },
            { new: true }
        )
        return { message: 'sent' }
    } catch (error) {}
}

// app.post('/refresh', (req, res) => {
//     const { refreshToken } = req.body
//     if (!refreshToken || !refreshTokensDB.includes(refreshToken)) {
//         return res.sendStatus(403)
//     }

//     jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403)
//         const accessToken = generateAccessToken({
//             id: user.id,
//             email: user.email,
//         })
//         res.json({ accessToken })
//     })
// })

export async function refreshToken(payload: {
    refreshToken?: string
}): Promise<{ accessToken: string }> {
    const { refreshToken } = payload

    if (!refreshToken || !refreshTokensDB.includes(refreshToken)) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized access')
    }

    try {
        // Verify refresh token and extract user payload
        const user = jwt.verify(refreshToken, config.refresh_token_secret) as {
            id: string
            email: string
            role: string
        }

        // Generate new access token
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role,
        })

        return { accessToken }
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token')
    }
}

const AuthServices = {
    signup,
    signin,
    verifyOtp,
    verifySignin,
    resendOtp,
    refreshToken,
}
export default AuthServices
