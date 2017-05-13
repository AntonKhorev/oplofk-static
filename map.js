var defaultColorThreshold=6, maxColorThreshold=36
function computePolygonColor(age,threshold) {
	var month=1000*60*60*24*30
	var span1=threshold*month, span2=maxColorThreshold*month
	var hotness,hotnessPercent
	if (age<span1) {
		hotness=(span1-age)/span1
		hotnessPercent=Math.round(100*hotness)
		return "rgb("+hotnessPercent+"%,0%,"+(100-hotnessPercent)+"%)"
	} else if (age<span2) {
		hotness=(span2-age)/(span2-span1)
		hotnessPercent=Math.round(100*hotness)
		return "rgb(0%,0%,"+hotnessPercent+"%)"
	} else {
		return "#000"
	}
}

var div=document.getElementById('map')
div.innerHTML=''
var map=L.map(div).addLayer(L.tileLayer(
	'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	{attribution: "© <a href=https://www.openstreetmap.org/copyright>Участники OpenStreetMap</a>"}
))
var now=Date.now()
var segmentLayer=L.featureGroup(data.map(function(segment){
	var popupHtml=
		"<strong>"+segment.n+"</strong><br>"+segment.d+"<br><br>"+
		"проверено <time>"+segment.t+"</time>"
	if (segment.c.length>0) {
		popupHtml+=", записано в пакете <a href=https://www.openstreetmap.org/changeset/"+segment.c+">"+segment.c+"</a>"
	}
	var age=now-Date.parse(segment.t)
	var segmentPolygon=L.polygon(segment.p,{color:computePolygonColor(age,defaultColorThreshold)}).bindPopup(popupHtml)
	segmentPolygon.age=age
	return segmentPolygon
})).addTo(map)
map.fitBounds(segmentLayer.getBounds())

L.Control.ColorSlider=L.Control.extend({
	options: {
		position: 'bottomleft'
	},
	onAdd: function(){
		var div=L.DomUtil.create('div','leaflet-control-layers')
		var slider=L.DomUtil.create('input','',div)
		slider.type='range'
		slider.min=1
		slider.max=maxColorThreshold-1
		slider.value=defaultColorThreshold
		L.DomEvent.on(slider,'change',function(ev){
			segmentLayer.eachLayer(function(segmentPolygon){
				segmentPolygon.setStyle({color:computePolygonColor(segmentPolygon.age,slider.value)})
			})
		})
		L.DomEvent.disableClickPropagation(div)
		return div
	}
})
L.control.colorSlider=function(options){
	return new L.Control.ColorSlider(options)
}
L.control.colorSlider().addTo(map)
