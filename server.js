// Passenger startup file for cPanel's "Setup Node.js App".
// Point the application's "Application startup file" at this file.
const next = require('next')
const http = require('http')

const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const port = process.env.PORT || 3000
  const base = process.env.BASE_PATH || ''
  http
    .createServer((req, res) => {
      // Passenger strips the base URI from req.url, but Next was built with
      // basePath and expects it — restore the prefix when it's missing.
      if (base && !req.url.startsWith(base)) req.url = base + req.url
      handle(req, res)
    })
    .listen(port, () => {
      console.log(`resume-builder ready on port ${port}`)
    })
})
