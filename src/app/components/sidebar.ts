import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {NavSection} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';

interface NavItem {
  id: NavSection;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <aside
      class="w-64 shrink-0 bg-[#D5EDE3] border-r border-[#A9C5B5]/50 flex flex-col justify-between min-h-screen select-none"
    >
      <div>
        <div class="px-5 py-5 border-b border-[#A9C5B5]/40">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-[#B7DCC8] border border-[#A9C5B5]/60 flex items-center justify-center text-[#344054] shrink-0"
            >
              <mat-icon>precision_manufacturing</mat-icon>
            </div>
            <div class="min-w-0">
              <p
                class="font-display font-bold text-sm leading-tight text-[#344054] truncate"
              >
                Sistema Industrial
              </p>
              <p class="text-xs text-[#344054]/75 truncate">
                Control de Relevo
              </p>
            </div>
          </div>
        </div>

        <nav class="p-3 flex flex-col gap-1.5" aria-label="Navegación principal">
          @for (item of navItems; track item.id) {
            <button
              type="button"
              (click)="selectNav(item.id)"
              [class.bg-white]="store.activeNav() === item.id"
              [class.shadow-sm]="store.activeNav() === item.id"
              [class.font-semibold]="store.activeNav() === item.id"
              [class.text-[#344054]]="true"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 hover:bg-white/70 text-left whitespace-nowrap cursor-pointer"
            >
              <mat-icon class="!text-[20px] !w-5 !h-5 text-[#344054]/85">{{
                item.icon
              }}</mat-icon>
              <span>{{ item.label }}</span>
            </button>
          }
        </nav>
      </div>

      <div class="p-3 border-t border-[#A9C5B5]/40">
        @if (userName()) {
          <div class="px-3 py-2 mb-2 rounded-xl bg-white/60 border border-[#A9C5B5]/30">
            <p class="text-xs font-semibold text-[#344054] truncate">
              {{ userName() }}
            </p>
            <p class="text-[11px] text-[#344054]/70 truncate">
              Supervisor conectado
            </p>
          </div>
        }
        <button
          type="button"
          (click)="signOutRequested.emit()"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#344054] hover:bg-[#F2D5D8]/80 transition-colors whitespace-nowrap cursor-pointer"
        >
          <mat-icon class="!text-[20px] !w-5 !h-5">logout</mat-icon>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly store = inject(ShiftLogStore);
  readonly userName = input<string>('');
  readonly navChanged = output<void>();
  readonly signOutRequested = output<void>();

  readonly navItems: NavItem[] = [
    {id: 'dashboard', label: 'Dashboard', icon: 'dashboard'},
    {id: 'bitacoras', label: 'Bitácoras', icon: 'assignment'},
    {id: 'historial', label: 'Historial', icon: 'history'},
    {id: 'reportes', label: 'Reportes', icon: 'bar_chart'},
    {id: 'configuracion', label: 'Configuración', icon: 'settings'},
  ];

  selectNav(id: NavSection): void {
    this.store.setNav(id);
    this.navChanged.emit();
  }
}
