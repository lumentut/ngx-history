import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HistoryService, NavigationState, NavigationError } from 'ngx-history';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navigation',
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit, OnDestroy {
  navigationState: NavigationState | null = null;
  navigationErrors: NavigationError[] = [];
  private subscription = new Subscription();

  constructor(public historyService: HistoryService) {}

  ngOnInit() {
    // Example 1: Subscribe to navigation state changes
    this.subscription.add(
      this.historyService.navigationState$.subscribe({
        next: (state) => {
          this.navigationState = state;
          console.log('Navigation State Updated:', state);
        },
        error: (error) => console.error('Navigation state error:', error)
      }),
    );

    // Example 2: Subscribe to navigation errors
    this.subscription.add(
      this.historyService.navigationError$.subscribe({
        next: (error) => {
          this.navigationErrors = [...this.navigationErrors, error].slice(-5); // Keep last 5 errors
          console.warn('Navigation Error:', error);
        },
        error: (err) => console.error('Error subscription error:', err)
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async goBack() {
    await this.historyService.goBack();
  }

  async goForward() {
    await this.historyService.goForward();
  }

  clearHistory() {
    this.historyService.clearHistory();
    this.navigationErrors = []; // Clear errors too
  }

  clearErrors() {
    this.navigationErrors = [];
  }
}
