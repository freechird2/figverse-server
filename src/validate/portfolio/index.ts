import joi from 'joi'

export const PortfolioFilterValidate = joi
    .object()
    .keys({
        isPublished: joi.string().valid('Y', 'N', 'W').error(new Error('발행여부를 확인해주세요.')),
        year: joi.string().max(4).error(new Error('작업기간을 확인해주세요.')),
        client: joi.number().min(1).error(new Error('클라이언트 idx를 확인해주세요.')),
        cId: joi.number().min(1).error(new Error('카테고리 idx를 확인해주세요.')),
        word: joi.string().error(new Error('검색어를 확인해주세요.')),
        page: joi.number().min(1).error(new Error('page를 확인해주세요.')),
        per: joi.number().min(1).error(new Error('per를 확인해주세요.')),
    })
    .unknown()

export const PortfolioDataValidate = joi
    .object()
    .keys({
        id: joi
            .number()
            .min(1)
            .alter({ update: (schema) => schema.required() })
            .error(new Error('포트폴리오 id를 확인해주세요.')),
        isPublished: joi.string().valid('Y', 'N', 'W').required().error(new Error('발행여부를 확인해주세요.')),
        client: joi.string().required().error(new Error('클라이언트를 확인해주세요.')),
        year: joi.string().max(4).required().error(new Error('작업연도를 확인해주세요.')),
        month: joi.string().max(2).required().error(new Error('작업월을 확인해주세요.')),
        title: joi.string().required().error(new Error('제목을 확인해주세요.')),
        content: joi.string().required().error(new Error('내용을 확인해주세요.')),
        category: joi.array().min(1).items(joi.string()).error(new Error('카테고리를 확인해주세요.')),
        // tag: joi.array().min(1).items(joi.string()).error(new Error('태그를 확인해주세요.')),
        // link: joi.array().items(joi.string()).error(new Error('링크를 확인해주세요.')),
        // thumbnail: joi.number().required().error(new Error('썸네일을 확인해주세요.')),
        imageIds: joi
            .array()
            .items(joi.number())
            .min(1)
            .alter({ regist: (schema) => schema.required() })
            .error(new Error('이미지를 확인해주세요.')),
        updateImages: joi
            .array()
            .items(joi.number(), joi.string())
            .min(1)
            .alter({ update: (schema) => schema.required() })
            .error(new Error('이미지 배열을 확인해주세요.')),
        register: joi
            .number()
            .min(1)
            .alter({ regist: (schema) => schema.required() })
            .error(new Error('등록자 정보를 확인해주세요.')),
    })
    .unknown()
