"use strict";

class Hausi {
    constructor(startData) {
        this._gameId = startData.game_id;
        this._boardWidth = startData.width;
        this._boardHeight = startData.height;
        this._snake = null;
    }

    get gameId() {
        return this._gameId;
    }

    get boardWidth() {
        return this._boardWidth;
    }

    get boardHeight() {
        return this._boardHeight;
    }
    
    get snake() {
        return this._snake;
    }
    
    get snakeLength() {
        return this.snake.body.data.length;
    }
    
    get justAte() {
        return this._justAte;
    }
    
    get findMode() {
        return {
            food: 1,
            snake: 2,
            tail: 3,
            attack: 4,
            space: 5,
        }
    }
    
    get square() {
        return {
            // Safe squares
            normal: 0,
            potHead: 1,
            potHeadFood: 2,
            food: 3,
            
            // Danger squares
            body: 4,
            head: 5,
            tail: 6,
            ourHead: 7,
        }
    }
    

    static get snakeData() {
        return {
            color: '#770103',
            secondary_color: '#220103',
            head_url: 'http://saner.unimol.it/img/steering/HausiMuller.png',
            taunt: 'BLOG POST!',
            head_type: 'safe',
            tail_type: 'fat-rattle',
          }
    }
    
    genBoard() {
        let board = new Array(this.boardWidth);
        for (let i = 0; i < this.boardWidth; i++) {
            board[i] = new Array(this.boardHeight);
            for (let j = 0; j < this.boardHeight; j++) {
                board[i][j] = 0;
            }
        }
        return board;
    }
    
    addSnake(board, snake) {
        // If snek is a big guy, the locations its head can move are bad
        let potHeadFoodFlag = false;
        let coords = snake.body.data;
        
        if (snake.id !== this.snake.id) {
            let typeOfPotHead = coords.length >= this.snakeLength ? this.square.body : this.square.potHead;
            
            let headX = coords[0].x;
            let headY = coords[0].y;
            
            if(headX > 0) {
                board[headX - 1][headY] = typeOfPotHead;
                potHeadFoodFlag = potHeadFoodFlag || board[headX - 1][headY] === this.square.food;
            }
            
            if(headY > 0) {
                board[headX][headY - 1] = typeOfPotHead;
                potHeadFoodFlag = potHeadFoodFlag || board[headX][headY - 1] === this.square.food;
            }
            
            if(headX < this.boardWidth - 1) {
                board[headX + 1][headY] = typeOfPotHead;
                potHeadFoodFlag = potHeadFoodFlag || board[headX + 1][headY] === this.square.food;
            }
            
            if(headY < this.boardHeight - 1) {
                board[headX][headY + 1] = typeOfPotHead;
                potHeadFoodFlag = potHeadFoodFlag || board[headX][headY + 1] === this.square.food;
            }
        }
                
        let isFirst = true;
        
        // Fill board with bad squares where da snakeys are
        for (let i = 0; i < coords.length - !potHeadFoodFlag; i++)  {
            let coord = coords[i];
            board[coord.x][coord.y] = isFirst ? this.square.head : this.square.body;
            isFirst = false;
        }
        
        return board;
    }
    
    printBoard(board) {
        for (let y = 0; y < this.boardHeight; y++) {
            let line = '';
            for (let x = 0; x < this.boardWidth; x++) {
                line += ' ' + board[x][y];
            }
            console.log(line);
        }
    }


