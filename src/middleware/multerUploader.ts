import { S3Client } from '@aws-sdk/client-s3'
import env from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { ConflictError } from 'model/common/error'
import multer from 'multer'
import multerS3 from 'multer-s3'
import { uploadFile } from 'sql/Common/file'

env.config()

const s3 = new S3Client({
    region: process.env.S3_BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
})

// S3 uploader
const fileUploader = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,

        key: (req: Request, file: Express.Multer.File, callback) => {
            const tempSplit = file.originalname.split('.')
            const fileExtension = tempSplit[tempSplit.length - 1]
            const fileTransed = `${Date.now()}_${Math.floor(Math.random() * 99999)}`
            callback(null, `portfolio/${fileTransed}.${fileExtension}`) // ex ) artfigk_2334123123.jpeg
        },
        acl: 'public-read',
    }),
})

// file DB insert
const insertFile = async (file: any) => {
    const tempSplit = file.originalname.split('.')

    const data = {
        fileTransedName: `${file.key}`.replace('portfolio/', ''),
        fileOriginName: file.originalname,
        fileExtension: file.originalname.split('.')[tempSplit.length - 1],
        fileSize: file.size,
    }

    return await uploadFile(data)
}

const uploadWrapper = {
    singleFileUploader: (multer: any) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!multer) throw new ConflictError('파일 업로드 중 오류가 발생했어요.')
                await new Promise((resolve, reject) => {
                    multer(req, res, (err: unknown) => {
                        resolve(null)
                    })
                })
                next()
            } catch (err) {
                console.error(err)
            }
        }
    },
    multipleFileUploader: (multer: any) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const userId = req.body.userId

            if (!multer) {
                throw new ConflictError('파일 업로드 중 오류가 발생했어요.')
            }
            try {
                await new Promise((resolve, reject) => {
                    multer(req, res, (err: unknown) => {
                        resolve(null)
                    })
                })

                if (req.file) {
                    req.body[req.file.fieldname] = await insertFile(req.file)
                }

                if (req.files) {
                    // multiple upload
                    const files = {}

                    for (const file in req.files) {
                        const obj = req.files[file]

                        const idxArr = []

                        for (let i = 0; i < obj.length; i++) {
                            idxArr.push(await insertFile(obj[i]))
                        }

                        files[file] = idxArr
                    }

                    req.body.files = files
                }
                req.body.userId = userId

                next()
            } catch (err) {
                console.error(err)
            }
        }
    },
}

export { fileUploader, insertFile, uploadWrapper }
