module.exports=(prefix,title)=>`<!DOCTYPE html>
<html lang=ru>
<head>
<meta charset=utf-8>
<title>${title}</title>
<link rel=stylesheet href=https://unpkg.com/leaflet@1.0.3/dist/leaflet.css>
<script src=https://unpkg.com/leaflet@1.0.3/dist/leaflet.js></script>
<link rel=stylesheet href=map.css>
</head>
<body>
<div id=map>при включённом js здесь будет карта</div>
<script src=${prefix}.js></script>
<script src=map.js></script>
</body>
</html>`
