import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {BitacorasView} from './components/bitacoras-view';
import {ConfiguracionView} from './components/configuracion-view';
import {DashboardView} from './components/dashboard-view';
import {HistorialView} from './components/historial-view';
import {LoginView} from './components/login-view';
import {ReportesView} from './components/reportes-view';
import {Sidebar} from './components/sidebar';
import {TopHeader} from './components/top-header';
import {FirebaseClient} from './services/firebase-client';
import {ShiftLogStore} from './services/shift-log-store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    MatIconModule,
    Sidebar,
    TopHeader,
    DashboardView,
    BitacorasView,
    HistorialView,
    ReportesView,
    ConfiguracionView,
    LoginView,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly fb = inject(FirebaseClient);
  readonly store = inject(ShiftLogStore);

  readonly mobileMenuOpen = signal(false);

  readonly displayUserName = computed(() => {
    const u = this.fb.user();
    if (!u) return '';
    return u.displayName || u.email || 'Supervisor';
  });

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async signOut(): Promise<void> {
    this.mobileMenuOpen.set(false);
    await this.fb.signOutUser();
  }
}
