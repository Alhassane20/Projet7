const http = require('http');
const app = require('./app');

const normalizePort = val => { // Renvoie un port valide, qu'il soit fourni sous la forme d'un numero ou d'une chaine
    const port = parseInt(val, 10);
    if (isNaN(port)) {
      return val;
    }
    if (port >= 0) {
      return port;
    }
    return false;
  };
const port = normalizePort(process.env.PORT || '4000');
app.set('port',port)

const errorHandler = error => { // Recherche les differentes erreurs et les gere de maniere appropriee. La fonction est ensuite enregistree dans le serveur
    if (error.syscall !== 'listen') {
      throw error;
    }
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges.');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use.');
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

const server = http.createServer(app);

server.on('error', errorHandler); //  Ecouteur d'evenements, consigne le port nommé sur lequel le serveur s'execute dans la console.
server.on('listening', () => {
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
  console.log('Listening on ' + bind);
});

server.listen(port);