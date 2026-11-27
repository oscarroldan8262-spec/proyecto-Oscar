import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {Bitacora} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';

@Component({
  selector: 'app-bitacoras-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-5">
      <div
        class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 class="font-display text-lg font-bold text-[#344054]">
            GESTIÓN DE BITÁCORAS DE TURNO
          </h2>
          <p class="text-xs text-[#344054]/70 mt-0.5">
            Selecciona una bitácora para editarla en el Dashboard o crea un nuevo registro de relevo.
          </p>
        </div>

        <button
          type="button"
          (click)="store.createNewBitacora()"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-semibold text-[#344054] transition-colors cursor-pointer whitespace-nowrap"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">add_circle_outline</mat-icon>
          NUEVA BITÁCORA
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        @for (b of store.bitacoras(); track b.id) {
          <article
            class="bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors"
            [class.border-[#7FB59A]]="store.activeBitacoraId() === b.id"
            [class.border-[#DCE8F1]]="store.activeBitacoraId() !== b.id"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="font-mono text-xs font-bold text-[#344054]">
                  {{ b.folio }}
                </span>
                <span
                  class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md text-[#344054]"
                  [style.background-color]="
                    b.estado === 'guardada'
                      ? '#D5EDE3'
                      : b.estado === 'cerrada'
                        ? '#DED5F0'
                        : '#F7E8B5'
                  "
                >
                  {{ b.estado.toUpperCase() }}
                </span>
              </div>

              <h3 class="font-display text-sm font-bold text-[#344054]">
                {{ b.areaLinea }}
              </h3>
              <p class="text-xs text-[#344054]/70 font-mono tabular-nums mt-1">
                Fecha: {{ b.fecha }}
              </p>

              <div class="mt-3 pt-3 border-t border-[#DCE8F1] space-y-1.5 text-xs text-[#344054]/85">
                <p>
                  <span class="text-[#344054]/60">Saliente:</span>
                  {{ b.supervisorSaliente }} ({{ b.turnoSaliente }})
                </p>
                <p>
                  <span class="text-[#344054]/60">Entrante:</span>
                  {{ b.supervisorEntrante }} ({{ b.turnoEntrante }})
                </p>
              </div>

              <div class="grid grid-cols-3 gap-2 mt-4">
                <div class="p-2 rounded-lg bg-[#D5EDE3]/50 text-center">
                  <p class="text-[10px] text-[#344054]/70">Producción</p>
                  <p class="font-mono text-xs font-bold tabular-nums text-[#344054]">
                    {{ b.totalProduccion }} u
                  </p>
                </div>
                <div class="p-2 rounded-lg bg-[#C7DDF2]/50 text-center">
                  <p class="text-[10px] text-[#344054]/70">Cumplim.</p>
                  <p class="font-mono text-xs font-bold tabular-nums text-[#344054]">
                    {{ b.cumplimientoPromedio }}%
                  </p>
                </div>
                <div class="p-2 rounded-lg bg-[#F7E8B5]/60 text-center">
                  <p class="text-[10px] text-[#344054]/70">Incidencias</p>
                  <p class="font-mono text-xs font-bold tabular-nums text-[#344054]">
                    {{ b.totalIncidencias }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-[#DCE8F1]">
              <button
                type="button"
                (click)="openInDashboard(b)"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#D5EDE3] hover:bg-[#B7DCC8] text-xs font-semibold text-[#344054] transition-colors cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">open_in_new</mat-icon>
                {{
                  store.activeBitacoraId() === b.id
                    ? 'Bitácora Activa'
                    : 'Abrir en Dashboard'
                }}
              </button>

              <button
                type="button"
                (click)="store.deleteBitacora(b.id)"
                class="p-2 rounded-xl hover:bg-[#F2D5D8] text-[#344054]/70 hover:text-[#344054] transition-colors cursor-pointer"
                aria-label="Eliminar bitácora"
              >
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">delete_outline</mat-icon>
              </button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class BitacorasView {
  readonly store = inject(ShiftLogStore);

  openInDashboard(b: Bitacora): void {
    this.store.selectBitacora(b.id);
    this.store.setNav('dashboard');
  }
}
