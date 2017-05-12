module.exports=(prefix,title)=>`<!DOCTYPE html>
<html lang=ru>
<head>
<meta charset=utf-8>
<title>${title}</title>
<link rel=stylesheet href='https://unpkg.com/leaflet@1.0.3/dist/leaflet.css'>
<script src='https://unpkg.com/leaflet@1.0.3/dist/leaflet.js'></script>
<style>
html, body {
	height: 100%;
	margin: 0;
	padding: 0;
}
#map {
	width: 100%;
	height: 100%;
}
</style>
</head>
<body>
<div id='map'>при включённом js здесь будет карта</div>
</body>
<script src='${prefix}-data.js'></script>
<script src='map.js'></script>
</html>`
