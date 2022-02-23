require('dotenv').config()
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const moment = require('moment')
const ora = require('ora-classic')
const { Client, MessageMedia } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')

const app = express()
const PORT = process.env.PORT || 9000

const SESSION_FILE_PATH = './session.json'

let client
let sessionData

app.use(cors())
app.use(express.json())

app.post('/send', (req, res) => {
    const { to, message } = req.body
    const formattedNumber = `${to}@c.us`
    console.log(message, to)
    console.log(req.body)

    sendMessage(formattedNumber, message)

    res.send({ status: 'Sent' })
})

app.post('/sendMedia', (req, res) => {
    const { to, message, urlImage } = req.body
    const formattedNumber = `${to}@c.us`
    console.log(message, to, urlImage)
    console.log(req.body)

    sendMedia(formattedNumber, urlImage, message)

    res.send({ status: 'Sent' })
})

const withSession = () => {
    const spinner = ora(`Validating session with Whatsapp...`)
    sessionData = require(SESSION_FILE_PATH)
    spinner.start()

    client = new Client({
        session: sessionData
    })

    client.on('ready', () => {
        spinner.stop()
        console.log('Sucessfully signed in')
        listenMessage()
    })

    client.on('auth_failure', () => {
        spinner.stop()
        console.log('Authentication error, try generating the qr code again')
    })

    client.initialize()
}

/**
 * Generate the qr code
 */
const withoutSession = () => {
    console.log('No session has been found')

    client = new Client()
    const spinnerQR = ora(`Generating qr code...`)
    const spinner = ora(`Validating session with Whatsapp`)
    spinnerQR.start()

    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        spinnerQR.stop()
    })

    client.on('authenticated', (session) => {
        spinner.start()
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), err => {
            if (err) {
                console.log(err)
                spinner.stop()
            }
        })
    })

    client.on('ready', () => {
        spinner.stop()
        console.log('Sucessfully signed in')
        listenMessage()
    })

    client.initialize()
}

const listenMessage = () => {
    client.on('message', (msg) => {
        const { from, to, body } = msg
        console.log(from, to, body)
        //if (!(/@g/).test(from)) sendMessage(from, `[${moment().format('DD-MM-YYYY hh:mm')}] ${from}: ${body}`)
    })
}

const sendMedia = async (to, media, message='') => {
    const mediaFile = await MessageMedia.fromUrl(media)
    message === '' ? client.sendMessage(to, mediaFile) : client.sendMessage(to, mediaFile, {caption: message})
}

const sendMessage = (to, message) => {
    client.sendMessage(to, message)
}

(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withoutSession()

app.listen(PORT)
