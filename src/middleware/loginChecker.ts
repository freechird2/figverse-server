import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { secretKey } from 'lib/jwt'
import { UnauthorizedError } from 'model/common/error'

export const loginChecker = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]

        try {
            const data: string | jwt.JwtPayload = jwt.verify(token, secretKey)

            if (data['idx']) {
                req.query.userId = data['idx']
                req.body.userId = data['idx']
            }

            next()
        } catch (error) {
            if (error instanceof UnauthorizedError) throw new UnauthorizedError(error.message)
            else throw new jwt.JsonWebTokenError(error.message === 'jwt expired' ? 'jwt expired' : 'invalid token')
        }
    } else {
        throw new UnauthorizedError('로그인이 필요합니다.')
    }
}
