// Passenger startup file for cPanel's "Setup Node.js App".
// Point the application's "Application startup file" at this file.
const next = require('next')
const http = require('http')

const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const port = process.env.PORT || 3000
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, () => {
      console.log(`resume-builder ready on port ${port}`)
    })
})
