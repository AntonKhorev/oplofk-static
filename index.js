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
		const [segmentName,surveyDate,surveyChangesetsString]=line.split(';')
		let surveyChangesets=[]
		if (surveyChangesetsString.length>0) {
			surveyChangesets=surveyChangesetsString.split(',').map(Number)
		}
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
		surveyedSegments.set(segmentName,[
			segment.name,segment.description,points,surveyDate,surveyChangesets
		])
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
			const surveyedSegmentsArray=[]
			surveyedSegments.forEach((surveyedSegment)=>{
				surveyedSegmentsArray.push(surveyedSegment)
			})
			fs.writeFile(`public_html/${prefix}.js`,'var data='+JSON.stringify(surveyedSegmentsArray))
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
