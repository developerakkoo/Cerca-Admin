import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  public appPages = [
    { title: 'Dashboard', url: '/folder/dashboard', icon: 'grid' },
    { title: 'Analytics', url: '/folder/analytics', icon: 'analytics' },
    { title: 'Users', url: '/folder/users', icon: 'people' },
    { title: 'Drivers', url: '/folder/drivers', icon: 'car' },
    { title: 'Settings', url: '/folder/settings', icon: 'settings' },
  ];
  
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private menuController: MenuController
  ) {}

  ngOnInit() {
    // Listen to route changes and enable/disable menu accordingly
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        if (url.includes('/login')) {
          this.menuController.enable(false);
        } else {
          this.menuController.enable(true);
        }
      });

    // Check initial route
    const currentUrl = this.router.url;
    if (currentUrl.includes('/login')) {
      this.menuController.enable(false);
    } else {
      this.menuController.enable(true);
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
