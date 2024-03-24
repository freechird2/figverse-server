import { ServerError } from "model/common/error";
import db from "../../database";

export const createChatLog = async (data: any) => {
  const conn = await db.getConnection();
  if (!conn) throw "db connection error";

  try {
    // insertQuery에 ' 또는 " 이 있을 경우 \', \" 로 변경해야함
    const insertQuery = `("${data[0].persona}", "${
      data[0].role
    }", "${data[0].content.replace(/'/g, "\\'").replace(/"/g, '\\"')}"),("${
      data[1].persona
    }", "${data[1].role}", "${data[1].content
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')}") `;

    await conn.query(`INSERT INTO chat_log (persona, role, content)
                      VALUES ${insertQuery}`);

    return;
  } catch (err) {
    throw new ServerError(`Error[sql/common/chat/createChatLog] : ${err}`);
  } finally {
    if (conn) await conn.release();
  }
};
