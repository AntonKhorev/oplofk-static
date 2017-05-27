const fs=require('fs')
const readline=require('readline')
const mkdirp=require('mkdirp')
const OSMStream=require('node-osm-stream')
const html=require('./html')

const readSegments=(filename,callback)=>{
	const nodes={}
	const ways={}
	const parser=OSMStream()
	fs.createReadStream(filename).pipe(parser).on('data',()=>{}).on('end',()=>{
		callback(ways)
	})
	parser.on('node',(node,callback)=>{
		nodes[node.id]=[node.lat,node.lon]
		callback(null)
	}).on('way',(way,callback)=>{
		ways[way.tags.name]={
			name: way.tags.name,
			description: way.tags.description,
			nodes: way.nodes.map(nodeId=>nodes[nodeId]),
		}
		callback(null)
	}).on('relation',(way,callback)=>{
		callback(null)
	})
}

const readSurveys=(filename,segments,callback)=>{
	const surveyedSegments=new Map()
	readline.createInterface({
		input: fs.createReadStream(filename)
	}).on('line',(line)=>{
		const [segmentName,surveyDate,surveyChangesets]=line.split(';')
		if (surveyedSegments.has(segmentName)) {
			surveyedSegments.delete(segmentName) // force reorder
		}
		const segment=segments[segmentName]
		const points=[]
		for (let node of segment.nodes) {
			for (let n of node) {
				points.push(Math.round(n*100000))
			}
		}
		const surveyedSegment={
			n: segment.name,
			d: segment.description,
			p: points,
			t: surveyDate,
		}
		if (surveyChangesets.length>0) {
			surveyedSegment.c=surveyChangesets
		}
		surveyedSegments.set(segmentName,surveyedSegment)
	}).on('close',()=>{
		callback(surveyedSegments)
	})
}

const writeHtml=(prefix,htmlName,title)=>{
	fs.writeFile(`public_html/${htmlName}`,html(prefix,title))
}

const writeData=(prefix)=>{
	readSegments(`${prefix}.osm`,(segments)=>{
		readSurveys(`${prefix}.csv`,segments,(surveyedSegments)=>{
			let firstSegment=true
			let data='var data=['
			surveyedSegments.forEach((surveyedSegment)=>{
				if (firstSegment) {
					firstSegment=false
				} else {
					data+=','
				}
				let firstKey=true
				data+='{'
				for (let k in surveyedSegment) {
					if (firstKey) {
						firstKey=false
					} else {
						data+=','
					}
					data+=k+':'+JSON.stringify(surveyedSegment[k])
				}
				data+='}'
			})
			data+=']'
			fs.writeFile(`public_html/${prefix}.js`,data)
		})
	})
}

const writeDistrict=(prefix,htmlName,title)=>{
	writeHtml(prefix,htmlName,title)
	writeData(prefix)
}

module.exports=(pages)=>{
	mkdirp('public_html',()=>{
		fs.createReadStream(`${__dirname}/map.js` ).pipe(fs.createWriteStream('public_html/map.js' ))
		fs.createReadStream(`${__dirname}/map.css`).pipe(fs.createWriteStream('public_html/map.css'))
		for (let page of pages) {
			writeDistrict(...page)
		}
	})
}
