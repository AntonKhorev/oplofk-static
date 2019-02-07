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
		if (!(segmentName in segments)) {
			throw `segment "${segmentName}" used in survey data file "${filename}" not found in segment data`
		}
		const segment=segments[segmentName]
		const lats=[], lons=[]
		for (let node of segment.nodes) {
			lats.push(Math.round(node[0]*100000))
			lons.push(Math.round(node[1]*100000))
		}
		surveyedSegments.set(segmentName,[
			lats,lons,segment.name,segment.description,surveyDate,surveyChangesets
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
			const makeDeltaCompressor=()=>{
				let a=0
				return x=>{
					const d=x-a
					a=x
					return d
				}
			}
			const latCompressor=makeDeltaCompressor()
			const lonCompressor=makeDeltaCompressor()
			const surveyedSegmentsArray=[]
			surveyedSegments.forEach((surveyedSegment)=>{
				const copySegment=[...surveyedSegment]
				copySegment[0]=copySegment[0].map(latCompressor)
				copySegment[1]=copySegment[1].map(lonCompressor)
				surveyedSegmentsArray.push(copySegment)
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
