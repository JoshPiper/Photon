const core = require('@actions/core')
const github = require('@actions/github')
const {inspect, promisify} = require("util")
const changelog = require("conventional-changelog-core")
const angular = require("conventional-changelog-angular")
const {readFileSync: readFile} = require("fs")
const {resolve} = require("path")
const childProcess = require("child_process")

const writerOptions = require("./writerOptions")

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

/**
 * Call git rev-list and unshallow until it successfully works or fails.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<void>}
 */
async function unshallow_until_revs(from, to = "HEAD"){
	while (true){
		try {
			let response = await exec("git", ["log", `-n=1`, from, "--"])
			core.startGroup("rev-list")
			core.info(inspect(response))
			core.endGroup()

			if (response.stdout.trim() === ""){
				let response = await exec("git", ["fetch", "--deepen=10"])
				core.startGroup("deepen")
				core.info(inspect(response))
				core.endGroup()
				continue;
			}

			return
		} catch (e){
			/** @type {Error} e */
			if (e.stderr.trim() === `fatal: bad revision '${from}'`){
				let response = await exec("git", ["fetch", "--deepen=10"])
				core.startGroup("deepen")
				core.info(inspect(response))
				core.endGroup()
			} else {
				core.error(e.stderr.trim())
				core.setFailed(e)
				throw e
			}
		}
	}
}

async function run(){
	const token = core.getInput("token")
	const before = core.getInput("before")
	const after = core.getInput("after")

	const _writerOptions = await writerOptions()

	// await unshallow_until_revs(before)
	let stream = changelog({
		config: angular,
		// debug: core.info,
		transform: function(commit, done){
			// old categories: deprecation, changes, features, bug fixes, core library, commands & settings.
			// types: feature, fix, change, removal
			// scopes: library, commands, settings

			core.startGroup("commit pre-transform")
			core.info(inspect(commit))
			core.endGroup()

			if (typeof commit.header === "string" && commit.type === null){
				let prefix = commit.header.match(/^\[([~+-])\]/)
				if (prefix !== null){
					prefix = prefix[1]
					core.info(`found prefix: ${prefix}`)
					switch (prefix){
						case "+":
							commit.type = "feature"
							break
						case "-":
							commit.type = "removal"
							break
						case "~":
							commit.type = "fix"
							break
					}
					commit.header = commit.header.substr(3).trimLeft()
				}

			}



			core.startGroup("commit post-transform")
			core.info(inspect(commit))
			core.endGroup()
			return done(null, commit)
		}
	}, {
		previousTag: before,
		currentTag: after,
		version: after
	}, {
		from: before
	}, {
		noteKeywords: ['BREAKING CHANGE', 'DEPRECATES']
	}, _writerOptions)

	let log = await stream_to_string(stream)
	core.info(log)
}
run()
