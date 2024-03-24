import env from "dotenv";
import { Request, Response, Router } from "express";
import Joi from "joi";
import { BadRequestError } from "model/common/error";
import {
  getAutoCompleteSearch,
  getCategories,
  getPortfolioListForTypical,
} from "sql/Common/common";

env.config();

const CommonRouter = Router();

CommonRouter.get("/typical", async (req: Request, res: Response) => {
  const year = req.query.year as unknown as string;

  try {
    await Joi.string().min(4).max(4).error(new Error()).validateAsync(year);
  } catch (err) {
    throw new BadRequestError("연도를 확인해주세요.");
  }

  const list = await getPortfolioListForTypical(year);

  res.json({
    code: 200,
    message: "포트폴리오 목록을 불러왔습니다.",
    data: list,
  });
});

CommonRouter.get("/category", async (req: Request, res: Response) => {
  const list = await getCategories();

  res.json({ code: 200, message: "카테고리 목록을 불러왔습니다.", data: list });
});

// 카테고리 자동 완성 검색
CommonRouter.get("/ac-search", async (req: Request, res: Response) => {
  const table = req.query.table as unknown as string;
  const word = req.query.word as unknown as string;

  try {
    await Joi.string()
      .valid("tag", "category", "client")
      .required()
      .error(new Error())
      .validateAsync(table);
    await Joi.string().min(2).required().error(new Error()).validateAsync(word);
  } catch (err) {
    throw new BadRequestError("Bad Params");
  }

  res.json({
    code: 200,
    message: "auto complete search",
    data: await getAutoCompleteSearch(table, word),
  });
});

export default CommonRouter;
