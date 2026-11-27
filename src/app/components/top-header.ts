import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {TURNO_MATUTINO, TURNO_VESPERTINO} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';

@Component({
  selector: 'app-top-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <header
      class="bg-white border-b border-[#DCE8F1] px-4 lg:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button
          type="button"
          (click)="toggleMobileMenu.emit()"
          class="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#D5EDE3] text-[#344054] hover:bg-[#B7DCC8] transition-colors shrink-0 cursor-pointer"
          aria-label="Abrir menú lateral"
        >
          <mat-icon>menu</mat-icon>
        </button>
        <div class="min-w-0">
          <h1
            class="font-display text-lg lg:text-xl font-bold tracking-tight text-[#344054] truncate"
          >
            BITÁCORA DIGITAL DE CAMBIO DE TURNO
          </h1>
          <p class="text-xs text-[#344054]/70 truncate">
            {{ formattedToday() }} · Usuario: {{ userName() }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <div
          class="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F7F8] border border-[#DCE8F1]"
          role="group"
          aria-label="Selector de turno"
        >
          <button
            type="button"
            (click)="selectShift(matutino)"
            [class.bg-[#B7DCC8]]="store.activeShiftHeader() === matutino"
            [class.font-semibold]="store.activeShiftHeader() === matutino"
            [class.shadow-sm]="store.activeShiftHeader() === matutino"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#344054] transition-colors whitespace-nowrap shrink-0 hover:bg-white/80 cursor-pointer"
          >
            <mat-icon class="!text-[15px] !w-4 !h-4">wb_sunny</mat-icon>
            Matutino (06:00 - 14:00)
          </button>
          <button
            type="button"
            (click)="selectShift(vespertino)"
            [class.bg-[#C7DDF2]]="store.activeShiftHeader() === vespertino"
            [class.font-semibold]="store.activeShiftHeader() === vespertino"
            [class.shadow-sm]="store.activeShiftHeader() === vespertino"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#344054] transition-colors whitespace-nowrap shrink-0 hover:bg-white/80 cursor-pointer"
          >
            <mat-icon class="!text-[15px] !w-4 !h-4">wb_twilight</mat-icon>
            Vespertino (14:00 - 22:00)
          </button>
        </div>

        <button
          type="button"
          (click)="createNewShiftLog()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-[#344054] text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <mat-icon class="!text-[17px] !w-[17px] !h-[17px]">add_circle_outline</mat-icon>
          NUEVA BITÁCORA
        </button>
      </div>
    </header>
  `,
})
export class TopHeader {
  readonly store = inject(ShiftLogStore);
  readonly userName = input<string>('Supervisor');
  readonly toggleMobileMenu = output<void>();

  readonly matutino = TURNO_MATUTINO;
  readonly vespertino = TURNO_VESPERTINO;

  readonly formattedToday = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  selectShift(shift: string): void {
    this.store.activeShiftHeader.set(shift);
    this.store.showToast(`Turno seleccionado: ${shift}`, 'info');
  }

  async createNewShiftLog(): Promise<void> {
    await this.store.createNewBitacora(this.store.activeShiftHeader());
  }
}
