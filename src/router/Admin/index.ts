import { Router } from 'express'
import CommonRouter from './Common'
import PortFolioRouter from './Portfolio'

const AdminRouter = Router()

AdminRouter.use('/portfolio', PortFolioRouter)
AdminRouter.use('/common', CommonRouter)

export default AdminRouter
