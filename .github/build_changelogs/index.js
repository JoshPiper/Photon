const core = require('@actions/core')
const github = require('@actions/github')
const {inspect, promisify} = require("util")
const changelog = require("conventional-changelog-core")
const childProcess = require("child_process")

const exec = promisify(childProcess.execFile)

/**
 * Read a stream, and return the read data as a string on stream closure.
 * @param {import("Stream").ReadableStream} stream
 * @param {BufferEncoding} encoding
 * @returns {Promise<string>}
 */
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

	let refs = `${before}..HEAD`

	let response = await exec("git", ["rev-list", refs, "--count"])
	console.log(response)

	let stream = changelog({
		// debug: core.info,
	}, {
		previousTag: before,
		currentTag: after
	})
	core.info(stream)

	let log = await stream_to_string(stream)
	core.info(log)
}
run()
