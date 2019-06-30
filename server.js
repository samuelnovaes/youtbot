const BootBot = require('bootbot')
const fs = require('fs-extra')
const ytdl = require('ytdl-core')
const express = require('express')
const ytSearch = require('yt-search')
const https = require('https')
require('dotenv').config()

const bot = new BootBot({
	accessToken: process.env.FB_ACCESS_TOKEN,
	verifyToken: process.env.FB_VERIFY_TOKEN,
	appSecret: process.env.FB_APP_SECRET
})

const play = (chat, videoId) => {
	const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`).pipe(fs.createWriteStream(`static/${process.env.FB_VERIFY_TOKEN}.mp4`))
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

bot.hear([/^play\s+.*$/i], (payload, chat) => {
	const videoId = payload.message.text.replace(/^play\s+(.*)$/, '$1')
	play(chat, videoId)
})

bot.hear([/^search\s+.*$/i], (payload, chat) => {
	const query = payload.message.text.replace(/^search\s+(.*)$/, '$1')
	ytSearch(query, (err, r) => {
		for (const video of r.videos) {
			chat.say({
				text: `${video.author.name}\n${video.title}\n${video.duration.timestamp}`,
				buttons: [
					{ type: 'postback', title: 'play', payload: video.videoId }
				]
			})
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