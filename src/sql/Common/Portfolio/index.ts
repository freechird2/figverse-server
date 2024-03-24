import { attachOffsetLimit } from 'function/shared'
import { BadRequestError, ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import { PortfolioFilterModel } from 'model/portfolio'
import db from '../../../database'

export const getPortfolioList = async (filter: PortfolioFilterModel) => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [typical] = await conn.query(`SELECT p_id FROM typical_portfolio ORDER BY sequence ASC`)

        const commonJoinQuery = `LEFT JOIN (
                                    SELECT
                                        id AS a_id, name
                                    FROM admin
                                ) AS a 
                                ON pf.register = a.a_id
                                
                                LEFT JOIN (
                                    SELECT
                                        pf_id, c_id, GROUP_CONCAT(cg.name separator ', ') AS categories, GROUP_CONCAT(c_id) AS category_ids
                                    FROM category_portfolio_relation AS c_cpr
                                        LEFT JOIN (
                                            SELECT
                                                id AS cg_id, name
                                            FROM category
                                        ) AS cg
                                        ON c_cpr.c_id = cg.cg_id
                                    GROUP BY c_cpr.pf_id
                                ) AS cpr
                                ON pf.id = cpr.pf_id
                                
                                LEFT JOIN (
                                    SELECT
                                        id As c_id, name 
                                    FROM client
                                ) AS c
                                ON pf.client_id = c.c_id

                                ${
                                    filter.isUser
                                        ? `
                                    LEFT JOIN (
                                        SELECT
                                            id AS th_id, transed_name AS thumbnailUrl
                                        FROM figverse_file
                                    ) AS thumb
                                    ON pf.thumbnail_id = thumb.th_id

                                    LEFT JOIN (
                                        SELECT
                                            p_id AS tp_id
                                        FROM typical_portfolio
                                    ) AS tp
                                    ON pf.id = tp.tp_id
                                `
                                        : ``
                                }
                                `

        const commonWhere = `
                                ${filter.cId ? `AND FIND_IN_SET(${filter.cId}, cpr.category_ids) ` : ``}
                                ${filter.cId ? `AND cpr.category_ids IN (${filter.cId}) ` : ``}
                                ${
                                    filter.word
                                        ? `AND (pf.title LIKE '%${filter.word}%' OR c.name LIKE '%${filter.word}%' OR cpr.categories LIKE '%${filter.word}%' OR pf.keyword LIKE '%${filter.word}%')`
                                        : ``
                                }
                                ${filter.isPublished ? `AND pf.is_published = '${filter.isPublished}'` : ``}
                                ${filter.year ? `AND pf.year = '${filter.year}'` : ``}
                                ${filter.client ? `AND pf.client_id = ${filter.client}` : ``}
                            `

        const totalQuery = /* sql */ `SELECT
                                        COUNT(id) AS total
                                    FROM portfolio AS pf
                                        ${commonJoinQuery}
                                    
                                    WHERE is_deleted = 'N'
                                    ${commonWhere}
                                    `
        const [[total]] = await conn.query(totalQuery)

        const query = /* sql */ `SELECT
                                id, is_published AS isPublished, title, 
                                IFNULL(cpr.categories, '') AS categories, c.name AS client,  a.name AS adminName, 
                                CONCAT(pf.year, '. ', pf.month) AS workPeriod,
                                DATE_FORMAT(pf.registered_at, '%Y-%m-%d %H:%i') AS registeredAt
                                ${
                                    filter.isUser
                                        ? `, pf.year, pf.month, thumb.thumbnailUrl, IF(tp.tp_id IS NULL, 'N', 'Y') AS isTypical`
                                        : ``
                                }
                            FROM portfolio AS pf
                                ${commonJoinQuery}
                            
                            WHERE is_deleted = 'N'
                            ${commonWhere}
                            ${
                                filter.isUser
                                    ? `
                                        ORDER BY
                                            ${
                                                typical.length > 0
                                                    ? `
                                                            CASE
                                                                ${typical.map((t, i) => ` WHEN id = ${t.p_id} THEN ${i + 1}`).join(' ')}
                                                                ELSE ${typical.length + 1}
                                                            END,
                                            `
                                                    : ''
                                            }
                                        pf.year DESC, pf.month DESC
                                    `
                                    : `
                                        ORDER BY 
                                            CASE
                                                WHEN pf.is_published = 'W' THEN 1
                                                ELSE 2
                                            END,
                                        pf.registered_at DESC
                                    `
                            }
                            ${!filter.isUser ? attachOffsetLimit(filter.page, filter.per) : ''}
                        `

        const [list] = await conn.query(query)

        return { total: total.total, list }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/portfolio/getPortfolioList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getTypicalPortfolioList = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [typical] = await conn.query(`SELECT p_id FROM typical_portfolio ORDER BY sequence ASC`)

        const commonJoinQuery = `LEFT JOIN (
                                    SELECT
                                        id AS a_id, name
                                    FROM admin
                                ) AS a
                                ON pf.register = a.a_id

                                LEFT JOIN (
                                    SELECT
                                        pf_id, c_id, GROUP_CONCAT(cg.name separator ', ') AS categories, GROUP_CONCAT(c_id) AS category_ids
                                    FROM category_portfolio_relation AS c_cpr
                                        LEFT JOIN (
                                            SELECT
                                                id AS cg_id, name
                                            FROM category
                                        ) AS cg
                                        ON c_cpr.c_id = cg.cg_id
                                    GROUP BY c_cpr.pf_id
                                ) AS cpr
                                ON pf.id = cpr.pf_id

                                LEFT JOIN (
                                    SELECT
                                        id As c_id, name
                                    FROM client
                                ) AS c
                                ON pf.client_id = c.c_id

                                LEFT JOIN (
                                    SELECT
                                        id AS th_id, transed_name AS thumbnailUrl
                                    FROM figverse_file
                                ) AS thumb
                                ON pf.thumbnail_id = thumb.th_id

                                LEFT JOIN (
                                    SELECT
                                        p_id AS tp_id
                                    FROM typical_portfolio
                                ) AS tp
                                ON pf.id = tp.tp_id

                                `

        const commonWhere = `
                            AND is_published = 'Y'
                            `

        const query = /* sql */ `SELECT
                                id, is_published AS isPublished, title,
                                IFNULL(cpr.categories, '') AS categories, c.name AS client,  a.name AS adminName,
                                CONCAT(pf.year, '.', pf.month) AS workPeriod,
                                DATE_FORMAT(pf.registered_at, '%Y-%m-%d %H:%i') AS registeredAt
                                , pf.year, pf.month, thumb.thumbnailUrl, IF(tp.tp_id IS NULL, 'N', 'Y') AS isTypical
                            FROM portfolio AS pf
                                ${commonJoinQuery}

                            WHERE is_deleted = 'N'
                            ${commonWhere}
                            ORDER BY
                            ${
                                typical.length > 0
                                    ? `
                                            CASE
                                                ${typical.map((t, i) => ` WHEN id = ${t.p_id} THEN ${i + 1}`).join(' ')}
                                                ELSE ${typical.length + 1}
                                            END,
                            `
                                    : ''
                            }
                            pf.year DESC, pf.month DESC
                        `
        const [list] = await conn.query(query)

        return list
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/portfolio/getTypicalPortfolioList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioDetail = async (id: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    id, is_old AS isOld, client_id AS clientId, IFNULL(c.client, '') AS client, keyword,
                                    IFNULL(title, '') AS title, IFNULL(content, '') AS content, IFNULL(year, '') AS year, IFNULL(month, '') AS month,
                                    is_published AS isPublished, thumbnail_id, f.url,
                                    DATE_FORMAT(registered_at, '%Y-%m-%d %H:%i:%d') AS registeredAt
                                FROM portfolio AS pf
                                    LEFT JOIN (
                                        SELECT
                                            id AS c_id, name AS client
                                        FROM client
                                    ) AS c
                                    ON pf.client_id = c.c_id

                                    LEFT JOIN (
                                        SELECT
                                            id AS f_id, transed_name AS url
                                        FROM figverse_file
                                    ) AS f
                                    ON pf.thumbnail_id = f.f_id
                                WHERE id = ${id}`

        let [[pf]] = await conn.query(query)

        if (!pf || !pf.id) throw new ConflictError('존재하지 않거나 삭제된 포트폴리오입니다.')

        pf['category'] = await getPortfolioCategories(pf.id)
        pf['tag'] = await getPortfolioTags(pf.id)
        pf['images'] = await getPortfolioImages(pf.id)
        pf['link'] = await getPortfolioVideos(pf.id)
        pf['keyword'] = pf.keyword ? pf.keyword.split(',') : []

        if (pf['thumbnail_id'] && pf['url']) pf['thumbnail'] = { id: pf['thumbnail_id'], url: pf['url'] }

        delete pf['thumbnail_id']
        delete pf['url']

        return pf
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/portfolio/getPortfolioDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getDetailPrevNextIds = async (filter: PortfolioFilterModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'
        const [typical] = await conn.query(`SELECT p_id FROM typical_portfolio ORDER BY sequence ASC`)

        const commonJoinQuery = `
                                LEFT JOIN (
                                    SELECT
                                        pf_id, c_id, GROUP_CONCAT(cg.name separator ', ') AS categories, GROUP_CONCAT(c_id) AS category_ids
                                    FROM category_portfolio_relation AS c_cpr
                                        LEFT JOIN (
                                            SELECT
                                                id AS cg_id, name
                                            FROM category
                                        ) AS cg
                                        ON c_cpr.c_id = cg.cg_id
                                    GROUP BY c_cpr.pf_id
                                ) AS cpr
                                ON pf.id = cpr.pf_id
                                
                                LEFT JOIN (
                                    SELECT
                                        id As c_id, name 
                                    FROM client
                                ) AS c
                                ON pf.client_id = c.c_id

                                LEFT JOIN (
                                    SELECT
                                        p_id AS tp_id
                                    FROM typical_portfolio
                                ) AS tp
                                ON pf.id = tp.tp_id
                                `

        const commonWhere = `
                            ${filter.cId ? `AND FIND_IN_SET(${filter.cId}, cpr.category_ids) ` : ``}
                            ${filter.cId ? `AND cpr.category_ids IN (${filter.cId}) ` : ``}
                            ${
                                filter.word
                                    ? `AND (pf.title LIKE '%${filter.word}%' OR c.name LIKE '%${filter.word}%' OR cpr.categories LIKE '%${filter.word}%')`
                                    : ``
                            }
                            ${filter.isPublished ? `AND pf.is_published = '${filter.isPublished}'` : ``}
                            ${filter.year ? `AND pf.year = '${filter.year}'` : ``}
                            ${filter.client ? `AND pf.client_id = ${filter.client}` : ``}
                        `

        const query = /* sql */ `SELECT
                                    id, IF(tp.tp_id IS NULL, 'N', 'Y') AS isTypical
                                FROM portfolio AS pf
                                    ${commonJoinQuery}
                                
                                WHERE is_deleted = 'N'
                                ${commonWhere}
                                ORDER BY
                                    ${
                                        typical.length > 0
                                            ? `
                                                    CASE
                                                        ${typical.map((t, i) => ` WHEN id = ${t.p_id} THEN ${i + 1}`).join(' ')}
                                                        ELSE ${typical.length + 1}
                                                    END,
                                    `
                                            : ''
                                    }
                                pf.year DESC, pf.month DESC
                            `

        let [pf] = await conn.query(query)

        return pf.map((p) => p.id)
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/portfolio/getPortfolioDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioCategories = async (pfId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    c.name
                                FROM category_portfolio_relation AS cpr
                                    LEFT JOIN (
                                        SELECT
                                            id AS c_id, name
                                        FROM category 
                                    ) AS c
                                    ON cpr.c_id = c.c_id
                                WHERE pf_id = ${pfId}`

        const [res] = await conn.query(query)

        return res.map((r) => r.name)
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/common/getPortfolioCategories] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioTags = async (pfId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    t.name
                                FROM tag_portfolio_relation AS tpr
                                    LEFT JOIN (
                                        SELECT
                                            id AS t_id, name
                                        FROM tag
                                    ) AS t
                                    ON tpr.t_id = t.t_id
                                WHERE pf_id = ${pfId}`

        const [res] = await conn.query(query)

        return res.map((r) => r.name)
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/common/getPortfolioTags] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioImages = async (pfId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    pfr.f_id AS id, f.url
                                FROM portfolio_file_relation AS pfr
                                    LEFT JOIN (
                                        SELECT
                                            id AS f_id, transed_name AS url
                                        FROM figverse_file
                                    ) AS f
                                    ON pfr.f_id = f.f_id
                                WHERE pf_id = ${pfId}
                                ORDER BY pfr.sequence ASC
                                `

        const [res] = await conn.query(query)

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/common/getPortfolioImages] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioVideos = async (pfId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = /* sql */ `SELECT
                                    link
                                FROM portfolio_link_relation
                                WHERE pf_id = ${pfId}
                                ORDER BY sequence ASC
                                `

        const [res] = await conn.query(query)

        return res.map((r) => r.link)
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/common/getPortfolioVideos] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioWithTitle = async (keyword: string) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        const [result] = await conn.query(
            /* sql*/
            `SELECT 
        p.id,
        title,
        c.name AS clientName,
        content,
        f.transed_name AS thumbnail,
        CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS yearMonth

      FROM portfolio AS p
      LEFT JOIN client AS c ON p.client_id = c.id
      LEFT JOIN figverse_file AS f ON p.thumbnail_id = f.id
      WHERE title IN ("${keyword}")
      GROUP BY p.id
      ORDER BY p.year DESC, p.month DESC
      LIMIT 3
      `
        )

        return result
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/Portfolio/getPortfolioWithKeyword] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const createPortfolioKeyword = async (data: { id: number; keyword: string }) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        await conn.query(
            /* sql*/
            `UPDATE portfolio 
      SET keyword = "${data.keyword}"
      WHERE id = ${data.id}
      `
        )
    } catch (err) {
        throw new ServerError(`Error[sql/Portfolio/createPortfolioKeyword] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
