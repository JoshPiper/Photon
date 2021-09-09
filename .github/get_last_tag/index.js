const core = require('@actions/core')
const github = require('@actions/github')

async function run(){
	const token = core.getInput("token")
	const octokit = github.getOctokit(token)

	const owner = core.getInput("owner")
	const repo = core.getInput("repository")
	const tag = core.getInput("tag")

	/** @type {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api.rest} */
	const rest = octokit.rest

	let {data: releases} = await rest.repos.listReleases({owner, repo})
	console.log(releases)
}
run()
