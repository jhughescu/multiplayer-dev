const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const path = require('path');

const app = express();
const port = 3000;
const server = http.createServer(app);

app.engine('handlebars', exphbs.engine({extname: '.hbs', defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));



server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
//    initApp();
});
