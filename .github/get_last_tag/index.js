const core = require('@actions/core')
const github = require('@actions/github')
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
	const octokit = github.getOctokit(token)

	const owner = core.getInput("owner")
	const repo = core.getInput("repository")
	// const tag = core.getInput("tag")
	const bump = core.getInput("bump").toLowerCase()
	if (bump !== "major" && bump !== "minor"){
		core.setFailed("bump may only be 'major' or 'minor'")
		return
	}

	/** @type {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api.rest} */
	const api = octokit.rest

	core.info("Getting Latest Tag")
	let lastTag = await getBiggestTag(api, owner, repo, null)
	if (lastTag === null){
		core.setFailed("Unable to find last tag")
		return
	} else {
		core.info(`Bumping ${bump} for ${lastTag.tag_name}`)
	}

	let version = SemVer.parseSemVer(lastTag.tag_name)
	switch (bump){
		case "major":
			version.major = parseInt(version.major) + 1
			version.minor = 0
			version.patch = 0
			break
		case "minor":
			version.minor = parseInt(version.minor) + 1
			version.patch = 0
			break
	}
	core.info(`Next version: v${version.major}.${version.minor}`)

	core.setOutput("last", lastTag.tag_name)
	core.setOutput("next", `v${version.major}.${version.minor}`)
}

/**
 *
 * @param {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api.rest} api
 * @param {string} owner
 * @param {string} repo
 * @param {int} per_page
 * @returns {AsyncGenerator<*, void, *>}
 */
async function* getTags(api, owner, repo, per_page = 20){
	let page = 0
	let page_length = per_page

	while (page_length === per_page){
		page++
		let {data: releases} = await api.repos.listReleases({owner, repo, per_page, page})
		for (let release of releases){
			yield release
		}
		page_length = releases.length
	}
}

/**
 *
 * @param {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api.rest} api
 * @param {string} owner
 * @param {string} repo
 * @param {?string} before
 * @returns {Promise<void>}
 */
async function getBiggestTag(api, owner, repo, before = null){
	core.info(`Getting last tag before ${before ? before : "LATEST"}`)
	const releases = getTags(api, owner, repo)
	let biggestLast = null
	let last = before === null ? before : make_full(before)

	for await (let release of releases){

		let tag_name = release.tag_name
		core.startGroup(`Testing ${tag_name}`)
		let tag_semver = make_full(tag_name)
		core.info(`\tExpands to ${tag_semver}`)
		let tag_version = SemVer.parseSemVer(tag_semver)
		core.info(`\tParses as ${tag_version.major}.${tag_version.minor}.${tag_version.patch}`)

		if (last !== null){
			core.info(`\tChecking before ${last}`)
			let testMajor = parseInt(tag_version.major)
			core.info(`\tMajor Version: ${testMajor}`)
			let lastMajor = parseInt(SemVer.parseSemVer(last).major)
			core.info(`\tChecking Against: ${lastMajor}`)

			if (testMajor !== lastMajor && testMajor !== (lastMajor - 1)){
				core.info(`\tFailed to Match.`)
				core.endGroup()
				continue;
			}
		}

		if (biggestLast !== null && SemVer.compareSemVer(tag_semver, make_full(biggestLast.tag_name)) <= 0){
			core.info(`\t${biggestLast.tag_name} was bigger than ${tag_version}`)
			core.endGroup()
			continue;
		}

		core.info("Updated Latest Tag")
		core.endGroup()
		biggestLast = release
	}

	return biggestLast
}

run()
