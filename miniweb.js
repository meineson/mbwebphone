const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = 3000;

const options = {
	key: fs.readFileSync('./key/privatekey.pem'), //密钥路径
	cert: fs.readFileSync('./key/certificate.pem')
};

const server = https.createServer(options, (req, res) => {
  //allow local file://app.html access        
  const filePath = path.join(__dirname, './', req.url === '/' ? 'index.html' : req.url);
  const fileExt = path.extname(filePath);
  let contentType = 'text/html';
  switch (fileExt) {
    case '.css':
      contentType = 'text/css';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.ico':
      contentType = 'image/x-icon';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
    case '.js':
      contentType = 'text/javascript';
      break;
    // 可以根据需要添加更多类型
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        // 如果文件不存在，返回404状态码和消息。
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      // 其他错误处理。
      res.writeHead(500);
      res.end('Sorry, check with the site admin for error: ' + err.code + ' ..\n');
      return;
    }
    // 成功读取文件，设置内容类型并返回文件内容。
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Permissions-Policy", "camera=*,microphone=*,display-capture=*,speaker-selection=*");
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});
  
server.listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}/`);
});    