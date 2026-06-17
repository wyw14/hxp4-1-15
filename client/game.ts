type Color = 'red' | 'yellow' | 'blue' | 'green';

const COLORS: Color[] = ['red', 'yellow', 'blue', 'green'];

interface HighScoreResponse {
  highScore: number;
  isNewRecord?: boolean;
}

class ColorMemoryGame {
  private sequence: Color[] = [];
  private playerIndex: number = 0;
  private isPlaying: boolean = false;
  private isShowingSequence: boolean = false;
  private level: number = 0;
  private highScore: number = 0;
  private combo: number = 0;
  private roundPerfect: boolean = true;

  private readonly buttons: NodeListOf<HTMLButtonElement>;
  private readonly startBtn: HTMLButtonElement;
  private readonly currentLevelEl: HTMLElement;
  private readonly highScoreEl: HTMLElement;
  private readonly gameStatusEl: HTMLElement;
  private readonly comboCountEl: HTMLElement;
  private readonly comboItemEl: HTMLElement;

  private readonly lightOnDuration: number = 600;
  private readonly lightOffDuration: number = 300;

  constructor() {
    this.buttons = document.querySelectorAll('.color-btn');
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.currentLevelEl = document.getElementById('current-level') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLElement;
    this.comboCountEl = document.getElementById('combo-count') as HTMLElement;
    this.comboItemEl = document.querySelector('.combo-item') as HTMLElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.fetchHighScore();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());

    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = (e.target as HTMLButtonElement).dataset.color as Color;
        this.handlePlayerInput(color);
      });
    });
  }

  private async fetchHighScore(): Promise<void> {
    try {
      const response = await fetch('/api/highscore');
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }

  private async saveHighScore(score: number): Promise<void> {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();

      if (data.isNewRecord) {
        this.showStatus('🎉 新纪录！', 'success');
      }
    } catch (error) {
      console.error('保存最高分失败:', error);
    }
  }

  private startGame(): void {
    this.sequence = [];
    this.playerIndex = 0;
    this.level = 0;
    this.combo = 0;
    this.isPlaying = true;
    this.currentLevelEl.textContent = '0';
    this.comboCountEl.textContent = '0';
    this.comboItemEl.classList.remove('hot');
    
    this.setButtonsDisabled(true);
    this.startBtn.disabled = true;
    
    this.showStatus('游戏开始！', 'playing');
    this.nextRound();
  }

  private nextRound(): void {
    this.level++;
    this.currentLevelEl.textContent = this.level.toString();
    this.playerIndex = 0;
    this.roundPerfect = true;

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sequence.push(randomColor);

    this.showStatus(`第 ${this.level} 关 - 记住序列`, 'playing');
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.sequence.length; i++) {
      const color = this.sequence[i];
      await this.lightUpButton(color);
      
      if (i < this.sequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    this.showStatus('请按顺序点击按钮', 'playing');
  }

  private async lightUpButton(color: Color): Promise<void> {
    const button = this.getButtonByColor(color);
    if (!button) return;

    button.classList.add('active');
    await this.delay(this.lightOnDuration);
    button.classList.remove('active');
  }

  private getButtonByColor(color: Color): HTMLButtonElement | null {
    return document.querySelector(`.color-btn[data-color="${color}"]`);
  }

  private async handlePlayerInput(color: Color): Promise<void> {
    if (!this.isPlaying || this.isShowingSequence) return;

    const expectedColor = this.sequence[this.playerIndex];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.combo++;
      this.updateComboDisplay();

      this.playerIndex++;

      if (this.playerIndex === this.sequence.length) {
        const evaluation = this.getRoundEvaluation();
        this.showStatus(`正确！${evaluation} 准备下一关...`, 'success');
        this.showRoundEvaluation(evaluation);
        this.setButtonsDisabled(true);
        await this.delay(1500);
        this.nextRound();
      }
    } else {
      this.combo = 0;
      this.roundPerfect = false;
      this.updateComboDisplay();

      button?.classList.add('wrong');
      await this.delay(500);
      button?.classList.remove('wrong');

      this.gameOver();
    }
  }

  private updateComboDisplay(): void {
    this.comboCountEl.textContent = this.combo.toString();
    
    if (this.combo >= 5) {
      this.comboItemEl.classList.add('hot');
    } else {
      this.comboItemEl.classList.remove('hot');
    }

    if (this.combo > 0) {
      this.comboItemEl.style.animation = 'none';
      this.comboItemEl.offsetHeight;
      this.comboItemEl.style.animation = '';
    }
  }

  private getRoundEvaluation(): string {
    if (!this.roundPerfect) {
      return '';
    }
    
    const combo = this.combo;
    if (combo >= 20) {
      return '🔥 超神！';
    } else if (combo >= 15) {
      return '⚡ 完美！';
    } else if (combo >= 10) {
      return '✨ 太棒了！';
    } else if (combo >= 5) {
      return '👍 不错！';
    } else {
      return '';
    }
  }

  private showRoundEvaluation(evaluation: string): void {
    if (!evaluation) return;

    const gameBoard = document.querySelector('.game-board') as HTMLElement;
    const evalEl = document.createElement('div');
    evalEl.className = 'round-evaluation show';
    evalEl.textContent = evaluation;
    gameBoard.appendChild(evalEl);

    setTimeout(() => {
      evalEl.remove();
    }, 1500);
  }

  private async gameOver(): Promise<void> {
    this.isPlaying = false;
    this.setButtonsDisabled(true);
    this.startBtn.disabled = false;

    const finalScore = this.level - 1;
    this.showStatus(`游戏结束！你完成了 ${finalScore} 关`, 'gameover');

    if (finalScore > this.highScore) {
      await this.saveHighScore(finalScore);
    }
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private showStatus(message: string, type: 'playing' | 'gameover' | 'success' | '' = ''): void {
    this.gameStatusEl.textContent = message;
    this.gameStatusEl.className = 'game-status';
    if (type) {
      this.gameStatusEl.classList.add(type);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new ColorMemoryGame();
