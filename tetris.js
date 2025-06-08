class Tetris {
    constructor() {
        this.canvas = document.getElementById('tetris');
        this.context = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next');
        this.nextContext = this.nextCanvas.getContext('2d');
        
        this.arena = this.createMatrix(10, 20);
        this.player = {
            pos: {x: 0, y: 0},
            matrix: null,
        };
        
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.paused = false;
        this.gameOver = false;
        
        this.colors = [
            null,
            '#FF0D72', // I
            '#0DC2FF', // O
            '#0DFF72', // T
            '#F538FF', // S
            '#FF8E0D', // Z
            '#FFE138', // J
            '#3877FF', // L
        ];
        
        this.pieces = 'ILJOTSZ';
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        
        this.playerReset();
        this.updateScore();
        this.update();
        
        this.setupEventListeners();
    }
    
    createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }
    
    createPiece(type) {
        switch (type) {
            case 'I':
                return [
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                ];
            case 'L':
                return [
                    [0, 2, 0],
                    [0, 2, 0],
                    [0, 2, 2],
                ];
            case 'J':
                return [
                    [0, 3, 0],
                    [0, 3, 0],
                    [3, 3, 0],
                ];
            case 'O':
                return [
                    [4, 4],
                    [4, 4],
                ];
            case 'T':
                return [
                    [0, 5, 0],
                    [5, 5, 5],
                    [0, 0, 0],
                ];
            case 'S':
                return [
                    [0, 6, 6],
                    [6, 6, 0],
                    [0, 0, 0],
                ];
            case 'Z':
                return [
                    [7, 7, 0],
                    [0, 7, 7],
                    [0, 0, 0],
                ];
        }
    }
    
    collide(arena, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }
    
    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x],
                ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }
        
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }
    
    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--;
            this.merge(this.arena, this.player);
            this.playerReset();
            this.arenaSweep();
            this.updateScore();
        }
        this.dropCounter = 0;
    }
    
    playerMove(offset) {
        this.player.pos.x += offset;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.x -= offset;
        }
    }
    
    playerReset() {
        this.player.matrix = this.nextPiece;
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        this.player.pos.y = 0;
        this.player.pos.x = (this.arena[0].length / 2 | 0) -
                           (this.player.matrix[0].length / 2 | 0);
        
        if (this.collide(this.arena, this.player)) {
            this.gameOver = true;
            this.showGameOver();
        }
        
        this.drawNext();
    }
    
    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this.rotate(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.rotate(this.player.matrix, -dir);
                this.player.pos.x = pos;
                return;
            }
        }
    }
    
    arenaSweep() {
        let rowCount = 1;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x] === 0) {
                    continue outer;
                }
            }
            
            const row = this.arena.splice(y, 1)[0].fill(0);
            this.arena.unshift(row);
            ++y;
            
            this.lines += rowCount;
            this.score += rowCount * 10 * this.level;
            rowCount *= 2;
        }
        
        this.level = Math.floor(this.lines * 0.1) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    }
    
    draw() {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }
    
    drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.context.fillStyle = this.colors[value];
                    this.context.fillRect(x * 30 + offset.x * 30,
                                        y * 30 + offset.y * 30,
                                        30, 30);
                    this.context.strokeStyle = '#000';
                    this.context.lineWidth = 2;
                    this.context.strokeRect(x * 30 + offset.x * 30,
                                          y * 30 + offset.y * 30,
                                          30, 30);
                }
            });
        });
    }
    
    drawNext() {
        this.nextContext.fillStyle = '#000';
        this.nextContext.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const offsetX = (this.nextCanvas.width / 30 - this.nextPiece[0].length) / 2;
            const offsetY = (this.nextCanvas.height / 30 - this.nextPiece.length) / 2;
            
            this.nextPiece.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.nextContext.fillStyle = this.colors[value];
                        this.nextContext.fillRect((x + offsetX) * 30,
                                                (y + offsetY) * 30,
                                                30, 30);
                        this.nextContext.strokeStyle = '#000';
                        this.nextContext.lineWidth = 2;
                        this.nextContext.strokeRect((x + offsetX) * 30,
                                                  (y + offsetY) * 30,
                                                  30, 30);
                    }
                });
            });
        }
    }
    
    update(time = 0) {
        if (this.gameOver || this.paused) {
            return;
        }
        
        const deltaTime = time - this.lastTime;
        
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }
        
        this.lastTime = time;
        
        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }
    
    updateScore() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('lines').innerText = this.lines;
        document.getElementById('level').innerText = this.level;
    }
    
    showGameOver() {
        document.getElementById('finalScore').innerText = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.arena = this.createMatrix(10, 20);
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.paused = false;
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        this.playerReset();
        this.updateScore();
        document.getElementById('gameOver').style.display = 'none';
        this.update();
    }
    
    hardDrop() {
        while (!this.collide(this.arena, this.player)) {
            this.player.pos.y++;
            this.score += 2;
        }
        this.player.pos.y--;
        this.playerDrop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', event => {
            if (this.gameOver) return;
            
            switch (event.keyCode) {
                case 37: // Left
                    this.playerMove(-1);
                    break;
                case 39: // Right
                    this.playerMove(1);
                    break;
                case 40: // Down
                    this.playerDrop();
                    break;
                case 38: // Up (Rotate)
                    this.playerRotate(1);
                    break;
                case 32: // Space (Hard drop)
                    event.preventDefault();
                    this.hardDrop();
                    break;
                case 80: // P (Pause)
                    this.paused = !this.paused;
                    if (!this.paused) {
                        this.update();
                    }
                    break;
            }
        });
    }
}

function restartGame() {
    tetris.restart();
}

const tetris = new Tetris();