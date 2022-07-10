/*
	Copyright (c) 2022 duggavo
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

const ejs = require("ejs");
const fs = require("fs");
const sharp = require("sharp");

const head = fs.readFileSync("./public/template.html").toString()

const config = require("../config.json")

const wallet_rpc = require("./walletRpc");

const wallet = new wallet_rpc(config.wallet.hostname, config.wallet.port, config.wallet.user, config.wallet.pass)

const rateLimit = require("./rateLimit.js")

const admins = config.admins;


const KB = 1024;
const MB = 1024 * KB;


function requireLogin(req, res) {
	if (!req.session.username) {
		res.status(400).end(redirectTo("/login"));
		return true;
	}
	return false;
}
function redirectTo(url) {
	return `<!DOCTYPE HTML><html><body><meta http-equiv="Refresh" content="0; url='${url}'"></html>`
}
function illegalChar(text) {
	return !/^[ -~]+$/.test(text)
}

function precision(num, digits) {
	return parseFloat(num.toFixed(digits))
}
function genid() {
	return Math.round((Math.round((Date.now() - 1647441423600) / 1000) + Math.random()) * 1000000).toString(36)
}
const crypto = require("crypto")
function hashTxt(text, salt) {
	var hashed = crypto.pbkdf2Sync(text, salt, 4096, 64, "sha512").toString("base64");
	return hashed;
}

function validateShortString(str) {
	if (!str || str.length < 4 || str.length > 100) return false;
	return true;
}

const captcha = require("./captcha");

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

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
// end utility functions


function renderEjs(file, vars, pagename) {
	let v2 = {
		siteName: "MuchTips",

	}
	for (i in vars) {
		v2[i] = vars[i]
	}
	if (!pagename) {
		pagename = v2.siteName + "!";
	} else {
		pagename = v2.siteName + "!" + " - " + pagename
	}

	const fileContent = fs.readFileSync("./public/" + file + ".ejs")


	return ejs.render(head.replace("%content%", fileContent).replace("%pagename%", pagename), v2)


}


let save = JSON.parse(fs.readFileSync("./save/u.json").toString());
function resave() {
	fs.writeFileSync("./save/u.json", JSON.stringify(save, null, "\t"))
}

let pendingApproval = JSON.parse(fs.readFileSync("./save/pending.json").toString());
function savePending() {
	fs.writeFileSync("./save/pending.json", JSON.stringify(pendingApproval, null, "\t"))
}

let memes = JSON.parse(fs.readFileSync("./save/memes.json").toString());
function saveMemes() {
	fs.writeFileSync("./save/memes.json", JSON.stringify(memes, null, "\t"))
}

let memesCache = {
	6969696969696969: {
		payIns: {},
		payOuts: {},
		tips: 12.141
	}
}

function updateCache() {
	for (x in memes) {
		let $x = x;
		wallet.get_transfers(memes[$x].addr, true, true, true, false, true).then(res => {
			let payIns = [];
			let payOuts = [];
			let tips = 0;
			let _in = {
				...res.in,
				...res.pending,
			};
			let _out = res.out;
			for (i in _in) {
				tips += _in[i].amount / 10 ** 11;
				payIns.push({
					amount: _in[i].amount / 10 ** 11,
					timeAgo: timeAgo(Date.now() - _in[i].timestamp * 1000),
					txid: _in[i].txid
				})
			}
			for (i in _out) {
				payOuts.push({
					amount: _out[i].amount / 10 ** 11,
					timeAgo: timeAgo(Date.now() - _out[i].timestamp * 1000),
					txid: _out[i].txid
				})
			}
			wallet.get_address(memes[$x].addr).then(xrs => {
				if (!xrs) return;

				memesCache[$x] = {
					payIns: payIns,
					payOuts: payOuts,
					tips: tips,
					addr: xrs.address
				}
				memes[$x].amt = tips

			})

		})

	}


}
updateCache(); setInterval(updateCache, MINUTE * 10)

function payMemes() {
	console.log("Paying out memes")
	for (let $x in memes) {
		if (save.u[memes[$x].user].addr && save.u[memes[$x].user].addr.length > 10) {
			wallet.get_balance(memes[$x].addr).then(res => {
				if (res.unlocked_balance / 10 ** 11 > 0.05) {
					console.log("Sending " + res.unlocked_balance / 10 ** 11 + " WOW to meme " + $x + " ")
					wallet.sweep_all(memes[$x].addr, save.u[memes[$x].user].addr)
				}
			})
		}
	}
	setTimeout(() => {
		wallet.store();
	}, 10000)
}
payMemes(); setInterval(payMemes, HOUR * 10)

module.exports = (app) => {

	app.use((req,res,next)=>{
		res.setHeader("Cache-Control", "no-cache")
		res.setHeader("X-FRAME-OPTIONS", "deny");
		res.setHeader("Content-Security-Policy", "default-src 'self'; img-src *;")
		next();
	})

	app.get("*", (req, res, next) => {
		if (rateLimit(req,res,4)) return;
		if (req.url.includes("..")) {
			return res.status(400).end("400")
		} else {
			next()
		}
	})


	app.get("/css/style.css", (req,res)=>{
		if (req.session.darkTheme) {
			return res.end(fs.readFileSync("./public/css/style.css").toString() + fs.readFileSync("./public/css/dark.css").toString())
		} else {
			return res.end(fs.readFileSync("./public/css/style.css").toString())
		}
	}) 


	app.get("/", (req, res) => {
		res.setHeader("Cache-Control", "max-age=300")


		let pageMessages = {
			"1": "Meme submitted and pending approval!"
		}
		let $_memes = memes;
		let memesSortText = "Latest";
		if (req.query.sort ) {
			if (req.query.sort === "trending") {
				$_memes.sort((a, b) => {
					var a_age = (Date.now() - a.date) / (DAY * 7);
					var a_score = a.amt / a_age;
	
					var b_age = (Date.now() - b.date) / (DAY * 7);
					var b_score = b.amt / b_age;
					return a_score > b_score;
				})
				memesSortText = "Trending"
			} else if (req.query.sort === "best") {
				$_memes.sort((a, b) => {
					return a.amt > b.amt
				})

				memesSortText = "Top";
			} else {
				return res.status(404).end(redirectTo("/"))
			}

		}

		return res.end(renderEjs("index", {
			memes: $_memes,
			memesSortText: memesSortText,
			msg: pageMessages[req.query.e],
			page: parseInt(req.query.page) || 0,
		}));
	})

	app.get("/post/:postid", (req, res) => {
		res.setHeader("Cache-Control", "max-age=600")

		if ( !memes[req.params.postid]) return res.status(404).end(redirectTo("/"));


		return res.end(renderEjs("meme", {
			meme: memes[req.params.postid],
			...memesCache[req.params.postid],

		}))
	})
	app.get("/user/:usr", (req,res)=>{
		res.setHeader("Cache-Control", "max-age=600")

		if (!save.u[req.params.usr]) return res.status(404).end(redirectTo("/"));

		let $_memes = [];
		for (i in memes) {
			if (memes[i].user === req.params.usr) {
				$_memes.push(memes[i])
			}
		}

		return res.end(renderEjs("user", {
			memes: $_memes,
			username: req.params.usr
		}))
	})

	app.get("/toggle_theme", (req, res) => {
		if (req.session.darkTheme) {
			req.session.darkTheme = false;
		} else {
			req.session.darkTheme = true;
		}
		let pages = {
			"account": "/account",
			"about": "/about"

		}
		let redirectPage = pages[req.query.p] || "/"
		return res.end(redirectTo(redirectPage))
	})

	app.get("/account", (req, res) => {
		let accountErrors = {
			"1": "You must enter a valid Wownero address",
		}
		let accountSuccess = {
			"2": "Address successfully changed!",
		}

		if (requireLogin(req, res)) return;
		return res.end(renderEjs("account", {
			address: save.u[req.session.username].addr,
			err: accountErrors[req.query.e],
			suc: accountSuccess[req.query.e],
			admin: admins.includes(req.session.username)
		}))
	})

	app.get("/login", (req, res) => {

		let loginErrors = {
			"1": "Incorrect username or password",
		}

		return res.send(renderEjs("login", {
			err: loginErrors[req.query.e]
		}, "login"))
	})

	app.get("/register", (req, res) => {

		let registerErrors = {
			"1": "Missing one or more fields",
			"2": "Incorrect or missing captcha solution",
			"3": "This account is already registered",
			"4": "Your username must not contain special characters and must be between 4 and 20 characters long"
		}

		return res.send(renderEjs("register", {
			err: registerErrors[req.query.e]
		}, "register"))
	})

	app.get("/captcha", (req,res)=>{
		if (rateLimit(req,res,9)) return;
		return captcha.new(req,res);
	})

	app.post("/register", (req, res) => {
		if (rateLimit(req,res,99)) return;

		if (req.session.username) {
			return res.status(200).end(redirectTo("/"))
		}
		if (!req.body.username || !req.body.password || !req.body.password2 || req.body.password !== req.body.password2) {
			return res.status(400).end(redirectTo("/register?e=1"))
		}

		if (!req.body.captcha || req.body.captcha !== req.session.captcha) {
			return res.status(400).end(redirectTo("/register?e=2"))
		}

		username = req.body.username;
		if (!save.u) {
			save.u = {}
		}
		if (save.u[username]) {
			return res.status(400).end(redirectTo("/register?e=3"))
		}
		if (illegalChar(req.body.username) || req.body.username.length > 20 || req.body.username.length < 4) {
			return res.status(400).end(redirectTo("/register?e=4"))

		}

		let salt = crypto.randomBytes(4).toString("hex")
		save.u[username] = {
			pass: hashTxt(req.body.password, salt),
			salt: salt,
			reg: Date.now(),
			addr: undefined,
			appr: 0,
			ref: 0
		};
		req.session.username = username;
		resave();
		return res.status(200).end(redirectTo("/account"));
	})
	app.post("/login", (req, res) => {
		if (rateLimit(req,res,99)) return;

		if (req.session.username) {
			return res.status(200).end(redirectTo("/dash"))
		}
		if (!req.body.username || !req.body.password) {
			return res.status(400).end(redirectTo("/login?e=1"))
		}

		username = req.body.username;
		if (!save.u || !save.u[username]) {
			return res.status(400).end(redirectTo("/login?e=1"))
		}
		if (save.u[username].pass !== hashTxt(req.body.password, save.u[username].salt)) {
			return res.status(400).end(redirectTo("/login?e=1"))
		}
		req.session.username = username;
		return res.status(200).end(redirectTo("/account"));
	});
	app.post("/logout", (req,res)=>{
		req.session.username = undefined;
		return res.status(200).end(redirectTo("/"))
	})

	app.post("/setWowAddr", (req, res) => {
		if (!req.body || !req.body.addr || req.body.addr.length !== 97) {
			return res.status(400).end(redirectTo("/account?e=1"))
		}
		save.u[username].addr = req.body.addr;
		resave();
		return res.end(redirectTo("/account?e=2"))

	})

	app.get("/submit", (req, res) => {
		let submitErrors = {
			"1": "Incorrect input(s)",
			"2": "Image file too big",
			"3": "This meme has already been uploaded!"
		}




		if (requireLogin(req, res)) return;
		return res.end(renderEjs("submit", {
			"user": req.session.username,
			"err": submitErrors[req.query.e]
		}))
	})
	app.post("/submit", (req, res) => {
		if (requireLogin(req, res)) return;

		if (!req.body.title || req.body.title.length > 40 || req.body.title.length < 4 ||
			!req.files || !req.files.memeimg || !req.files.memeimg.mimetype.startsWith("image/") ||
			(req.body.descrIn && req.body.descrIn.length > 400)
		) return res.status(400).end(redirectTo("/submit?e=1"));

		if (req.files.memeimg.truncated == true) {
			return res.status(400).end(redirectTo("/submit?e=2"))
		}


		let IMGHASH = crypto.createHash("md5").update(req.files.memeimg.file).digest("base64");

		for (i in pendingApproval) {
			if (pendingApproval[i].img === IMGHASH + ".jpg") {
				return res.status(400).end(redirectTo("/submit?e=3"))
			}
		}

		for (i in memes) {
			if (memes[i].img === IMGHASH + ".jpg") {
				return res.status(400).end(redirectTo("/submit?e=3"))
			}
		}


		sharp(req.files.memeimg.file).resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({
			quality: 80,
			mozjpeg: true
		}).toFile("./public/uploads/" + IMGHASH + ".jpg");
		sharp(req.files.memeimg.file).resize({ width: 200, height: 150, fit: "inside" }).jpeg({
			quality: 80,
			mozjpeg: true
		}).toFile("./public/uploads/t_" + IMGHASH + ".jpg");

		pendingApproval.push({
			img: IMGHASH + ".jpg",
			date: Date.now(),
			user: req.session.username,
			title: req.body.title,
			descr: req.body.descrIn
		})
		savePending();
		return res.status(200).end(redirectTo("/?e=1"))
	})

	app.get("/admin", (req, res) => {
		if (requireLogin(req, res)) return;
		if (!admins.includes(req.session.username)) return res.end(redirectTo("/"))
		return res.end(renderEjs("admin", {
			pending: pendingApproval
		}))
	})

	app.get("/approve", (req, res) => {
		if (requireLogin(req, res)) return;
		if (!admins.includes(req.session.username)) return res.end(redirectTo("/"))

		if (!req.query.meme) return res.status(400).end("Missing meme");

		for (i in pendingApproval) {
			if (pendingApproval[i].img === req.query.meme) {
				wallet.create_account().then((xr) => {
					console.log(JSON.stringify / (xr, null, 1))
					if (!xr || !xr.account_index) throw new Error("Response from wallet RPC is " + xr);

					wallet.store()

					memes.push({
						...pendingApproval[i],
						amt: 0,
						addr: xr.account_index
					})
					pendingApproval.splice(i, 1);
					save.u[req.session.username].appr++;
					savePending();
					saveMemes();
					updateCache();
					return res.end(redirectTo("/admin"));

				})



			}
		}
		return res.end("The meme " + req.query.meme + " does not exist!")
	})
	app.get("/refuse", (req, res) => {
		if (requireLogin(req, res)) return;
		if (!admins.includes(req.session.username)) return res.end(redirectTo("/"))

		if (!req.query.meme) return res.status(400).end("Missing meme");

		for (i in pendingApproval) {
			if (pendingApproval[i].img === req.query.meme) {
				pendingApproval.splice(i, 1);
				save.u[req.session.username].ref++;
				savePending();
				return res.end(redirectTo("/admin"));

			}
		}
		return res.end("The meme " + req.query.meme + " does not exist!")
	})

	app.get("/about", (req, res) => {
		return res.end(renderEjs("about"))
	})

	app.use(function (req, res) {
		res.setHeader("Cache-Control", "max-age=1800")

		var url = req.url.split("?")[0]
		if (url.endsWith("/")) {
			url += "index.html"
		}
		if (url.includes("..")) return res.status(404).end("404 Not Found")
		fs.readFile("./public" + url, function (err, data) {
			if (err) {
				if (err.toString().includes("ENOENT")) {
					return res.status(404).end("404 Not Found")
				} else {
					ERR(`URL ${url} ${err}`)
					return res.status(500).end("500 Internal Server Error<br>We've seen the issue, and we're working to fix it!")
				}
			}
			return res.status(200).end(data);
		})
	})

}