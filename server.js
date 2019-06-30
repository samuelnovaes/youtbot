const BootBot = require('bootbot')
const fs = require('fs-extra')
const ytdl = require('ytdl-core')
const express = require('express')
const ytSearch = require('yt-search')
const https = require('https')
const validator = require('validator')
require('dotenv').config()

const regPlay = /^play (.+)$/i
const regSearch = /^search (.+) (\d+)$/i

const bot = new BootBot({
	accessToken: process.env.FB_ACCESS_TOKEN,
	verifyToken: process.env.FB_VERIFY_TOKEN,
	appSecret: process.env.FB_APP_SECRET
})

const play = (chat, videoId) => {
	let url
	if (/^[a-zA-Z0-9-_]{11}$/.test(videoId)) {
		url = `https://www.youtube.com/watch?v=${videoId}`
	}
	else if (validator.isURL(videoId, { protocols: ['http', 'https'] })) {
		url = videoId
	}
	else {
		return chat.say('Error')
	}
	const stream = ytdl(url).pipe(fs.createWriteStream(`static/${process.env.FB_VERIFY_TOKEN}.mp4`))
	stream.on('error', () => {
		chat.say('Error')
	})
	stream.on('close', () => {
		chat.say({
			attachment: 'video',
			url: `${process.env.ENDPOINT}/${process.env.FB_VERIFY_TOKEN}.mp4`
		})
	})
}

const listenMsg = (port) => {
	console.log(`BootBot running on port ${port}`)
	console.log(`Facebook Webhook running on localhost:${port}/webhook`)
}

if (process.env.NODE_ENV != 'development') {
	bot.app.use((req, res, next) => {
		if (req.secure) {
			next()
		}
		else {
			res.redirect(`https://${req.hostname}${req.originalUrl}`)
		}
	})
}

bot.app.use(express.static('static'))

bot.hear([regPlay], (payload, chat) => {
	const videoId = payload.message.text.replace(regPlay, '$1')
	play(chat, videoId.trim())
})

bot.hear([regSearch], (payload, chat) => {
	const [, query, pageStart] = payload.message.text.trim().match(regSearch)
	ytSearch({
		query,
		pageStart
	}, (err, r) => {
		if (err) {
			chat.say('Error')
		}
		else {
			for (const video of r.videos) {
				chat.say({
					text: `${video.author.name}\n${video.title}\n${video.duration.timestamp}`,
					buttons: [
						{ type: 'postback', title: 'play', payload: video.videoId }
					]
				})
			}
		}
	})
})

bot.on('postback', (payload, chat) => {
	play(chat, payload.postback.payload)
})

fs.ensureDir('static').then(() => {
	if (process.env.NODE_ENV == 'development') {
		bot.start(3000)
	}
	else {
		bot._initWebhook()
		bot.app.listen(80, listenMsg.bind(null, 80))
		bot.server = https.createServer({
			key: fs.readFileSync(process.env.HTTPS_KEY),
			cert: fs.readFileSync(process.env.HTTPS_CERT),
			ca: fs.readFileSync(process.env.HTTPS_CA)
		}, bot.app).listen(443, listenMsg.bind(null, 443))
	}
})