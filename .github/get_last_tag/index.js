const core = require('@actions/core')
const github = require('@actions/github')

async function run(){
	const token = core.getInput("token")
	const octokit = github.getOctokit(token)

	const owner = core.getInput("owner")
	const repo = core.getInput("repository")

	const tag = core.getInput("tag")
	let {data: releases} = await octokit.rest.repository.releases({owner, repo})
	console.log(releases)
}
