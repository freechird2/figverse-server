import crypto from 'crypto'
import env from 'dotenv'
import { Request, Response, Router } from 'express'
import * as jwt from 'jsonwebtoken'
import { createAccessToken, createRefreshToken, secretKey } from 'lib/jwt'
import { loginChecker } from 'middleware/loginChecker'
import { refreshChecker } from 'middleware/refreshTokenChecker'
import { TokenModel } from 'model/common'
import { BadRequestError, ServerError, UnauthorizedError } from 'model/common/error'
import { LoginDataModel, LoginHeaderModel } from 'model/login/login'
import { UserModel } from 'model/user'
import { getAdminWithId, tryLogin } from 'sql/Auth'
import { LoginDataValidate, LoginHeaderValidate } from 'validate/login/login'

env.config()

const AuthRouter = Router()

AuthRouter.post('/login', async (req: Request, res: Response) => {
    let loginData: LoginDataModel = req.body

    try {
        await LoginDataValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    loginData.password = crypto.createHmac('sha256', process.env.CRYPTO_KEY).update(loginData.password).digest('hex')

    let user: UserModel = await tryLogin(loginData)

    const accessToken = await createAccessToken(user)
    const refreshToken = await createRefreshToken(user, loginData.isForever)

    if (!accessToken || !refreshToken) throw new ServerError('Generate Token Failed')

    const returnData = user
        ? {
              ...user,
              isForever: loginData.isForever,
              access: accessToken,
              refresh: refreshToken,
          }
        : null

    res.json({ code: 200, message: '로그인 성공', data: returnData })
})

AuthRouter.post('/ping', loginChecker, async (req: Request, res: Response) => {
    const loginData: LoginHeaderModel = {
        ...req.body,
        isForever: false,
    }

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const admin: UserModel = await getAdminWithId(loginData.userId)

    res.json({ code: 200, message: 'ping success', data: admin })
})

AuthRouter.post('/refresh', refreshChecker, async (req: Request, res: Response) => {
    const loginData: LoginHeaderModel = req.body

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const admin: UserModel = await getAdminWithId(loginData.userId)

    const accessToken = await createAccessToken(admin)
    const refreshToken = await createRefreshToken(admin, false)

    if (!accessToken || !refreshToken) throw new ServerError('Generate Token Failed')

    res.json({ code: 200, message: 'refresh success', data: { access: accessToken, refresh: refreshToken } })
})

AuthRouter.post('/verify-token', async (req: Request, res: Response) => {
    const token: TokenModel = req.body

    if (!token.access || !token.refresh) throw new UnauthorizedError('잘못된 token 정보입니다.')

    try {
        const data = jwt.verify(token.access, secretKey)
        const user = data as { userId: number }

        if (!user || !user.userId) throw new Error()

        const admin: UserModel = await getAdminWithId(user.userId)

        const accessToken = await createAccessToken(admin)
        const refreshToken = await createRefreshToken(admin, false)

        return res.json({ code: 200, message: 'verify token success', data: { access: accessToken, refresh: refreshToken } })
    } catch (error) {
        throw new UnauthorizedError('잘못된 token 정보입니다.')
    }
})

export default AuthRouter
