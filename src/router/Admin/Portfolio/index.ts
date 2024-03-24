import env from 'dotenv'
import { Request, Response, Router } from 'express'
import Joi from 'joi'
import { fileUploader, uploadWrapper } from 'middleware/multerUploader'
import { BadRequestError } from 'model/common/error'
import { PortfolioDataModel, PortfolioFilterModel } from 'model/portfolio'
import { deletePortfolio, getTypicalPortfolio, insertPortfolio, registTypicalPortfolio } from 'sql/Admin/Portfolio'
import { createPortfolioKeyword, getPortfolioDetail, getPortfolioList } from 'sql/Common/Portfolio'
import { PortfolioDataValidate, PortfolioFilterValidate } from 'validate/portfolio'

env.config()

const PortFolioRouter = Router()

const multipleMulter = fileUploader.fields([{ name: 'images' }, { name: 'thumbnail', maxCount: 1 }])

PortFolioRouter.get('/', async (req: Request, res: Response) => {
    const filter: PortfolioFilterModel = {
        ...req.query,
        word: req.query.word ? String(req.query.word).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : undefined,
        page: req.query.page || 1,
        per: req.query.per || 10,
    } as unknown as PortfolioFilterModel

    try {
        await PortfolioFilterValidate.validateAsync(filter)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const list = await getPortfolioList(filter)

    res.json({
        code: 200,
        message: '포트폴리오 목록을 불러왔습니다.',
        data: list,
    })
})

PortFolioRouter.get('/detail/:id', async (req: Request, res: Response) => {
    const id = req.params.id

    try {
        await Joi.number().required().min(1).error(new Error()).validateAsync(id)
    } catch (err) {
        throw new BadRequestError('id를 확인해주세요.')
    }

    const pf = await getPortfolioDetail(Number(id))

    res.json({ code: 200, message: '포트폴리오를 불러왔습니다.', data: pf })
})

PortFolioRouter.post('/temp', uploadWrapper.multipleFileUploader(multipleMulter), async (req: Request, res: Response) => {
    let data: PortfolioDataModel = {
        ...req.body,
        category: req.body.category ? JSON.parse(req.body.category) : [],
        tag: req.body.tag ? JSON.parse(req.body.tag) : [],
        keyword: req.body.keyword ? JSON.parse(req.body.keyword) : [],
        link: req.body.link ? JSON.parse(req.body.link) : [],
        thumbnail:
            req.body.files && req.body.files.thumbnail ? req.body.files.thumbnail[0] : req.body.thumbnail ? req.body.thumbnail : undefined,
        imageIds: req.body.imageIds ? JSON.parse(req.body.imageIds) : [],
        // images: req.body.files && req.body.files.images ? req.body.files.images : undefined,
        register: req.body.userId,
    }

    if (data.imageIds && data.imageIds.length > 0) {
        let cur = 0

        data.imageIds = data.imageIds.map((img, i) => {
            return img === -1 ? req.body.files.images[cur++] : img
        })
    }

    try {
        if (!data) throw new Error('porffolio data is null')
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const insertId = await insertPortfolio(data)

    res.json({
        code: 200,
        message: '임시 저장이 완료되었습니다.',
        data: { id: insertId },
    })
})

PortFolioRouter.post('/', uploadWrapper.multipleFileUploader(multipleMulter), async (req: Request, res: Response) => {
    let data: PortfolioDataModel = {
        ...req.body,
        category: req.body.category ? JSON.parse(req.body.category) : [],
        tag: req.body.tag ? JSON.parse(req.body.tag) : [],
        link: req.body.link ? JSON.parse(req.body.link) : [],
        keyword: req.body.keyword ? JSON.parse(req.body.keyword) : [],
        thumbnail:
            req.body.files && req.body.files.thumbnail ? req.body.files.thumbnail[0] : req.body.thumbnail ? req.body.thumbnail : undefined,
        imageIds: req.body.imageIds ? JSON.parse(req.body.imageIds) : [],
        register: req.body.userId,
    }
    if (data.imageIds && data.imageIds.length > 0) {
        let cur = 0

        data.imageIds = data.imageIds.map((img, i) => {
            return img === -1 ? req.body.files.images[cur++] : img
        })
    }

    try {
        if (!data) throw new Error('portfolio data is null')

        await PortfolioDataValidate.tailor('regist').validateAsync(data)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const insertId = await insertPortfolio(data)

    res.json({
        code: 200,
        message: '포트폴리오를 저장했습니다.',
        data: { id: insertId },
    })
})

PortFolioRouter.put('/', uploadWrapper.multipleFileUploader(multipleMulter), async (req: Request, res: Response) => {
    let data: PortfolioDataModel = {
        ...req.body,
        category: req.body.category ? JSON.parse(req.body.category) : [],
        tag: req.body.tag ? JSON.parse(req.body.tag) : [],
        link: req.body.link ? JSON.parse(req.body.link) : [],
        keyword: req.body.keyword ? JSON.parse(req.body.keyword) : [],
        thumbnail:
            req.body.files && req.body.files.thumbnail ? req.body.files.thumbnail[0] : req.body.thumbnail ? req.body.thumbnail : undefined,
        imageIds: req.body.imageIds ? JSON.parse(req.body.imageIds) : [],
        register: req.body.userId,
    }

    if (data.imageIds && data.imageIds.length > 0) {
        let cur = 0

        data.imageIds = data.imageIds.map((img, i) => {
            return img === -1 ? req.body.files.images[cur++] : img
        })
    }

    try {
        if (!data) throw new Error('porffolio data is null')

        await PortfolioDataValidate.tailor('update').validateAsync(data)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    // if (data.imageIds && data.imageIds.length > 0) {
    //     let index = 0

    //     data.updateImages.map((u, i) => {
    //         if (u === 'new') {
    //             data.updateImages[i] = data.imageIds[index++]
    //         }
    //     })
    // }

    // data.imageIds = data.updateImages as number[]

    const id = await insertPortfolio(data)

    res.json({
        code: 200,
        message: '포트폴리오를 수정했습니다.',
        data: { id: 1 },
    })
})

PortFolioRouter.delete('/:id', async (req: Request, res: Response) => {
    const id = req.params.id

    try {
        await Joi.number().required().min(1).error(new Error()).validateAsync(id)
    } catch (err) {
        throw new BadRequestError('id를 확인해주세요.')
    }

    await deletePortfolio(Number(id))

    res.json({ code: 200, message: '포트폴리오를 삭제했습니다.', data: null })
})

PortFolioRouter.post('/typical', async (req: Request, res: Response) => {
    const ids = req.body.ids

    try {
        await Joi.array().items(Joi.number()).min(1).max(10).required().error(new Error()).validateAsync(ids)
    } catch (err) {
        throw new BadRequestError('대표 프로젝트를 확인해주세요.')
    }

    await registTypicalPortfolio(ids)

    res.json({
        code: 200,
        message: '대표 포트폴리오를 등록했습니다.',
        data: null,
    })
})

PortFolioRouter.get('/typical', async (req: Request, res: Response) => {
    const list = await getTypicalPortfolio()

    res.json({
        code: 200,
        message: '대표 포트폴리오를 불러왔습니다.',
        data: list,
    })
})

PortFolioRouter.put('/keyword', async (req: Request, res: Response) => {
    const data = req.body

    try {
        await Joi.object({
            id: Joi.number().integer().error(new Error('포트폴리오 아이디를 확인해주세요.')),
            keyword: Joi.string().required().error(new Error('키워드를 확인해주세요.')),
        })
            .unknown()
            .validateAsync(data)
    } catch (err) {
        throw new BadRequestError(err.message)
    }
    await createPortfolioKeyword(data)

    res.json({
        code: 200,
        message: '키워드 생성을 성공했습니다.',
        data: null,
    })
})

export default PortFolioRouter
