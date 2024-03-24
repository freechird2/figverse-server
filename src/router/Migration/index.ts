import env from 'dotenv'
import { Request, Response, Router } from 'express'
import { migrationFigverseOld, migrationTheFig } from 'sql/Migration'

env.config()

const MigrationRouter = Router()

MigrationRouter.post('/the-fig', async (req: Request, res: Response) => {
    const list = await migrationTheFig()
    res.json({ code: 200, message: '로그인 성공', data: list })
})

MigrationRouter.post('/figverse-old', async (req: Request, res: Response) => {
    const list = await migrationFigverseOld()
    res.json({ code: 200, message: '로그인 성공', data: list })
})

export default MigrationRouter
