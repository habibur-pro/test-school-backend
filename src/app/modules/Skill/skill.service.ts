import ApiError from '../../helpers/ApiErrot'
import Skill from './skill.model'
import httpStatus from 'http-status'

const addSkill = async (payload: { name: string; progress: number }) => {
    try {
        const isExist = await Skill.findOne({ name: payload.name })
        if (isExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'already exist')
        }
        const skill = await Skill.create(payload)
        return { message: 'skill added', data: skill }
    } catch (error) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            (error as Error)?.message || 'something went wrong'
        )
    }
}

const skillServices = { addSkill }
export default skillServices
