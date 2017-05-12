#!/usr/bin/env node

const fs=require('fs')
const oplofkStatic=require('.')

fs.readFile('districts.json','utf8',(err,data)=>{
	if (err) throw err
	const districts=JSON.parse(data)
	const pages=[]
	for (let prefix in districts) {
		const district=districts[prefix]
		if (district.htmlName===undefined) {
			district.htmlName=`${prefix}.html`
		}
		pages.push([prefix,district.htmlName,district.title])
	}
	oplofkStatic(pages)
})
