const fs=require('fs')
const readline=require('readline')
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

const readSurveys=(filename,segments,goldCallback,endCallback)=>{
	const surveyedSegments={}
	readline.createInterface({
		input: fs.createReadStream(filename)
	}).on('line',(line)=>{
		const [segmentName,surveyDate,surveyChangesetsString,goldString]=line.split(';')
		let surveyChangesets=[]
		if (surveyChangesetsString.length>0) {
			surveyChangesets=surveyChangesetsString.split(',').map(Number)
		}
		if (!(segmentName in segments)) {
			throw `segment "${segmentName}" used in survey data file "${filename}" not found in segment data`
		}
		if (!(segmentName in surveyedSegments)) {
			const segment=segments[segmentName]
			const lats=[], lons=[]
			for (let node of segment.nodes) {
				lats.push(Math.round(node[0]*100000))
				lons.push(Math.round(node[1]*100000))
			}
			surveyedSegments[segmentName]=[
				lats,lons,segment.name,segment.description,[]
			]
		}
		const [,,,,surveys]=surveyedSegments[segmentName]
		const survey=[surveyDate,surveyChangesets]
		if (goldString!==undefined) {
			const goldId=Number(goldString)
			if (goldId>0) goldCallback(goldId)
			survey.push(goldId)
		}
		surveys.push(survey)
	}).on('close',()=>{
		endCallback(surveyedSegments)
	})
}

const writeHtml=(prefix,htmlName,title)=>{
	fs.writeFile(`public_html/${htmlName}`,html(prefix,title),()=>{})
}

const writeData=(prefix)=>{
	readSegments(`${prefix}.osm`,(segments)=>{
		readSurveys(`${prefix}.csv`,segments,(goldId)=>{
			fs.mkdir('public_html/gold',{recursive:true},()=>{
				fs.copyFile(`gold/${goldId}.osm`,`public_html/gold/${goldId}.osm`,()=>{})
			})
		},(surveyedSegments)=>{
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
			for (const surveyedSegment of Object.values(surveyedSegments)) {
				const copySegment=[...surveyedSegment]
				copySegment[0]=copySegment[0].map(latCompressor)
				copySegment[1]=copySegment[1].map(lonCompressor)
				surveyedSegmentsArray.push(copySegment)
			}
			fs.writeFile(`public_html/${prefix}.js`,'var data='+JSON.stringify(surveyedSegmentsArray),()=>{})
		})
	})
}

const writeDistrict=(prefix,htmlName,title)=>{
	writeHtml(prefix,htmlName,title)
	writeData(prefix)
}

module.exports=(pages)=>{
	fs.mkdir('public_html',{recursive:true},()=>{
		fs.copyFile(`${__dirname}/map.js` ,'public_html/map.js' ,()=>{})
		fs.copyFile(`${__dirname}/map.css`,'public_html/map.css',()=>{})
		for (let page of pages) {
			writeDistrict(...page)
		}
	})
}
