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
		const surveyedSegment={
			n: segment.name,
			d: segment.description,
			p: segment.nodes.map(node=>node.map(n=>+n.toFixed(5))),
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
			surveyedSegmentsArray=[]
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
