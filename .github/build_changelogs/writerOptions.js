const {readFile} = require("fs")
const {promomisify} = require("util")
const {resolve} = require("path")

let read = promomisify(readFile)

module.exports = async function(){
	let path = resolve(__dirname, "node_modules", "conventional-changelog-angular", "templates")
	let [mainTemplate, headerPartial, commitPartial, footerPartial] = await Promise.all(["template", "header", "commit", "footer"]
		.map(file => resolve(path, `${file}.hbs`))
		.map((p) => read(p, {encoding: "utf8"}))
	)

	return {
		groupBy: 'type',
		commitGroupsSort: 'title',
		commitsSort: ['scope', 'subject'],
		noteGroupsSort: 'title',
		notesSort: require("compare-func"),

		mainTemplate,
		headerPartial,
		commitPartial,
		footerPartial,

		transform: (commit, context) => {
			const issues = []

			commit.notes = commit.notes.map(note => {
				let lcTitle = note.title.toLowerCase()
				if (lcTitle === 'breaking changes'){
					note.title = "BREAKING CHANGES"
				}

				if (lcTitle === 'deprecates' || lcTitle === 'deprecations'){
					note.title = "DEPRECATION WARNINGS"
				}

				return note
			})

			let type = commit.type
			if (type === undefined || type === null){
				return
			}

			type = type.toLowerCase()
			switch (type){
				case 'feat':
				case 'feature':
					commit.type = "Features"
					break
				case 'fix':
				case 'bug':
					commit.type = "Bug Fixes"
					break
				case 'perf':
				case 'performance':
					commit.type = "Performance Improvments"
					break
				case 'removal':
				case 'remove':
				case 'removals':
					commit.type = "Removals"
					break
				case 'revert':
					commit.types = "Reverts"
					break
				case 'doc':
				case 'docs':
				case 'documentation':
					commit.type = "Documentation"
					break
				case 'ref':
				case 'refactor':
					commit.type = "Refactor"
					break
				case 'style':
				case 'styles':
				case 'format':
				case 'reformat':
					commit.type = "Style / Formatting"
					break
				case 'test':
				case 'tests':
					commit.types = "Tests"
					break
				case 'build':
				case 'ci':
				case 'cd':
				case 'ci/cd':
					commit.types = "Builds"
			}
			if (commit.revert){
				commit.type = "Reverts"
			}

			if (commit.scope === "*"){
				commit.scope = ""
			}

			// Pulled from the Angular convention.
			if (typeof commit.hash === 'string') {
				commit.shortHash = commit.hash.substring(0, 7)
			}

			if (typeof commit.subject === 'string') {
				let url = context.repository
					? `${context.host}/${context.owner}/${context.repository}`
					: context.repoUrl
				if (url) {
					url = `${url}/issues/`
					// Issue URLs.
					commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
						issues.push(issue)
						return `[#${issue}](${url}${issue})`
					})
				}
				if (context.host) {
					// User URLs.
					commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
						if (username.includes('/')) {
							return `@${username}`
						}

						return `[@${username}](${context.host}/${username})`
					})
				}
			}

			// remove references that already appear in the subject
			commit.references = commit.references.filter(reference => {
				if (issues.indexOf(reference.issue) === -1) {
					return true
				}

				return false
			})

			return commit
		},
	}
}
