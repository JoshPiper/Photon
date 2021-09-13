const {writeFileSync} = require("fs")
const {resolve} = require("path")

const core = require('@actions/core')
const SemVer = require("semver-parser")

let used = require("./used.json")
let municipalities = require("./data.json")

const letters = [
	"a", "b", "c", "d", "e", "f", "g",
	"h", "i", "j", "k", "l", "m", "n",
	"o", "p", "q", "r", "s", "t", "u",
	"v", "w", "x", "y", "z"
]

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

function pack(municipalities){
	let starter = {}

	for (let municipality of municipalities){
		let letter = municipality.substr(0, 1).toLowerCase()
		starter[letter] = (starter[letter] !== undefined ? starter[letter] : [])
		starter[letter].push(municipality)
	}

	return starter
}

async function run(){
	const token = core.getInput("token")
	const tag = make_full(core.getInput("next"))
	const version = SemVer.parseSemVer(tag)

	if (version.minor !== 0 && version.minor !== undefined){
		core.setOutput("series", used[version.major.toString()])
		core.warning("Patch versions don't get an updated series title.")
		return
	}

	/** @type {{string: string[]}} */
	let starter = pack(municipalities)

	let availableLetters = Object.keys(starter)
	availableLetters = availableLetters.sort((a, b) => a.localeCompare(b))
	let count = availableLetters.length

	core.info(`There are ${count} letters with active municipalities, totalling ${municipalities.length}.`)
	core.info(`Current version is: ${version.major}`)
	core.info(`v71 was cycle 1, 'e', replaying from there.`)

	let letterId = 4
	for (let major = 71; major <= version.major; major++){
		core.startGroup(`v${major}`)
		if (used[major] !== undefined){
			let usedCity = used[major.toString()]
			let letter = usedCity.substr(0, 1).toLowerCase()
			letterId = letters.indexOf(letter)
			core.info(`v${major} used ${usedCity}, removing from data.`)
			municipalities = municipalities.filter(municipality => municipality !== usedCity)
		} else {
			if (major !== version.major){
				core.warning(`v${major} was not saved!`)
			}

			if (municipalities.length === 0){
				core.setFailed("We have ran out of municipalities!")
				return
			}

			core.info("Repacking Municipalities")
			starter = pack(municipalities)

			letterId = (letterId + 1) % letters.length
			let letter = letters[letterId]
			core.info(`This version's name should be start with ${letter}`)

			while (starter[letter] === undefined){
				core.info(`${letter} has no available municipalities`)
				letterId = letterId = (letterId + 1) % letters.length
				letter = letters[letterId]
			}

			core.info(`This version will start with ${letter}`)
			let cities = starter[letter]
			core.info(`There are ${cities.length} possible options: ${cities.join(", ")}`)
			let pick = cities[Math.floor(Math.random() * cities.length)]
			core.info(`We will use ${pick}.`)

			used[major.toString()] = pick
			municipalities = municipalities.filter(municipality => municipality !== pick)

			if (major === version.major){
				core.setOutput("series", pick)
			}
		}
		core.endGroup()
	}

	if (municipalities.length < 20){
		core.warning(`Only ${municipalities.length} unused municipalities remain in the pool!`)
	}

	writeFileSync(resolve(__dirname, "used.json"), JSON.stringify(used))
	core.info("Updated used.json")
}
run()
