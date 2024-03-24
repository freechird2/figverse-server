import { Request, Response, Router } from "express";
import { BadRequestError } from "model/common/error";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { createChatLog } from "sql/Chat";
import { portfolio_22_23 } from "sql/Common/Portfolio/portfolio_22_23";
import { getFigkWithKeyword } from "sql/Figk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
});

const UserChatRouter = Router();
const defaultTemperature = 0.7;
const defaultTopP = 1;
const commonSystemMessage = `
You are the person who guides FIG's homepage called FIGVERSE;
Following the language of the person you are talking to, you can use the language of the person you are talking to;
FIG is a creative agency, and FIGVERSE is FIG's homepage. FIGVERSE is the virtual world of FIG;
When introducing yourself, only describe your company and the team you belong to.
Answer in three sentences or less;
Not only FIG's information but also any other information can be answered;
Saying that you cannot answer questions that are difficult to answer or that you do not know
The following is Fig's portfolio information for 2022 and 2023.;
${portfolio_22_23};
Only recommend portfolios that are relevant to the topic of conversation;
(Example: I really like beer too! We have a beer-related portfolio we created! -- Beer-related portfolio description --);
Projects prior to 2022 can be viewed in the portfolio menu on the left;
The information below is the basic information of FIG. Deliver information in a conversational style (e.g. FIGIF consists of Experience Division, Emerging Project Division, Creative Division, Content Division, FIGIF, and Administration Division);
FIG(피이그) 정보 : {
  homepage introduction : "The current homepage is FIGVERSE, a homepage that guides you through the virtual world of FIG. You can check various information about FIG through the left menu of the homepage."
  phone : "+82-6953-5441",
  email : "info@fig.xyz",
  current URL : "https://fig.xyz",
  physical address :"1st floor, 48 Wausan-ro, Mapo-gu, Seoul",
  nearby station : "1 minute walk from Sangsu Station, Line 6"
  recruit information : "https://fig.career.greetinghr.com/ or go to the Recruit menu",
  organization tree : {
            Experience DIV : [X1,X2,X3,DIG],
            Emerging Project Div : [Emerging 1,Emerging 2],
            Creative Div : [{Brand Creative : bx designer}, {Space Creative : space designer}, {Digital Creative : fe/be developer, ui/ux designer, publisher}],
            Content : [Production, Motion Graphic],
            FIGIF,
            Administration,
          },
  SNS : {
          Instagram : https://www.instagram.com/fig.0fficial/,
          Youtube : https://www.youtube.com/@FIG-VERSE,
        },
  CEO : "이승환",
  Portfolio : "Guide to the Portfolio menu on the left side of the screen",
  Recruit : "In the Recruit menu, you can see FIG's recruitment information and information about Benefits and welfare. Guide to Recruit menu on the left side of the screen",
  Contact : "In the Contact menu, you can see FIG's contact information and location information. Guide to Contact menu on the left side of the screen",
  figk : "Figk is a content portal site created by FIG that provides content covering a variety of topics. The recommended text on the right side of the screen is taken from FIGK's text related to the topic of the conversation with AI. https://figk.net, connect to the # icon on the left side of the screen",
  Every time you talk, a fig falls from the right.
};

`;

UserChatRouter.post("/designer", async (req: Request, res: Response) => {
  let { message } = { ...req.body } as any;
  let answer = "";

  try {
    if (!message) throw new Error();
  } catch (err) {
    throw new BadRequestError("메세지를 입력해주세요.");
  }

  const msg = [
    {
      role: "system",
      content:
        commonSystemMessage +
        `You are a 28-year-old woman, You are part of the brand creative team. and you speak with a childlike innocence. You are talkative and outgoing enough to make friends with anyone. You are a designer at FIG, who creates creative designs.`,
    },
  ];

  const stream: any = await openai.chat.completions.create({
    model: process.env.FINETUNING_MODEL,
    temperature: defaultTemperature,
    top_p: defaultTopP,
    max_tokens: 4096,
    messages: [...msg, ...message],
    stream: true,
  });

  for await (const chuck of stream) {
    let msg = chuck.choices[0].delta.content;
    if (msg === undefined) res.status(200).end();
    else {
      answer += chuck.choices[0].delta.content;
    }
    if (msg) {
      res.write(msg);
    }
  }

  const chatLog = [
    {
      persona: "designer",
      role: message[message.length - 1].role,
      content: message[message.length - 1].content,
    },
    { persona: "designer", role: "assistant", content: answer },
  ];
  if (chatLog.length) await createChatLog(chatLog);
});

