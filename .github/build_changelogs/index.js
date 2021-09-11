const core = require('@actions/core')
const github = require('@actions/github')
const {inspect} = require("util")
const changelog = require("conventional-changelog-core")

async function run(){
	const token = core.getInput("token")
	const before = core.getInput("before")
	const after = core.getInput("after")

	let buffer = changelog({
		context: {
			previousTag: before,
			currentTag: after
		}
	})
	core.info(buffer)
	core.info(typeof buffer)
}
run()
