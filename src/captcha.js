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

const crypto = require("crypto");
const bgCol = "white";
const textCol = "black";

function randomStr(length) {
	var result           = "";
	var characters       = "AaBbDdEeFfGgHhiLMmNnQqRrTtYy123456789";

	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(crypto.randomInt(characters.length));
	}
	return result;
}


module.exports.new = (req, res)=>{
	let captchaTxt = randomStr(5);
	req.session.captcha = captchaTxt
	createCaptcha({
		text: captchaTxt
	},(captcha)=>{
		res.type("png");
		return res.status(200).end(captcha)
	})
}
const sharp = require("sharp")

function createCaptcha(option, callback) {

	var settings = {
		width: 200,
		height: 25,
		numberOfLinesH: 1,
		numberOfLinesW: 3,
		linesWidth: 1.5,
		fontSize: 22,
		text: "CAPTCHA",
		fontFamily: "sans-serif",
		noise: 4
	}

	for (i in option) {
		settings[i] = option[i]
	}

	var height = settings.height;
	var linesMargin = 10
	var text = settings.text.split("");

	var txt2disp = "";
	for (i in text) {
		txt2disp += `<text x="${settings.width / text.length * i + 5}" y="${settings.height / 2 + settings.fontSize / 4
		+ (Math.random() * settings.noise  - settings.noise/2)
		}"
		
		fill="${textCol}" font-size="${settings.fontSize}px" font-family="${settings.fontFamily}">${text[i]}</text>`
	}

	function genNum() {
		return Math.round(Math.random() * (height + linesMargin) - (linesMargin / 2))
	}
	
	function genNumW() {
		return Math.round(Math.random() * (settings.width + linesMargin) - (linesMargin / 2))
	}

	var lns = "";
	for (var i = 0; i < settings.numberOfLinesH; i++) {
		lns += `<line x1="0" y1="${genNum()}" x2="${settings.width}" y2="${genNum()}" style="stroke:${textCol};stroke-width:${settings.linesWidth}" />`
	}
	for (var i = 0; i < settings.numberOfLinesW; i++) {
		lns += `<line y1="0" x1="${genNumW()}" y2="${settings.height}" x2="${genNumW()}" style="stroke:${textCol};stroke-width:${settings.linesWidth}" />`
	}

	var captchaSVG = `<svg height="${height}" width="${settings.width}">
	<rect width="100%" height="100%" fill="${bgCol}" />
	${lns}
	${txt2disp}

	</svg>`


	sharp(Buffer.alloc(captchaSVG.length, captchaSVG)).png(
		{
			colors: 16,
			compressionLevel: 3,
		}).toBuffer((err, data, info) => {
		if (err) return console.log(err);
		return callback(data)
	})


}
