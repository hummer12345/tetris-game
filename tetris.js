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
        this.holdPiece = null;
        this.canHold = true;
        this.combo = 0;
        this.lastRotation = null;
        
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
    
    holdCurrentPiece() {
        if (!this.canHold) return;
        
        if (this.holdPiece === null) {
            this.holdPiece = this.player.matrix;
            this.playerReset();
        } else {
            const temp = this.holdPiece;
            this.holdPiece = this.player.matrix;
            this.player.matrix = temp;
            this.player.pos.x = (this.arena[0].length / 2 | 0) -
                               (this.player.matrix[0].length / 2 | 0);
            this.player.pos.y = 0;
        }
        
        this.canHold = false;
        this.drawHold();
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
        
        this.canHold = true;
        this.drawNext();
    }
    
    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        const originalMatrix = this.player.matrix.map(row => [...row]);
        
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
        
        this.lastRotation = {
            piece: this.player.matrix,
            pos: {x: this.player.pos.x, y: this.player.pos.y},
            wallKick: offset !== 1
        };
    }
    
    arenaSweep() {
        let rowCount = 0;
        let linesCleared = [];
        
        for (let y = this.arena.length - 1; y > 0; --y) {
            let fullRow = true;
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x] === 0) {
                    fullRow = false;
                    break;
                }
            }
            
            if (fullRow) {
                linesCleared.push(y);
                const row = this.arena.splice(y, 1)[0].fill(0);
                this.arena.unshift(row);
                ++y;
                ++rowCount;
            }
        }
        
        if (rowCount > 0) {
            this.combo++;
            this.lines += rowCount;
            
            let baseScore = 0;
            let isTSpin = this.checkTSpin(linesCleared, rowCount);
            
            if (isTSpin) {
                switch (rowCount) {
                    case 1: baseScore = 800; break;
                    case 2: baseScore = 1200; break;
                    case 3: baseScore = 1600; break;
                }
            } else {
                switch (rowCount) {
                    case 1: baseScore = 100; break;
                    case 2: baseScore = 300; break;
                    case 3: baseScore = 500; break;
                    case 4: baseScore = 800; break;
                }
            }
            
            const comboBonus = Math.max(0, (this.combo - 1) * 50);
            this.score += (baseScore + comboBonus) * this.level;
            
            if (isTSpin) {
                this.showTSpinMessage(rowCount);
            }
        } else {
            this.combo = 0;
        }
        
        this.level = Math.floor(this.lines * 0.1) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    }
    
    checkTSpin(linesCleared, rowCount) {
        if (!this.lastRotation || rowCount === 0) return false;
        
        const piece = this.lastRotation.piece;
        if (!this.isTetromino(piece, 'T')) return false;
        
        const pos = this.lastRotation.pos;
        const corners = [
            {x: pos.x, y: pos.y},
            {x: pos.x + 2, y: pos.y},
            {x: pos.x, y: pos.y + 2},
            {x: pos.x + 2, y: pos.y + 2}
        ];
        
        let filledCorners = 0;
        corners.forEach(corner => {
            if (corner.x < 0 || corner.x >= this.arena[0].length ||
                corner.y < 0 || corner.y >= this.arena.length ||
                this.arena[corner.y][corner.x] !== 0) {
                filledCorners++;
            }
        });
        
        return filledCorners >= 3;
    }
    
    isTetromino(matrix, type) {
        const tPiece = this.createPiece('T');
        
        for (let rotation = 0; rotation < 4; rotation++) {
            if (this.matricesEqual(matrix, tPiece)) {
                return true;
            }
            this.rotate(tPiece, 1);
        }
        return false;
    }
    
    matricesEqual(matrix1, matrix2) {
        if (matrix1.length !== matrix2.length) return false;
        for (let y = 0; y < matrix1.length; y++) {
            if (matrix1[y].length !== matrix2[y].length) return false;
            for (let x = 0; x < matrix1[y].length; x++) {
                if ((matrix1[y][x] > 0) !== (matrix2[y][x] > 0)) return false;
            }
        }
        return true;
    }
    
    showTSpinMessage(lines) {
        const messageElement = document.getElementById('tspin-message');
        if (messageElement) {
            let message = 'T-SPIN ';
            switch(lines) {
                case 1: message += 'SINGLE!'; break;
                case 2: message += 'DOUBLE!'; break;
                case 3: message += 'TRIPLE!'; break;
            }
            messageElement.innerText = message;
            messageElement.style.display = 'block';
            
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 2000);
        }
    }
    
    draw() {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawGhost();
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
    
    drawGhost() {
        const ghost = {
            pos: {x: this.player.pos.x, y: this.player.pos.y},
            matrix: this.player.matrix
        };
        
        while (!this.collide(this.arena, ghost)) {
            ghost.pos.y++;
        }
        ghost.pos.y--;
        
        ghost.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.context.fillStyle = this.colors[value] + '33';
                    this.context.fillRect((x + ghost.pos.x) * 30,
                                        (y + ghost.pos.y) * 30,
                                        30, 30);
                    this.context.strokeStyle = this.colors[value] + '88';
                    this.context.lineWidth = 1;
                    this.context.strokeRect((x + ghost.pos.x) * 30,
                                          (y + ghost.pos.y) * 30,
                                          30, 30);
                }
            });
        });
    }
    
    drawHold() {
        const holdCanvas = document.getElementById('hold');
        if (!holdCanvas) return;
        
        const holdContext = holdCanvas.getContext('2d');
        holdContext.fillStyle = '#000';
        holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        
        if (this.holdPiece) {
            const offsetX = (holdCanvas.width / 30 - this.holdPiece[0].length) / 2;
            const offsetY = (holdCanvas.height / 30 - this.holdPiece.length) / 2;
            
            this.holdPiece.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        holdContext.fillStyle = this.canHold ? this.colors[value] : this.colors[value] + '88';
                        holdContext.fillRect((x + offsetX) * 30,
                                           (y + offsetY) * 30,
                                           30, 30);
                        holdContext.strokeStyle = '#000';
                        holdContext.lineWidth = 2;
                        holdContext.strokeRect((x + offsetX) * 30,
                                             (y + offsetY) * 30,
                                             30, 30);
                    }
                });
            });
        }
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
        
        const comboElement = document.getElementById('combo');
        if (comboElement) {
            if (this.combo > 1) {
                comboElement.innerText = this.combo + ' COMBO!';
                comboElement.style.display = 'block';
            } else {
                comboElement.style.display = 'none';
            }
        }
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
        this.holdPiece = null;
        this.canHold = true;
        this.combo = 0;
        this.lastRotation = null;
        this.nextPiece = this.createPiece(this.pieces[Math.floor(Math.random() * this.pieces.length)]);
        this.playerReset();
        this.updateScore();
        this.drawHold();
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
                case 67: // C (Hold)
                    this.holdCurrentPiece();
                    break;
            }
        });
    }
}

function restartGame() {
    tetris.restart();
}

const tetris = new Tetris();