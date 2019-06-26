const BootBot = require('bootbot')
const fs = require('fs-extra')
const ytdl = require('ytdl-core')
const express = require('express')
const ytSearch = require('yt-search')
require('dotenv').config()

const bot = new BootBot({
	accessToken: process.env.FB_ACCESS_TOKEN,
	verifyToken: process.env.FB_VERIFY_TOKEN,
	appSecret: process.env.FB_APP_SECRET
})

const play = (chat, url) => {
	const stream = ytdl(url).pipe(fs.createWriteStream('static/video.mp4'))
	stream.on('close', () => {
		chat.say({
			attachment: 'video',
			url: 'https://52.35.251.213/video.mp4'
		})
	})
}

bot.app.use(express.static('static'))

bot.hear([/^play\s+.*$/i], (payload, chat) => {
	const url = payload.message.text.replace(/^play\s+(.*)$/, '$1')
	play(chat, url)
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
	bot.start(process.env.PORT)
})