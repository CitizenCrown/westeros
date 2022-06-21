const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html' })
        fs.createReadStream('./public/index.html').pipe(res)
    }
    else {
        const path = `.${req.url}`
        var extension = path.split('.').pop();
        var ctype = "text/content"
        switch (extension) {
            case 'js':
                ctype = "text/javascript"
                break
            case 'css':
                ctype = "text/css"
                break
            case 'ico':
                ctype = "text/content"
                break

        }
        fs.readFile(path, function (err, content) {
            res.writeHead(200, { "Content-Type": ctype });
            res.end(content);
        });
    }
})

server.listen(process.env.PORT || 3000)
