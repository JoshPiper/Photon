const core = require('@actions/core')
const github = require('@actions/github')
const SemVer = require("semver-parser")

async function run(){
	const token = core.getInput("token")
	const octokit = github.getOctokit(token)

	const owner = core.getInput("owner")
	const repo = core.getInput("repository")
	const tag = core.getInput("tag")

	/** @type {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api.rest} */
	const api = octokit.rest
	let last = null
	let biggestLast = null

	const releases = getTags(api, owner, repo)
	for await (let release of releases){
		console.log(release)

		let tag_name = release.tag_name

		let major_only = /^v?\d+$/
		let major_minor_only = /^v?\d+\.\d+$/
		let full = /^v?\d+\.\d+\.\d+$/

		let version
		if (tag_name.match(full)){
			version = SemVer.parseSemVer(tag_name)
		} else if (tag_name.match(major_minor_only)){
			version = SemVer.parseSemVer(tag_name + ".0")
		} else if (tag_name.match(major_only)){
			version = SemVer.parseSemVer(tag_name + ".0.0")
		}

		if (!version){
			continue;
		}

		console.log(version)
	}
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

run()
