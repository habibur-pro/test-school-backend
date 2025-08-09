import { Router } from 'express'
import skillControls from './skill.controller'

const router = Router()
router.post('/add', skillControls.addSkill)
const skillRoutes = router
export default skillRoutes
