function fitText(string, maxLength = 53) {
	var result = string;
	if (result.length > maxLength + 1) {
		result = string.substring(0, maxLength - 1) + "…";
	}
	return result;
}

document.getElementById("uploadF").onchange = function () {
	var src = URL.createObjectURL(this.files[0])
	document.getElementById('image').src = src
}
setInterval(() => {
	document.getElementById("memetitle").innerText = fitText(document.getElementById("titleIn").value,);
	document.getElementById("memedescr").innerText = fitText(document.getElementById("descrIn").value);
}, 100)