    getMove(gameData) {
        // 0 = regular square, 1 = food square, 2 = snake/potential snake body, 3 = snake head, 4 = our snake head, 5 = our tail
        console.log('starting move');
        
        
        //Create board with all 0's
        let board = this.genBoard();

        // Get our snake
        this._snake = gameData.snakes.data.find((snake) => {
            return snake.id === gameData.you.id;
        });

        // Fill foods with 1's
        for (let foodCoord of gameData.food.data) {
            board[foodCoord.x][foodCoord.y] = this.square.food;
        }

        // Fill bad squares with 2's for body, 3's for head
        for (let snake of gameData.snakes.data) {
            board = this.addSnake(board, snake);
        }
        
        // Find tail and track it with 5
        let tailCoords = this.snake.body.data[this.snakeLength - 1];
        board[tailCoords.x][tailCoords.y] = this.square.tail;

        // Find our head and make it 6 (note was 4)
        let ourHeadX = this.snake.body.data[0].x;
        let ourHeadY = this.snake.body.data[0].y;
        board[ourHeadX][ourHeadY] = this.square.ourHead;

        // Decide our strategy
        let cur_mode = this.findMode.food;
        
        if(this.snake.health > 50)
            cur_mode = this.findMode.attack;
        
        // Try to find something
        console.log('cur mode = ' + cur_mode); 
        let findStartLoc = [this.snake.body.data[0].x, this.snake.body.data[0].y];
        let foundNode = this.findPath(board, findStartLoc, cur_mode);
        let foundWhatLookingFor = foundNode !== null;
        
        // If not found
        while (!foundWhatLookingFor) {
            console.log('no find. ' + this.snake.body.data[0].x + ',' + this.snake.body.data[0].y);
            
            if (cur_mode === this.findMode.attack) 
                cur_mode = this.findMode.food;
            else if (cur_mode === this.findMode.food)
                cur_mode = this.findMode.tail;
            else {
                break;
            }
        
            foundNode = this.findPath(board, findStartLoc, cur_mode);
            foundWhatLookingFor = foundNode !== null;
           
            console.log('cur mode = ' + cur_mode); 
        }
        
        if (!foundWhatLookingFor) {
            let tailPlace;
            //Find Tail
            for(let i = this.snakeLength - 1; i > 0; i--) {
                tailPlace = this.snake.body.data[i];
                board[tailPlace.x][tailPlace.y] = this.square.tail;
                
                foundNode = this.findPath(board, findStartLoc, this.findMode.tail);
                
                if(foundNode !== null)
                    break;
                    
                board[tailPlace.x][tailPlace.y] = this.square.body;
            }
        }
        
        
        let dir = foundNode ? foundNode.dir : this.lastResort(board)
        
        
        let bad = false;
        if (dir === 'up' && (findStartLoc[1] < 1 || board[findStartLoc[0]][findStartLoc[1] - 1] === this.square.body))
            bad = true;
        else if (dir === 'down' && (findStartLoc[1] >= this.boardHeight || board[findStartLoc[0]][findStartLoc[1] + 1] === this.square.body))
            bad = true;
        else if (dir === 'right' && (findStartLoc[0] >= this.boardWidth || board[findStartLoc[0] + 1][findStartLoc[1]] === this.square.body))
            bad = true;
        else if (dir === 'left' && (findStartLoc[0] < 1 ||  board[findStartLoc[0] - 1][findStartLoc[1]] === this.square.body))
            bad = true;
            
        if (bad) {
            dir = this.lastResort(board);
            console.log('snake was retarded, going ' + dir);
        }
        

        /*if(finalDir == -1){
          //FUCK NO TAIL, STALL
          finalDir = findFood(board,us.coords[0],STALLID);
        }*/
        
        console.log(dir);
        
        if (this.justAte)
            this._justAte = false;
        
        if (foundWhatLookingFor && cur_mode === this.findMode.food && foundNode.len === 1) // if we are about to eat
            this._justAte = true;

        return {
            move: dir, // one of: ['up','down','left','right']
            //taunt: 'Girth first baby', // optional, but encouraged!
        }
    }
    
    checkIfFits(nextPos, node, board) {
        switch (node.dir) {
            case 'up':
                nextPos[1]--;
                break;
            case 'right':
                nextPos[0]++;
                break;
            case 'down':
                nextPos[1]++;
                break;
            case 'left':
                nextPos[0]--;
                break;
        }
        
        // Check if we have enough space to fit whole body
        if (this.findPath(board, nextPos, this.findMode.space) < this.snakeLength)
            return false;
            
        return true;
    }

