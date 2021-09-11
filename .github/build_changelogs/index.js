const core = require('@actions/core')
const github = require('@actions/github')
const {inspect} = require("util")
const changelog = require("conventional-changelog-core")

function stream_to_string(stream, encoding="utf8"){
	/** @type {Buffer[]} buffers */
	let buffers = []

	return new Promise((resolve, reject) => {
		stream.on("data", data => {
			if (data instanceof Buffer){
				buffers.push(data)
			} else if (typeof data === "string"){
				buffers.push(Buffer.from(data))
			} else {
				reject("Only non-object mode buffers are accepted.")
			}
		})

		stream.on("error", err => reject(err))
		stream.on("end", () => resolve(Buffer.concat(buffers).toString(encoding)))
	})
}

async function run(){
	const token = core.getInput("token")
	const before = core.getInput("before")
	const after = core.getInput("after")

	let stream = changelog({
		context: {
			previousTag: before,
			currentTag: after
		}
	})
	core.info(stream)

	let changelog = stream_to_string(stream)
	core.info(changelog)
}
run()
