import { Request, Response, Router } from 'express'
import Joi from 'joi'
import { BadRequestError } from 'model/common/error'
import { PortfolioFilterModel } from 'model/portfolio'
import { getDetailPrevNextIds, getPortfolioDetail, getPortfolioList, getTypicalPortfolioList } from 'sql/Common/Portfolio'
import { getCategories, getClient } from 'sql/Common/common'
import { PortfolioFilterValidate } from 'validate/portfolio'

const UserPortfolioRouter = Router()

UserPortfolioRouter.get('/typical', async (req: Request, res: Response) => {
    res.json({
        code: 200,
        message: '포트폴리오를 불러오는데 성공했습니다.',
        data: await getTypicalPortfolioList(),
    })
})

UserPortfolioRouter.get('/', async (req: Request, res: Response) => {
    const filter: PortfolioFilterModel = {
        ...req.query,
        word: req.query.word ? String(req.query.word).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : undefined,
        page: req.query.page || 1,
        per: req.query.per || 9999,
        isPublished: 'Y',
        isUser: true,
    } as unknown as PortfolioFilterModel

    try {
        await PortfolioFilterValidate.validateAsync(filter)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    res.json({
        code: 200,
        message: '포트폴리오를 불러오는데 성공했습니다.',
        data: await getPortfolioList(filter),
    })
})

UserPortfolioRouter.get('/client', async (req: Request, res: Response) => {
    const list = await getClient()

    res.json({
        code: 200,
        message: '클라이언트를 불러오는데 성공했습니다.',
        data: list && list.length > 0 ? list.map((l) => ({ value: l.id, name: l.name })) : [],
    })
})

UserPortfolioRouter.get('/category', async (req: Request, res: Response) => {
    const list = await getCategories()

    res.json({
        code: 200,
        message: '카테고리를 불러오는데 성공했습니다.',
        data: list && list.length > 0 ? list.map((l) => ({ value: l.id, name: l.name })) : [],
    })
})

UserPortfolioRouter.get('/:id', async (req: Request, res: Response) => {
    const id = req.params.id
    const filter = { ...req.query } as unknown as PortfolioFilterModel
    console.log(id, filter)

    try {
        await Joi.number().integer().min(1).required().error(new Error('잘못된 접근입니다.')).validateAsync(id)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const data = {
        detail: await getPortfolioDetail(Number(id)),
        ids: await getDetailPrevNextIds(filter),
    }
    console.log(data)
    res.json({
        code: 200,
        message: '포트폴리오를 불러오는데 성공했습니다.',
        data: data,
    })
})

export default UserPortfolioRouter
