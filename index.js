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



const config = require("./config.json")


const KB = 1024;
const MB = 1024 * KB;


const fs = require("fs");
const crypto = require("crypto");

const express = require("express");

const session = require("express-session");

const bb = require("./src/bb") // Express-BusBoy

const app = express();




bb.extend(app, {
	limits: {
		fieldSize: 1 * MB,
	},
	maxFileSize: 1*MB,
	upload: true,
	path: "./temp",
	allowedPath: function(url) {
		return url == "/submit";
	}
})



app.use(session({
	secret: config.secret + crypto.randomInt(281474976710655).toString(36),
	resave: true,
	saveUninitialized: true,
	name: "sessid",
	resave: false,
	rolling: true,
	cookie: {maxAge: 86400*1000} 
}));



app.set("view engine", "ejs");
app.set("views", __dirname + "/public");

app.listen(config.port,()=>{
	console.log("Server listening on port "+config.port)
})




const requestPath = require("./src/requestPath");

requestPath(app);



app.use((err, req, res, next) => {
	if (res.headersSent) return next(err);
	res.status(500).end(fs.readFileSync("./public/500.html"))
	console.error(err)
});