    findPath(board, pos, mode) {
        let visited = [];
        for (let i = 0; i < this.boardWidth; i++) {
            visited[i] = [];
            for (let j = 0; j < this.boardHeight; j++) {
                visited[i][j] = false;
            }
        }

        let queue = [];

        let rootNode = {
            pos: pos,
            dir: null,
            len: 0
        };

        visited[pos[0]][pos[1]] = true;
        queue.push(rootNode);

        // Set up variables based on mode
        let isTarget;
        let isSafe;
        let foundTarget;
        let noTarget;
        switch (mode) {
            case this.findMode.food:
                isTarget = (num) => {
                    return num === this.square.food; // Food
                };
                isSafe = (num) => {
                    return num <= this.square.food; // Square is food or empty
                };
                foundTarget = (node) => {
                    // See if we are closest (or equal dist)
                    let closest = this.findPath(board, node.pos, this.findMode.snake);
                    if (closest.len < node.len)
                        return false;
                        
                    if (!this.checkIfFits(pos, node, board))
                         return false;
                    
                    return true; // If we are the closest snek, go go eat mmm
                };
                break;
            case this.findMode.snake:
                isTarget = (num) => {
                    return num === this.square.ourHead || num === this.square.head; // Snake head or our head
                };
                isSafe = (num) => {
                    return num <= this.square.food || isTarget(num); // empty, food, snake head, or our head
                };
                foundTarget = (node) => {
                    return true;
                };
                break;
            case this.findMode.tail:
                isTarget = (num) => {
                    return num === this.square.tail; // our tail 
                };
                isSafe = (num) => {
                    return num <= this.square.food || isTarget(num); // empty, food, our tail
                };
                foundTarget = (node) => {
                    let realTailX = this.snake.body.data[this.snakeLength - 1].x;
                    let realTailY = this.snake.body.data[this.snakeLength - 1].y;
                    
                    if (!this.checkIfFits(pos, node, board))
                         return false;
                    
                    return (!this.justAte && this.snakeLength > 3 && node.pos[0] === realTailX && node.pos[1] === realTailY) || node.len > 1; //return direction to tail piece
                };
                break;
            case this.findMode.attack:
                isTarget = (num) => {
                    return num === this.square.potHead; // our tail 
                };
                isSafe = (num) => {
                    return num <= this.square.food || isTarget(num); // empty, food, snake head, or our head
                };
                foundTarget = (node) => {
                    if (!this.checkIfFits(pos, node, board))
                         return false;
                    
                    return true;
                };
                break;
            case this.findMode.space:
                isTarget = (num) => {
                    return false;
                };
                isSafe = (num) => {
                    return num === this.square.food || num === this.square.normal || num === this.square.potHead;
                };
                noTarget = (visited) => {
                    return visited.map((arr) => arr.reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0);
                };
                break;
        }
        
        if (mode === this.findMode.space) {
            if (!isSafe(board[pos[0]][pos[1]]))
                return 0;
        }

        while (queue.length > 0) {
            let thisNode = queue.shift();
            let thisX = thisNode.pos[0];
            let thisY = thisNode.pos[1];

            if (isTarget(board[thisX][thisY]) && foundTarget(thisNode)) {
                return thisNode;
            }

            // Add to queue all valid directions
            if (thisY > 0 && isSafe(board[thisX][thisY - 1]) && visited[thisX][thisY - 1] === false) {
                visited[thisX][thisY - 1] = true;
                queue.push({
                    pos: [thisX, thisY - 1],
                    dir: thisNode.dir === null ? "up" : thisNode.dir,
                    len: thisNode.len + 1
                });
            }

            if (thisX < this.boardWidth - 1 && isSafe(board[thisX + 1][thisY]) && visited[thisX + 1][thisY] === false) {
                visited[thisX + 1][thisY] = true;
                queue.push({
                    pos: [thisX + 1, thisY],
                    dir: thisNode.dir === null ? "right" : thisNode.dir,
                    len: thisNode.len + 1
                });
            }

            if (thisY < this.boardHeight - 1 && isSafe(board[thisX][thisY + 1]) && visited[thisX][thisY + 1] === false) {
                visited[thisX][thisY + 1] = true;
                queue.push({
                    pos: [thisX, thisY + 1],
                    dir: thisNode.dir === null ? "down" : thisNode.dir,
                    len: thisNode.len + 1
                });
            }

            if (thisX > 0 && isSafe(board[thisX - 1][thisY]) && visited[thisX - 1][thisY] === false) {
                visited[thisX - 1][thisY] = true;
                queue.push({
                    pos: [thisX - 1, thisY],
                    dir: thisNode.dir === null ? "left" : thisNode.dir,
                    len: thisNode.len + 1
                });
            }
        }

        //no food move
        return noTarget ? noTarget(visited) : null;
    }
    
    lastResort(board) {
        
        console.log('fukin last resort boissssss fuk me. ' + this.snake.body.data[0].x + ',' + this.snake.body.data[0].y)
        //Lasttttt resortttt
        // Try up, right, down, left
        let ourHeadX = this.snake.body.data[0].x; 
        let ourHeadY = this.snake.body.data[0].y;
        
        let potentials = {
            up: -1,
            down: -1,
            left: -1,
            right: -1,
        }
        
        if (ourHeadY > 0 && board[ourHeadX][ourHeadY - 1] <= this.square.food)
            potentials.up = this.findPath(board, [ourHeadX, ourHeadY - 1], this.findMode.space);
        if (ourHeadX < this.boardWidth - 1 && board[ourHeadX + 1][ourHeadY] <= this.square.food)
            potentials.right = this.findPath(board, [ourHeadX + 1, ourHeadY], this.findMode.space);
        if (ourHeadY < this.boardHeight - 1 && board[ourHeadX][ourHeadY + 1] <= this.square.food)
            potentials.down = this.findPath(board, [ourHeadX, ourHeadY + 1], this.findMode.space);
        if (ourHeadX > 0 && board[ourHeadX - 1][ourHeadY] <= this.square.food)
            potentials.left = this.findPath(board, [ourHeadX - 1, ourHeadY], this.findMode.space);
            
        let maxVal = potentials.up;
        let maxDir = 'up';
        
        if (potentials.right > maxVal) {
            maxVal = potentials.right;
            maxDir = 'right';
        }
        
        if (potentials.down > maxVal) {
            maxVal = potentials.down;
            maxDir = 'down';
        }
        
        if (potentials.left > maxVal) {
            maxVal = potentials.left;
            maxDir = 'left';
        }
        
        return maxDir;
    }
}

module.exports = Hausi;
