import { Request, Response } from 'express'
import 'express-async-errors'
import { errorHandler } from 'middleware/errorHandler'
const { sanitizer } = require('./src/middleware/sanitizer')

const port = 3100

const bodyParser = require('body-parser')
const cors = require('cors')
const express = require('express')
const indexRouter = require('router')
const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/', sanitizer, indexRouter)

// 404 Error Handling
app.use(function (req: Request, res: Response) {
    res.status(404).json({ code: 404, message: '지원하지 않는 API URI입니다.' })
})

app.use(errorHandler)

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
