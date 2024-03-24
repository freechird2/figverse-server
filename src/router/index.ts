import { Router } from "express";
import { loginChecker } from "middleware/loginChecker";
import AdminRouter from "./Admin";
import AuthRouter from "./Auth";
import MigrationRouter from "./Migration";
import UserChatRouter from "./User/Chat";
import UserPortfolioRouter from "./User/Portfolio";

const indexRouter = Router();

indexRouter.use("/auth", AuthRouter);
indexRouter.use("/migration", MigrationRouter);
indexRouter.use("/adm", loginChecker, AdminRouter);
indexRouter.use("/portfolio", UserPortfolioRouter);
indexRouter.use("/chat", UserChatRouter);

module.exports = indexRouter;
