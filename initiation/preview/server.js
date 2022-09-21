const fs = require('fs')
const { execSync } = require('child_process')
const http = require('http')
const express = require('express')
const { createServer } = require('vite')
const reactRefresh = require('@vitejs/plugin-react-refresh').default

const deployedContracts = {
	get() {
		try {
			return JSON.parse(
				fs.readFileSync('preview/.deployed_contracts.json', 'utf8')
			)
		} catch (err) {
			// file not found
			return null
		}
	},
	set(data) {
		return fs.writeFileSync(
			'preview/.deployed_contracts.json',
			JSON.stringify(data)
		)
	},
}

async function init() {
	async function compile() {
		let cmd = 'rm -rf artifacts/* && yarn hardhat compile'
        try {
            const output = execSync(cmd).toString()
            return output
        } catch(error) {
            console.log(`Error compiling contract: ${error.message}`)
        }
	}

	function extractContractsBuildInfo() {
		try {
		    const file = fs.readdirSync('artifacts/build-info')[0]
		    if (!file) return null
		    const output = JSON.parse(
			fs.readFileSync(`artifacts/build-info/${file}`, 'utf8')
		    ).output
		    return output
		} catch(error) {
		    return null
		}
	}

	const app = express()

	app.get('/', async (req, res) => {
		const template = await vite.transformIndexHtml(
			req.originalUrl,
			fs.readFileSync('preview/doc.html', 'utf8')
		)

		res.end(template)
	})

	app.get('/compile', (req, res) => {
		res.json(compile()).end()
	})

	app.get('/attempt-compile', async (req, res) => {
		const out = await compile()
		if (out === 'Nothing to compile') {
			return res.json({ idle: true })
		} else {
			return res.json({
				output: extractContractsBuildInfo(),
			})
		}
	})

	app.get('/contracts', async (req, res) => {
		const contracts = deployedContracts.get()
		res.json(contracts)
	})

	app.post('/contracts', express.json(), async (req, res) => {
		if (req.body) {
			deployedContracts.set(req.body)
		}
		res.json({ success: true }).end()
	})

	const server = http.createServer(app)

	const vite = await createServer({
		plugins: [reactRefresh()],
		server: {
			middlewareMode: 'ssr',
			hmr: {
				clientPort: 1337,
				server: server,
			},
		},
		configFile: false,
	})

	app.use(vite.middlewares)

	server.listen(1337, () => {
		console.log('Server ready')
	})
}

init()
