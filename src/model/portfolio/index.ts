import { PageParamModel } from "model/common";

export interface PortfolioFilterModel extends PageParamModel {
  isPublished?: "Y" | "N";
  year?: string;
  client?: number;
  cId?: number;
  word?: string;
  isUser?: boolean;
}
export interface PortfolioDataModel {
  id?: number;
  isPublished?: "Y" | "N" | "W";
  client: string;
  year: string;
  month: string;
  title: string;
  content: string;
  category: string[];
  keyword: string[];
  tag: string[];
  link?: number[];
  thumbnail?: number;
  imageIds?: number[];
  register?: number;
}
