const crypto = require("crypto");
const http = require("http");
const https = require("https");

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

function httpPost(reqUrl, body, {...options}) {
	if (typeof body === "object") {
		body = JSON.stringify(body)
		if (!options.headers) options.headers = {};
		options.headers["Content-Type"] = "application/json"
	}
	return new Promise((resolve,reject) => {
		const pUrl = new URL(reqUrl)
		const netm = pUrl.protocol == "https:" ? https : http;
		const req = netm.request({
			method: "POST",
			host: pUrl.host,
			path: pUrl.pathname,
			...options,
		}, res => {
			const chunks = [];
			res.on("data", data => chunks.push(data))
			res.on("end", () => {
				let resBody = Buffer.concat(chunks);
				if (resBody.length == 0) {
					resBody = undefined;
				}
				switch(res.headers["content-type"]) {
					case "application/json":
						resBody = JSON.parse(resBody);
						break;
				}
				resolve(resBody)
			})
		})
		req.on("error",reject);
		if(body) {
			req.write(body);
		}
		req.end();
	})
}
function hashTxt(text, salt) {
	var hashed = crypto.pbkdf2Sync(text, salt, 4096, 64, "sha512").toString("base64");
	return hashed;
}
function timeAgo(t) {
	if (t > DAY * 2) {
		return Math.round(t / DAY) + " days"
	} else if (t > HOUR * 2) {
		return Math.round(t / HOUR) + " hours"
	} else if (t > MINUTE * 2) {
		return Math.round(t / MINUTE) + " minutes"
	} else {
		return Math.round(t / SECOND) + " seconds"
	}
}
function formatTime(t) {
	const d = new Date(t)

	return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`
}
function hexToBase36(t) {
	return BigInt("0x"+t).toString(36)
}

module.exports = {
	httpPost,
	hashTxt,
	timeAgo,
	formatTime,
	hexToBase36
}