const core = require('@actions/core')
const SemVer = require("semver-parser")

/**
 * Appends any required ".0" to make a partial tag into a full semver tag (v75 -> v75.0.0)
 * @param {string} tag
 * @returns {string|null}
 */
function make_full(tag){
	if (tag.match(/^v?\d+\.\d+\.\d+$/)){
		return tag
	} else if (tag.match(/^v?\d+\.\d+$/)){
		return tag + ".0"
	} else if (tag.match(/^v?\d+$/)){
		return tag + ".0.0"
	}

	return null
}

async function run(){
	const token = core.getInput("token")
	const tag = make_full(core.getInput("next"))
	const version = SemVer.parseSemVer(tag)

	if (version.minor !== 0 && version.minor !== undefined){
		core.setOutput("series", "")
		return
	}
	/** @type {string[]} */
	let data = require("./data.json")
	let starter = {}
	for (let municipality of data){
		let letter = municipality.substr(0, 1).toLowerCase()
		starter[letter] = (starter[letter] ?? 0) + 1
	}

	let count = Object.keys(starter).length
	core.info(`There are ${count} letters with active municipalities`)

}
run()
