import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BigNumberPipe } from '../format';
import { GameService } from '../game.service';

@Component({
  selector: 'app-investors-dialog',
  imports: [MatDialogModule, MatButtonModule, BigNumberPipe],
  templateUrl: './investors-dialog.html',
  styleUrl: './dialogs.css',
})
export class InvestorsDialog {
  protected readonly game = inject(GameService);
  private readonly dialogRef = inject(MatDialogRef<InvestorsDialog>);

  protected readonly confirming = signal(false);
  protected readonly resetting = signal(false);

  protected async reset(): Promise<void> {
    if (!this.confirming()) {
      this.confirming.set(true);
      return;
    }
    this.resetting.set(true);
    await this.game.resetWorld();
    this.resetting.set(false);
    this.dialogRef.close();
  }
}
