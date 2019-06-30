const msg = process.argv[2]
const reg = /^search (.+) (\d+)$/i

if (reg.test(msg)) {
	const [, query, page] = msg.trim().match(reg)
	console.log(query.trim())
	console.log(page)
}