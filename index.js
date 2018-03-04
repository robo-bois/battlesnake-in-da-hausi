const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

const Hausi = require('./Hausi.js');

const snakes = {};

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)



// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  if (snakes[request.body.game_id] === undefined) {
      snakes[request.body.game_id] = {};
  }
  
  snakes[request.body.game_id].gameData = request.body;
  
  return response.json(Hausi.snakeData);
})

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  var snake = snakes[request.body.id][request.body.you];
    
  if (snake === undefined) {
      snake = 
          snakes[request.body.id][request.body.you] = 
          new Hausi(snakes[request.body.id].gameData);
  }
  
  return response.json(snake.getMove(request.body));
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
