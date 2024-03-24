import { BadRequestError, ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import { LoginDataModel } from 'model/login/login'
import db from '../../database'

export const tryLogin = async (data: LoginDataModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT 
                                    id, name, email
                                FROM admin
                                WHERE email = '${data.email}'
                                AND password = '${data.password}'
                                AND is_deleted = 'N'
                            `
        console.log(query)
        const [[res]] = await conn.query(query)

        if (!res || !res.id) throw new UnauthorizedError('일치하는 정보를 찾을 수 없습니다.')

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/auth/tryLogin] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAdminWithId = async (id: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    u.userId AS id, u.email, u.name
                                FROM project_access_permission AS pap
                                    LEFT JOIN (
                                        SELECT
                                            id AS userId, email, name
                                        FROM user
                                    ) AS u
                                    ON pap.user_id = u.userId
                                WHERE user_id = ${id}
                                AND project_id = ${process.env.PROJECT_ID}
                            `
        const [[res]] = await conn.query(query)

        if (!res || !res.id) throw new UnauthorizedError('로그인 정보가 없습니다.')

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/auth/getAdminWithId] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