UserChatRouter.post("/developer", async (req: Request, res: Response) => {
  const { message, temperature = 0.1 } = { ...req.body } as any;
  let answer = "";

  try {
    if (!message) throw new Error();
  } catch (err) {
    throw new BadRequestError("메세지를 입력해주세요.");
  }

  const msg = [
    {
      role: "system",
      content:
        commonSystemMessage +
        `You are a Fig developer. You are part of the digital creative team. You are a 32-year-old man and you find everything annoying. To put it bluntly.No matter what anyone says, you don't use honorifics.`,
    },
  ];

  const stream: any = await openai.chat.completions.create({
    model: process.env.FINETUNING_MODEL,
    // model: 'gpt-3.5-turbo-0613',
    temperature: defaultTemperature,
    top_p: defaultTopP,
    max_tokens: 4096,
    messages: [...msg, ...message],
    stream: true,
  });

  for await (const chuck of stream) {
    let msg = chuck.choices[0].delta.content;
    if (msg === undefined) res.status(200).end();
    else {
      answer += chuck.choices[0].delta.content;
    }
    if (msg) res.write(msg);
  }

  const chatLog = [
    {
      persona: "developer",
      role: message[message.length - 1].role,
      content: message[message.length - 1].content,
    },
    {
      persona: "developer",
      role: "assistant",
      content: answer,
    },
  ];

  await createChatLog(chatLog);
});

UserChatRouter.post("/pm", async (req: Request, res: Response) => {
  const { message, temperature = 0.1 } = { ...req.body } as any;
  let answer = "";

  try {
    if (!message) throw new Error();
  } catch (err) {
    throw new BadRequestError("메세지를 입력해주세요.");
  }

  const msg = [
    {
      role: "system",
      content:
        commonSystemMessage +
        `You are a PM at Fig and you are a 32-year-old male. You are part of the X3 team.You are a single person with perfectionist tendencies and many hobbies. You have an obsession with spelling, so when the other person makes a spelling mistake, you have to point it out to relieve your frustration. You are a nerd. You love explaining things.`,
    },
  ];

  const stream: any = await openai.chat.completions.create({
    model: process.env.FINETUNING_MODEL,
    temperature: defaultTemperature,
    top_p: defaultTopP,
    max_tokens: 4096,
    messages: [...msg, ...message],
    stream: true,
  });

  for await (const chuck of stream) {
    let msg = chuck.choices[0].delta.content;

    if (msg === undefined) res.status(200).end();
    else {
      answer += chuck.choices[0].delta.content;
    }
    if (msg) res.write(msg);
  }

  const chatLog = [
    {
      persona: "pm",
      role: message[message.length - 1].role,
      content: message[message.length - 1].content,
    },
    { persona: "pm", role: "assistant", content: answer },
  ];

  await createChatLog(chatLog);
});

UserChatRouter.post("/hr_manager", async (req: Request, res: Response) => {
  const { message, temperature = 0.1 } = { ...req.body } as any;
  let answer = "";

  try {
    if (!message) throw new Error();
  } catch (err) {
    throw new BadRequestError("메세지를 입력해주세요.");
  }

  const msg = [
    {
      role: "system",
      content:
        commonSystemMessage +
        `You are a human resources manager at FIG and a 38-year-old woman. You are part of the Administration div. You have a warm personality and speaks in a gentle manner. you have a complex with your age, so you don't want to be called old.`,
    },
  ];

  const stream: any = await openai.chat.completions.create({
    model: process.env.FINETUNING_MODEL,
    // model: 'gpt-3.5-turbo-0613',
    temperature: defaultTemperature,
    top_p: defaultTopP,
    max_tokens: 4096,
    messages: [...msg, ...message],
    stream: true,
  });

  for await (const chuck of stream) {
    let msg = chuck.choices[0].delta.content;

    if (msg === undefined) res.status(200).end();
    else {
      answer += chuck.choices[0].delta.content;
    }
    if (msg) res.write(msg);
  }

  const chatLog = [
    {
      persona: "hr",
      role: message[message.length - 1].role,
      content: message[message.length - 1].content,
    },
    { persona: "hr", role: "assistant", content: answer },
  ];

  await createChatLog(chatLog);
});

UserChatRouter.get("/keyword", async (req: Request, res: Response) => {
  const { message } = { ...req.query } as any;

  const msg: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `대화의 주제를 한 단어로 추출해서 {"keyword" : ""}  형식에 맞게 단어를 하나만 추출해줘.; 
      `,
    },
  ];

  msg.push({ role: "user", content: message });

  const completions: any = await openai.chat.completions.create({
    model: "gpt-4-0613",
    // model: 'gpt-3.5-turbo-0613',
    temperature: 0.1,
    messages: [...msg],
    stream: false,
  });

  try {
    const keyword = JSON.parse(completions.choices[0].message.content).keyword;
    if (keyword) {
      const returnData = {
        keyword: keyword,
        figk: await getFigkWithKeyword(keyword),
      };
      return res.json({ code: 200, message: "success", data: returnData });
    } else return res.json({ code: 200, message: "success", data: null });
  } catch (error) {
    return res.json({ code: 200, message: "success", data: null });
  }
});

export default UserChatRouter;
