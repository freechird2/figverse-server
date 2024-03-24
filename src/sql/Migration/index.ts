import { BadRequestError, ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import moment from 'moment'
import newDb from '../../database'
import oldFigverse from '../../old_figverse_database'
import theFigDb from '../../the_fig_database'

export const migrationTheFig = async () => {
    let conn = null

    try {
        conn = await theFigDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const query = /* sql */ `SELECT
                                    p.wr_id AS id, p.wr_subject AS title, p.wr_content AS content,
                                    c.wr_subject AS category, cl.wr_subject AS client,
                                    CONCAT(p.wr_link1, ',', p.wr_link2, ',', p.wr_link3, ',', p.wr_link4, ',', p.wr_link5, ',',
                                    p.wr_link6, ',', p.wr_link7, ',', p.wr_link8, ',', p.wr_link9, ',', p.wr_link10) AS links,
                                    p.wr_perform, p.wr_last
                                FROM g4_write_portfolio AS p
                                    LEFT JOIN (
                                        SELECT 
                                            wr_id AS c_id, wr_subject
                                        FROM g4_write_category
                                    ) AS c 
                                    ON p.category_wr_id = c.c_id

                                    LEFT JOIN (
                                        SELECT 
                                            wr_id AS cl_id, wr_subject
                                        FROM g4_write_companyf_client
                                    ) AS cl
                                    ON p.client_wr_id = cl.cl_id
                            `
        const [res] = await conn.query(query)

        for (let index = 0; index < res.length; index++) {
            const [img] = await getPortfolioImg(res[index].id)
            res[index].img = img

            res[index].link = res[index].links.split(',').filter((f) => f)
            delete res[index].links
        }

        await insertMigrationData(res)

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/migrationTheFig] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPortfolioImg = async (id: number) => {
    let conn = null

    try {
        conn = await theFigDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const query = /* sql */ `SELECT
                                    bf_no, bf_source, bf_file, bf_filesize
                                FROM g4_board_file
                                WHERE bo_table = 'portfolio'
                                AND bf_source IS NOT NULL AND bf_source <> ''
                                AND bf_file IS NOT NULL AND bf_file <> ''
                                AND wr_id = ${id}
                            `
        const res = await conn.query(query)

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/getPortfolioImg] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const insertMigrationData = async (data: any[]) => {
    let conn = null

    try {
        conn = await newDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        await conn.beginTransaction()

        const arr = []

        for (let i = 0; i < data.length; i++) {
            const categoryIdx = await findDbIndex('category', data[i].category)
            const clientIdx = await findDbIndex('client', data[i].client)
            const title = data[i].title.replace(/'/gi, "''")
            const content = data[i].content.replace(/'/gi, "''")
            const tags = await findTagIndex(conn, data[i].wr_perform)

            const query = /* sql */ `INSERT INTO 
                                        portfolio(is_old, client_id, title, content, register, registered_at) 
                                    VALUES ('Y', ${clientIdx}, '${title}', '${content}', 1, '${data[i].wr_last}')
                                    `
            const [pfIns] = await conn.query(query)

            await conn.query(`INSERT INTO 
                                        category_portfolio_relation
                                    SET
                                        pf_id = ${pfIns.insertId},
                                        c_id = ${categoryIdx}
                                    `)

            let sequence = 1

            if (data[i].link && data[i].link.length > 0) {
                for (let k = 0; k < data[i].link.length; k++) {
                    const link = data[i].link[k].replace('//p', 'p')

                    await conn.query(`INSERT INTO 
                                        portfolio_link_relation
                                    SET
                                        pf_id = ${pfIns.insertId},
                                        link = '${link}',
                                        sequence = ${sequence}
                                    `)
                    sequence++
                }
            }

            sequence = 1

            if (data[i].img && data[i].img.length > 0) {
                for (let k = 0; k < data[i].img.length; k++) {
                    const img = data[i].img[k]

                    const [iRes] = await conn.query(`INSERT INTO 
                                        figverse_file(origin_name, transed_name, file_extension, file_size)
                                    VALUES ('${img.bf_source}', '${img.bf_file}', '${img.bf_source.split('.')[1]}', ${img.bf_filesize})
                                    `)

                    await conn.query(`INSERT INTO 
                                        portfolio_file_relation
                                    SET
                                        pf_id = ${pfIns.insertId},
                                        f_id = ${iRes.insertId},
                                        sequence = ${sequence}
                                    `)
                    sequence++

                    if (k === 0) {
                        await conn.query(`UPDATE portfolio SET thumbnail_id = ${iRes.insertId} WHERE id = ${pfIns.insertId}`)
                    }
                }
            }

            if (tags && tags.length > 0) {
                const tempArr = []
                tags.map((t) => {
                    tempArr.push(`(${pfIns.insertId}, ${t})`)
                })

                const tQuery = /* sql */ `INSERT INTO 
                                            tag_portfolio_relation(pf_id, t_id)
                                        VALUES ${tempArr.join(',')}`

                await conn.query(tQuery)
            }
        }

        // console.log(query)

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/insertMigrationData] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const findDbIndex = async (table: string, target: string) => {
    let conn = null
    try {
        conn = await newDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const word = target.replace(/'/gi, "''")

        const query = /* sql */ `SELECT 
                                    id
                                FROM ${table}
                                WHERE name = '${word}'
                            `
        const [[res]] = await conn.query(query)

        if (!res || !res.id) {
            const [ins] = await conn.query(`INSERT INTO ${table} SET name = '${word}', register = 1`)

            return ins.insertId
        }

        return res.id
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/findDbIndex] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const findTagIndex = async (conn: any, target: string) => {
    try {
        if (!conn) throw 'theFigDb connection error'

        const result = []
        const arr = target.split(', ')

        for (let i = 0; i < arr.length; i++) {
            const query = /* sql */ `SELECT
                                        id
                                    FROM tag
                                    WHERE name = '${arr[i]}'
                                `

            const [[res]] = await conn.query(query)

            if (!res || !res.id) {
                const [ins] = await conn.query(`INSERT INTO tag SET name = '${arr[i]}', register = 1`)

                result.push(ins.insertId)
            } else {
                result.push(res.id)
            }
        }

        return result
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/findDbIndex] : ${err}`)
    }
}

export const migrationFigverseOld = async () => {
    let conn = null
    try {
        conn = await oldFigverse.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const query = /* sql */ `SELECT
                                    id, post_title, post_date
                                FROM wp_posts
                                WHERE post_type = 'post'
                                AND post_status = 'publish'
                                ORDER BY post_date DESC
                                `

        const [list] = await conn.query(query)
        const metadataList = []

        for (let i = 0; i < list.length; i++) {
            let metadata = await getPostMetadata(list[i].id)
            metadata['title'] = list[i].post_title.replace(/'/gi, "''")
            metadata['registered_at'] = list[i].post_date

            metadataList.push(metadata)
        }

        await insertFigversePortFolio(metadataList)

        return list
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/migrationFigverseOld] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPostMetadata = async (id: number) => {
    let conn = null

    try {
        conn = await oldFigverse.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const query = /* sql */ `SELECT
                                    *
                                FROM wp_postmeta
                                WHERE post_id = ${id}
                                AND meta_key IN ('images', 'video', 'text', 'tag', 'category', 'client', 'date_from')
                                `

        const [metas] = await conn.query(query)

        let returnData = {}

        for (let i = 0; i < metas.length; i++) {
            const { meta_key, meta_value } = metas[i]

            if (!meta_value || meta_value === '') continue

            if (meta_key === 'date_from') {
                //프로젝트 시작일
                returnData['year'] = moment(meta_value).format('YYYY')
                returnData['month'] = moment(meta_value).format('MM')
            } else if (meta_key === 'client') {
                //client
                const [[client]] = await conn.query(`SELECT name FROM wp_terms WHERE term_id = ${meta_value}`)
                const clientIdx = await findDbIndex('client', client.name)
                returnData['client'] = clientIdx
            } else if (meta_key === 'category') {
                const idxs = await getTerms('category', meta_value)
                returnData['category'] = idxs
            } else if (meta_key === 'tag') {
                // tag
                const idxs = await getTerms('tag', meta_value)
                returnData['tag'] = idxs
            } else if (meta_key === 'text') {
                // content
                returnData['content'] = meta_value ? meta_value.replace(/'/gi, "''") : ''
            } else if (meta_key === 'video') {
                // video
                returnData['video'] = meta_value
            } else if (meta_key === 'images') {
                // images
                // returnData['video'] = meta_value
                const idxs = await getPostImages(conn, meta_value)
                returnData['images'] = idxs
            }
        }

        return returnData
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/getPostMetadata] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

const decodeBlock = (block: string) => {
    if (!block) return []

    const idxArr = []
    const temp = block.slice(block.indexOf('{'))
    let start = 0,
        last = 0

    while (true) {
        start = temp.indexOf('"', last)
        last = temp.indexOf('"', start + 1)

        if (start === -1 || last === -1) break

        const idx = temp.slice(start + 1, last)

        idxArr.push(idx)

        last++
    }

    return idxArr
}

export const getTerms = async (table: string, target: string) => {
    let conn = null
    try {
        conn = await oldFigverse.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const idxs = decodeBlock(target)

        const tempCArr = []
        const [list] = await conn.query(`SELECT name FROM wp_terms WHERE term_id IN (${idxs.join(',')})`)

        for (let j = 0; j < list.length; j++) {
            const idx = await findDbIndex(table, list[j].name)
            tempCArr.push(idx)
        }

        return tempCArr
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/getTerms] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getPostImages = async (conn: any, target: string) => {
    let newConn = null

    try {
        newConn = await newDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        const idxs = decodeBlock(target)

        const tempCArr = []
        const [list] = await conn.query(`SELECT guid FROM wp_posts WHERE id IN (${idxs.join(',')})`)

        for (let j = 0; j < list.length; j++) {
            const filename = list[j].guid.slice(list[j].guid.lastIndexOf('/') + 1)
            const extention = filename.slice(filename.lastIndexOf('.') + 1)

            const [ins] = await newConn.query(
                `INSERT INTO figverse_file(origin_name, transed_name, file_extension, file_size) VALUES('${filename}', '${filename}', '${extention}', 0)`
            )

            tempCArr.push(ins.insertId)
        }

        return tempCArr
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/getPostImages] : ${err}`)
    } finally {
        if (newConn) await newConn.release()
    }
}

export const insertFigversePortFolio = async (data: any[]) => {
    let conn = null

    try {
        conn = await newDb.getConnection()

        if (!conn) throw 'theFigDb connection error'

        await conn.beginTransaction()

        for (let i = 0; i < data.length; i++) {
            const el = data[i]

            const pfQuery = /* sql */ `INSERT INTO 
                                        portfolio(client_id, title, content, year, month, register, registered_at)
                                    VALUES (${el.client || 0}, '${el.title}', '${el.content}', '${el.year}', '${el.month}', 1, '${
                el.registered_at
            }')
                                    `
            const [ins] = await conn.query(pfQuery)

            if (!ins.insertId) throw new ServerError()

            const pfId = ins.insertId

            if (el.video) {
                await conn.query(`INSERT INTO portfolio_link_relation(pf_id, link, sequence) VALUES(${pfId}, '${el.video}', 1)`)
            }

            let sequence = 1

            if (el.images && el.images.length > 0) {
                const arr = []
                el.images.map((e, i) => {
                    arr.push(`(${pfId}, ${e}, ${sequence})`)
                    sequence++
                })

                const imgQuery = /* sql */ `INSERT INTO portfolio_file_relation(pf_id, f_id, sequence) VALUES ${arr.join(', ')}`

                await conn.query(imgQuery)

                await conn.query(`UPDATE portfolio SET thumbnail_id = ${el.images[0]} WHERE id = ${pfId}`)
            }

            if (el.category && el.category.length > 0) {
                const arr = []
                el.category.map((e, i) => {
                    arr.push(`(${pfId}, ${e})`)
                })

                const q = /* sql */ `INSERT INTO category_portfolio_relation(pf_id, c_id) VALUES ${arr.join(', ')}`

                await conn.query(q)
            }

            if (el.tag && el.tag.length > 0) {
                const arr = []
                el.tag.map((e, i) => {
                    arr.push(`(${pfId}, ${e})`)
                })

                const q = /* sql */ `INSERT INTO tag_portfolio_relation(pf_id, t_id) VALUES ${arr.join(', ')}`

                await conn.query(q)
            }
        }

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/migration/insertFigversePortFolio] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
