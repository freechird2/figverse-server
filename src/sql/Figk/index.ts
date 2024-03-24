import {
  BadRequestError,
  ConflictError,
  ServerError,
  UnauthorizedError,
} from "model/common/error";
import db from "../../figk_database";

export const getFigkWithKeyword = async (keyword: string) => {
  let conn = null;

  try {
    conn = await db.getConnection();

    if (!conn) throw "db connection error";

    const query = /* sql */ `SELECT
                                    id, a.authorName, week, title, sub_title AS subTitle, content
                                FROM figk_text AS ft
                                    LEFT JOIN (
                                        SELECT 
                                            id AS a_id, IFNULL(nickname, name) AS authorName
                                        FROM author
                                    ) AS a
                                    ON ft.author_id = a.a_id
                                WHERE is_published = 'Y'
                                AND (title LIKE '%${keyword}%' 
                                    OR sub_title LIKE '%${keyword}%' 
                                    OR content LIKE '%${keyword}%' 
                                    OR ft.id IN (SELECT figk_id
                                                    FROM figk_tag_relation
                                                WHERE tag_id = (SELECT id
                                                                FROM tags 
                                                                WHERE name = '${keyword}')
                                                                AND type = 1 ))
                                ORDER BY RAND()
                                LIMIT 1`;

    const [[res]] = await conn.query(query);

    return res || null;
  } catch (err) {
    if (err instanceof BadRequestError) throw new BadRequestError(err.message);
    else if (err instanceof ConflictError) throw new ConflictError(err.message);
    else if (err instanceof UnauthorizedError)
      throw new UnauthorizedError(err.message);
    else throw new ServerError(`Error[sql/Figk/getFigkWithKeyword] : ${err}`);
  } finally {
    if (conn) await conn.release();
  }
};
