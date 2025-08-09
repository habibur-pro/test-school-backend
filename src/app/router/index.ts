import { Router } from 'express'
import skillRoutes from '../modules/Skill/skill.router'

const router = Router()
const routes = [
    {
        path: '/skills',
        route: skillRoutes,
    },
]

routes.map((route) => router.use(route.path, route.route))

export default router
