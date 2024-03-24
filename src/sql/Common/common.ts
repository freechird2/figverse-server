import {
  BadRequestError,
  ConflictError,
  ServerError,
  UnauthorizedError,
} from "model/common/error";
import db from "../../database";

export const getPortfolioListForTypical = async (year?: string) => {
  let conn = null;

  try {
    conn = await db.getConnection();

    if (!conn) throw "db connection error";

    const query = /* sql */ `SELECT
                                    id, title, year
                                FROM portfolio
                                WHERE id IS NOT NULL
                                AND is_published = 'Y'
                                ${year ? `AND year = '${year}'` : ``}
                                ORDER BY title ASC
                                `;

    const [res] = await conn.query(query);

    return res;
  } catch (err) {
    if (err instanceof BadRequestError) throw new BadRequestError(err.message);
    else if (err instanceof ConflictError) throw new ConflictError(err.message);
    else if (err instanceof UnauthorizedError)
      throw new UnauthorizedError(err.message);
    else
      throw new ServerError(
        `Error[sql/common/getPortfolioListForTypical] : ${err}`
      );
  } finally {
    if (conn) await conn.release();
  }
};

export const getCategories = async () => {
  let conn = null;

  try {
    conn = await db.getConnection();

    if (!conn) throw "db connection error";

    const query = /* sql */ `SELECT
                                    id, name
                                FROM category
                                WHERE is_deleted = 'N'
                                ORDER BY name ASC
                                `;

    const [res] = await conn.query(query);

    return res;
  } catch (err) {
    if (err instanceof BadRequestError) throw new BadRequestError(err.message);
    else if (err instanceof ConflictError) throw new ConflictError(err.message);
    else if (err instanceof UnauthorizedError)
      throw new UnauthorizedError(err.message);
    else throw new ServerError(`Error[sql/common/getCategories] : ${err}`);
  } finally {
    if (conn) await conn.release();
  }
};

export const getAutoCompleteSearch = async (table: string, word: string) => {
  let conn = null;

  try {
    conn = await db.getConnection();

    if (!conn) throw "db connection error";

    const query = /* sql */ `SELECT
                                    name
                                FROM ${table}
                                WHERE MATCH(name) AGAINST ('*${word}*' IN BOOLEAN MODE) 
                                LIMIT 0, 5;
                                `;
    const [res] = await conn.query(query);

    return res.map((r) => r.name);
  } catch (err) {
    if (err instanceof BadRequestError) throw new BadRequestError(err.message);
    else if (err instanceof ConflictError) throw new ConflictError(err.message);
    else if (err instanceof UnauthorizedError)
      throw new UnauthorizedError(err.message);
    else
      throw new ServerError(`Error[sql/common/getAutoCompleteSearch] : ${err}`);
  } finally {
    if (conn) await conn.release();
  }
};

export const getClient = async () => {
  let conn = null;

  try {
    conn = await db.getConnection();

    if (!conn) throw "db connection error";

        const query = /* sql */ `SELECT
                                    r.client_id AS id, c.name AS name
                                FROM (
                                    SELECT
                                        client_id
                                    FROM portfolio
                                    WHERE is_published = 'Y'
                                    GROUP BY client_id
                                ) AS r
                                    LEFT JOIN (
                                        SELECT
                                            id AS c_id, name
                                        FROM client
                                    ) AS c
                                    ON r.client_id = c.c_id
                                ORDER BY c.name ASC
                                `

        const [res] = await conn.query(query)

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        else throw new ServerError(`Error[sql/common/getClient] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
