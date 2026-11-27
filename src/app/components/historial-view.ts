import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {
  Bitacora,
  FullBitacoraSnapshot,
  TURNO_MATUTINO,
  TURNO_NOCTURNO,
  TURNO_VESPERTINO,
} from '../models/shift-log';
import {PdfExporter} from '../services/pdf-exporter';
import {ShiftLogStore} from '../services/shift-log-store';

@Component({
  selector: 'app-historial-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-5">
      <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DCE8F1]">
          <div>
            <h2 class="font-display text-lg font-bold text-[#344054]">
              HISTORIAL DE BITÁCORAS ANTERIORES
            </h2>
            <p class="text-xs text-[#344054]/70 mt-0.5">
              Consulta registros completos de turnos previos, incidencias, producción, estado de máquinas y exporta en PDF.
            </p>
          </div>
          <span class="text-xs font-mono tabular-nums text-[#344054]/75">
            {{ filteredBitacoras().length }} registros encontrados
          </span>
        </div>

        <!-- Filters -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div>
            <label for="histDateFilter" class="block text-[11px] font-semibold uppercase text-[#344054]/75 mb-1">
              Buscar por fecha
            </label>
            <input
              id="histDateFilter"
              type="date"
              [value]="filterDate()"
              (change)="onDateChange($event)"
              class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60"
            />
          </div>

          <div>
            <label for="histShiftFilter" class="block text-[11px] font-semibold uppercase text-[#344054]/75 mb-1">
              Filtrar por turno
            </label>
            <select
              id="histShiftFilter"
              [value]="filterShift()"
              (change)="onShiftChange($event)"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60"
            >
              <option value="">Todos los turnos</option>
              <option [value]="matutino">{{ matutino }}</option>
              <option [value]="vespertino">{{ vespertino }}</option>
              <option [value]="nocturno">{{ nocturno }}</option>
            </select>
          </div>

          <div>
            <label for="histSupFilter" class="block text-[11px] font-semibold uppercase text-[#344054]/75 mb-1">
              Filtrar por supervisor
            </label>
            <input
              id="histSupFilter"
              type="text"
              [value]="filterSupervisor()"
              (input)="onSupervisorInput($event)"
              placeholder="Nombre del supervisor..."
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60"
            />
          </div>

          <div class="flex items-end">
            <button
              type="button"
              (click)="clearFilters()"
              class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE8F1] bg-[#F5F7F8] hover:bg-[#DCE8F1]/60 text-xs font-medium text-[#344054] cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">filter_alt_off</mat-icon>
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      <!-- History Table -->
      <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#DCE8F1] text-[11px] font-semibold uppercase tracking-wide text-[#344054]/75">
              <th class="py-3 pr-3">FOLIO</th>
              <th class="py-3 px-3">FECHA</th>
              <th class="py-3 px-3">ÁREA / LÍNEA</th>
              <th class="py-3 px-3">TURNO SALIENTE</th>
              <th class="py-3 px-3">SUPERVISOR SALIENTE</th>
              <th class="py-3 px-3 text-right">PRODUCCIÓN</th>
              <th class="py-3 px-3 text-right">CUMPLIM.</th>
              <th class="py-3 px-3 text-right">INCIDENCIAS</th>
              <th class="py-3 pl-3 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#DCE8F1]/70 text-xs">
            @for (b of filteredBitacoras(); track b.id) {
              <tr class="hover:bg-[#F5F7F8]/70 transition-colors">
                <td class="py-3 pr-3 font-mono font-bold text-[#344054]">
                  {{ b.folio }}
                </td>
                <td class="py-3 px-3 font-mono tabular-nums text-[#344054]">
                  {{ b.fecha }}
                </td>
                <td class="py-3 px-3 text-[#344054]">{{ b.areaLinea }}</td>
                <td class="py-3 px-3 text-[#344054]/85">{{ b.turnoSaliente }}</td>
                <td class="py-3 px-3 text-[#344054]">{{ b.supervisorSaliente }}</td>
                <td class="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                  {{ b.totalProduccion }} u
                </td>
                <td class="py-3 px-3 text-right">
                  <span
                    class="font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md"
                    [style.background-color]="
                      b.cumplimientoPromedio >= 95
                        ? '#D5EDE3'
                        : b.cumplimientoPromedio >= 80
                          ? '#F7E8B5'
                          : '#F2D5D8'
                    "
                  >
                    {{ b.cumplimientoPromedio }}%
                  </span>
                </td>
                <td class="py-3 px-3 text-right font-mono tabular-nums">
                  {{ b.totalIncidencias }} ({{ b.incidenciasPendientes }} pend.)
                </td>
                <td class="py-3 pl-3 text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="inspectBitacora(b)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C7DDF2]/70 hover:bg-[#C7DDF2] text-xs font-medium text-[#344054] cursor-pointer"
                    >
                      <mat-icon class="!text-[15px] !w-4 !h-4">visibility</mat-icon>
                      Ver
                    </button>
                    <button
                      type="button"
                      (click)="exportPdf(b)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#D5EDE3] hover:bg-[#B7DCC8] text-xs font-semibold text-[#344054] cursor-pointer"
                    >
                      <mat-icon class="!text-[15px] !w-4 !h-4">picture_as_pdf</mat-icon>
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="py-8 text-center text-xs text-[#344054]/60">
                  No se encontraron bitácoras con los filtros seleccionados.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <!-- Detail Modal -->
      @if (inspectedSnapshot(); as snap) {
        <div
          class="fixed inset-0 z-50 bg-[#344054]/35 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div
            class="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-[#DCE8F1] shadow-xl flex flex-col overflow-hidden"
          >
            <div
              class="px-6 py-4 bg-[#D5EDE3]/60 border-b border-[#DCE8F1] flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h3 class="font-display text-base font-bold text-[#344054]">
                  Bitácora {{ snap.bitacora.folio }} — {{ snap.bitacora.areaLinea }}
                </h3>
                <p class="text-xs text-[#344054]/75 font-mono">
                  {{ snap.bitacora.fecha }} · {{ snap.bitacora.turnoSaliente }} →
                  {{ snap.bitacora.turnoEntrante }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="downloadSnapshotPdf(snap)"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-semibold text-[#344054] cursor-pointer"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">picture_as_pdf</mat-icon>
                  Exportar PDF
                </button>
                <button
                  type="button"
                  (click)="inspectedSnapshot.set(null)"
                  class="p-1.5 rounded-lg hover:bg-white/70 text-[#344054] cursor-pointer"
                  aria-label="Cerrar detalle"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <div class="p-6 overflow-y-auto space-y-5 text-xs text-[#344054]">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F5F7F8] border border-[#DCE8F1]">
                <p><strong>Supervisor Saliente:</strong> {{ snap.bitacora.supervisorSaliente }}</p>
                <p><strong>Supervisor Entrante:</strong> {{ snap.bitacora.supervisorEntrante }}</p>
                <p><strong>Producción Total:</strong> {{ snap.bitacora.totalProduccion }} u ({{ snap.bitacora.cumplimientoPromedio }}%)</p>
                <p><strong>Incidencias:</strong> {{ snap.bitacora.totalIncidencias }} ({{ snap.bitacora.incidenciasPendientes }} pendientes)</p>
              </div>

              <div>
                <h4 class="font-display font-bold text-sm mb-2">Producción del Turno</h4>
                <table class="w-full border border-[#DCE8F1] rounded-lg overflow-hidden">
                  <thead class="bg-[#F5F7F8]">
                    <tr>
                      <th class="p-2 text-left">Producto</th>
                      <th class="p-2 text-right">Meta</th>
                      <th class="p-2 text-right">Producido</th>
                      <th class="p-2 text-right">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#DCE8F1]">
                    @for (p of snap.produccion; track p.id) {
                      <tr>
                        <td class="p-2">{{ p.producto }}</td>
                        <td class="p-2 text-right font-mono tabular-nums">{{ p.meta }}</td>
                        <td class="p-2 text-right font-mono tabular-nums">{{ p.producido }}</td>
                        <td class="p-2 text-right font-mono tabular-nums">{{ p.cumplimiento }}%</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-display font-bold text-sm mb-2">Incidencias</h4>
                  @if (snap.incidencias.length === 0) {
                    <p class="text-[#344054]/65">Sin incidencias registradas.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (inc of snap.incidencias; track inc.id) {
                        <li class="p-2.5 rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50">
                          <span class="font-mono font-semibold">{{ inc.hora }}</span> ·
                          <strong>{{ inc.maquina }}</strong> ({{ inc.estado }})
                          <p class="mt-0.5 text-[#344054]/85">{{ inc.descripcion }}</p>
                        </li>
                      }
                    </ul>
                  }
                </div>

                <div>
                  <h4 class="font-display font-bold text-sm mb-2">Estado de Máquinas</h4>
                  <ul class="space-y-2">
                    @for (m of snap.maquinas; track m.id) {
                      <li class="p-2.5 rounded-lg border border-[#DCE8F1] flex items-center justify-between">
                        <span class="font-mono font-semibold">{{ m.nombre }}</span>
                        <span
                          class="px-2 py-0.5 rounded font-medium"
                          [style.background-color]="
                            m.estado === 'Operando'
                              ? '#B7DCC8'
                              : m.estado === 'Detenida'
                                ? '#F7E8B5'
                                : '#F2D5D8'
                          "
                        >
                          {{ m.estado }}
                        </span>
                      </li>
                    }
                  </ul>
                </div>
              </div>

              <div>
                <h4 class="font-display font-bold text-sm mb-1.5">Notas para el siguiente turno</h4>
                <p class="p-3 rounded-xl bg-[#F5F7F8] border border-[#DCE8F1] whitespace-pre-line">
                  {{ snap.bitacora.notas || 'Sin observaciones adicionales.' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class HistorialView {
  readonly store = inject(ShiftLogStore);
  private readonly pdfExporter = inject(PdfExporter);

  readonly matutino = TURNO_MATUTINO;
  readonly vespertino = TURNO_VESPERTINO;
  readonly nocturno = TURNO_NOCTURNO;

  readonly filterDate = signal('');
  readonly filterShift = signal('');
  readonly filterSupervisor = signal('');
  readonly inspectedSnapshot = signal<FullBitacoraSnapshot | null>(null);

  readonly filteredBitacoras = computed(() => {
    const dt = this.filterDate();
    const sh = this.filterShift();
    const sup = this.filterSupervisor().trim().toLowerCase();

    return this.store.bitacoras().filter((b) => {
      if (dt && b.fecha !== dt) {
        return false;
      }
      if (
        sh &&
        b.turnoSaliente !== sh &&
        b.turnoEntrante !== sh
      ) {
        return false;
      }
      if (sup) {
        const hay = `${b.supervisorSaliente} ${b.supervisorEntrante}`.toLowerCase();
        if (!hay.includes(sup)) {
          return false;
        }
      }
      return true;
    });
  });

  onDateChange(ev: Event): void {
    this.filterDate.set((ev.target as HTMLInputElement).value);
  }

  onShiftChange(ev: Event): void {
    this.filterShift.set((ev.target as HTMLSelectElement).value);
  }

  onSupervisorInput(ev: Event): void {
    this.filterSupervisor.set((ev.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.filterDate.set('');
    this.filterShift.set('');
    this.filterSupervisor.set('');
  }

  async inspectBitacora(b: Bitacora): Promise<void> {
    const snap = await this.store.loadFullBitacora(b.id);
    if (snap) {
      this.inspectedSnapshot.set(snap);
    }
  }

  async exportPdf(b: Bitacora): Promise<void> {
    const snap = await this.store.loadFullBitacora(b.id);
    if (snap) {
      await this.pdfExporter.exportBitacora(snap);
      this.store.showToast(`PDF exportado: ${b.folio}`, 'success');
    }
  }

  async downloadSnapshotPdf(snap: FullBitacoraSnapshot): Promise<void> {
    await this.pdfExporter.exportBitacora(snap);
    this.store.showToast(`PDF exportado: ${snap.bitacora.folio}`, 'success');
  }
}
