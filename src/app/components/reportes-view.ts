import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {
  TURNO_MATUTINO,
  TURNO_NOCTURNO,
  TURNO_VESPERTINO,
} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';
import {DonutIndicator} from './donut-indicator';

interface ShiftBreakdown {
  label: string;
  shortLabel: string;
  color: string;
  totalProd: number;
  avgCumplimiento: number;
  incidencias: number;
  count: number;
  barPercent: number;
}

@Component({
  selector: 'app-reportes-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, DonutIndicator],
  template: `
    <div class="space-y-5">
      <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-bold text-[#344054]">
              REPORTES Y ESTADÍSTICAS DE TURNO
            </h2>
            <p class="text-xs text-[#344054]/70 mt-0.5">
              Análisis consolidado calculado en tiempo real desde {{ store.bitacoras().length }} bitácoras almacenadas.
            </p>
          </div>
          <span class="px-3 py-1.5 rounded-lg bg-[#D5EDE3] text-xs font-semibold text-[#344054]">
            Datos históricos reales
          </span>
        </div>
      </section>

      <!-- Top Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase text-[#344054]/70">
              Producción Acumulada
            </span>
            <mat-icon class="!text-[18px] !w-5 !h-5 text-[#7FB59A]">trending_up</mat-icon>
          </div>
          <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-2">
            {{ totalProduccionGlobal() }} u
          </p>
          <p class="text-xs text-[#344054]/65 mt-1">
            Promedio cumplimiento: {{ avgCumplimientoGlobal() }}%
          </p>
        </div>

        <div class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase text-[#344054]/70">
              Incidencias Registradas
            </span>
            <mat-icon class="!text-[18px] !w-5 !h-5 text-[#9BC2E8]">assignment_late</mat-icon>
          </div>
          <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-2">
            {{ totalIncidenciasGlobal() }}
          </p>
          <p class="text-xs text-[#344054]/65 mt-1">
            {{ totalPendientesGlobal() }} pendientes · {{ totalResueltasGlobal() }} resueltas
          </p>
        </div>

        <div class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase text-[#344054]/70">
              Paros de Máquinas
            </span>
            <mat-icon class="!text-[18px] !w-5 !h-5 text-[#E5A8AF]">build_circle</mat-icon>
          </div>
          <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-2">
            {{ totalMaquinasDetenidasGlobal() }}
          </p>
          <p class="text-xs text-[#344054]/65 mt-1">
            Eventos acumulados de detención
          </p>
        </div>

        <div class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-semibold uppercase text-[#344054]/70">
              Cumplimiento Checklist
            </span>
            <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-2">
              {{ avgChecklistGlobal() }}%
            </p>
            <p class="text-xs text-[#344054]/65 mt-1">
              Promedio global
            </p>
          </div>
          <app-donut-indicator
            [value]="avgChecklistGlobal()"
            [size]="68"
            [strokeWidth]="7"
            strokeColor="#7FB59A"
          />
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <!-- Bar Chart: Producción por Turno -->
        <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
          <h3 class="font-display text-base font-bold text-[#344054]">
            Producción por Turno
          </h3>
          <p class="text-xs text-[#344054]/65 mb-5">
            Volumen total producido y comparación entre turnos registrados
          </p>

          <div class="space-y-4">
            @for (row of shiftBreakdown(); track row.label) {
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <span class="font-semibold text-[#344054]">{{ row.label }}</span>
                  <span class="font-mono tabular-nums text-[#344054]/85">
                    {{ row.totalProd }} u · {{ row.avgCumplimiento }}% prom.
                  </span>
                </div>
                <div class="w-full h-7 rounded-lg bg-[#F5F7F8] border border-[#DCE8F1]/60 overflow-hidden p-0.5">
                  <div
                    class="h-full rounded-md transition-all duration-300 flex items-center px-2"
                    [style.width.%]="row.barPercent"
                    [style.background-color]="row.color"
                  >
                    @if (row.barPercent > 15) {
                      <span class="font-mono text-[11px] font-semibold text-[#344054]">
                        {{ row.count }} bit.
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Donut & Breakdown: Incidencias & Checklist -->
        <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="font-display text-base font-bold text-[#344054]">
              Resolución de Incidencias y Cumplimiento
            </h3>
            <p class="text-xs text-[#344054]/65 mb-4">
              Proporción de incidencias resueltas frente a pendientes
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center py-2">
            <div class="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#F5F7F8]/70 border border-[#DCE8F1]">
              <app-donut-indicator
                [value]="resolutionRate()"
                [size]="116"
                [strokeWidth]="11"
                strokeColor="#9BC2E8"
                trackColor="#F7E8B5"
                subLabel="Resueltas"
              />
              <p class="text-xs font-medium text-[#344054] mt-1">
                Tasa de resolución de incidencias
              </p>
            </div>

            <div class="space-y-3">
              <div class="p-3 rounded-xl bg-[#D5EDE3]/70 flex items-center justify-between">
                <span class="text-xs font-medium text-[#344054]">Resueltas</span>
                <span class="font-mono text-sm font-bold tabular-nums text-[#344054]">
                  {{ totalResueltasGlobal() }}
                </span>
              </div>
              <div class="p-3 rounded-xl bg-[#F7E8B5]/80 flex items-center justify-between">
                <span class="text-xs font-medium text-[#344054]">Pendientes / Proceso</span>
                <span class="font-mono text-sm font-bold tabular-nums text-[#344054]">
                  {{ totalPendientesGlobal() }}
                </span>
              </div>
              <div class="p-3 rounded-xl bg-[#DED5F0]/70 flex items-center justify-between">
                <span class="text-xs font-medium text-[#344054]">Bitácoras evaluadas</span>
                <span class="font-mono text-sm font-bold tabular-nums text-[#344054]">
                  {{ store.bitacoras().length }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Comparison Table -->
      <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm overflow-x-auto">
        <h3 class="font-display text-base font-bold text-[#344054] mb-3">
          Comparativa Detallada entre Turnos
        </h3>
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-[#DCE8F1] text-[11px] font-semibold uppercase text-[#344054]/75">
              <th class="py-2.5 pr-3">TURNO</th>
              <th class="py-2.5 px-3 text-right">BITÁCORAS</th>
              <th class="py-2.5 px-3 text-right">PRODUCCIÓN TOTAL</th>
              <th class="py-2.5 px-3 text-right">CUMPLIMIENTO PROMEDIO</th>
              <th class="py-2.5 pl-3 text-right">INCIDENCIAS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#DCE8F1]/70">
            @for (row of shiftBreakdown(); track row.label) {
              <tr>
                <td class="py-3 pr-3 font-semibold text-[#344054]">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-sm mr-2"
                    [style.background-color]="row.color"
                  ></span>
                  {{ row.label }}
                </td>
                <td class="py-3 px-3 text-right font-mono tabular-nums">{{ row.count }}</td>
                <td class="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                  {{ row.totalProd }} u
                </td>
                <td class="py-3 px-3 text-right font-mono tabular-nums">
                  {{ row.avgCumplimiento }}%
                </td>
                <td class="py-3 pl-3 text-right font-mono tabular-nums">
                  {{ row.incidencias }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </div>
  `,
})
export class ReportesView {
  readonly store = inject(ShiftLogStore);

  readonly totalProduccionGlobal = computed(() =>
    this.store.bitacoras().reduce((acc, b) => acc + (b.totalProduccion || 0), 0),
  );

  readonly avgCumplimientoGlobal = computed(() => {
    const list = this.store.bitacoras();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, b) => acc + (b.cumplimientoPromedio || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  readonly totalIncidenciasGlobal = computed(() =>
    this.store.bitacoras().reduce((acc, b) => acc + (b.totalIncidencias || 0), 0),
  );

  readonly totalPendientesGlobal = computed(() =>
    this.store
      .bitacoras()
      .reduce((acc, b) => acc + (b.incidenciasPendientes || 0), 0),
  );

  readonly totalResueltasGlobal = computed(() =>
    Math.max(0, this.totalIncidenciasGlobal() - this.totalPendientesGlobal()),
  );

  readonly resolutionRate = computed(() => {
    const tot = this.totalIncidenciasGlobal();
    if (tot <= 0) return 100;
    return Math.round((this.totalResueltasGlobal() / tot) * 100);
  });

  readonly totalMaquinasDetenidasGlobal = computed(() =>
    this.store
      .bitacoras()
      .reduce((acc, b) => acc + (b.maquinasDetenidas || 0), 0),
  );

  readonly avgChecklistGlobal = computed(() => {
    const list = this.store.bitacoras();
    if (list.length === 0) return 0;
    const totalPct = list.reduce((acc, b) => {
      const checked = [
        b.equiposLimpios,
        b.herramientasCompletas,
        b.materialAbastecido,
        b.sinRiesgosSeguridad,
      ].filter(Boolean).length;
      return acc + (checked / 4) * 100;
    }, 0);
    return Math.round(totalPct / list.length);
  });

  readonly shiftBreakdown = computed<ShiftBreakdown[]>(() => {
    const groups = [
      {label: TURNO_MATUTINO, shortLabel: 'Matutino', color: '#B7DCC8'},
      {label: TURNO_VESPERTINO, shortLabel: 'Vespertino', color: '#C7DDF2'},
      {label: TURNO_NOCTURNO, shortLabel: 'Nocturno', color: '#DED5F0'},
    ];

    const list = this.store.bitacoras();
    const raw = groups.map((g) => {
      const matches = list.filter((b) => b.turnoSaliente === g.label);
      const totalProd = matches.reduce((s, b) => s + (b.totalProduccion || 0), 0);
      const avgCumplimiento =
        matches.length > 0
          ? Math.round(
              (matches.reduce((s, b) => s + (b.cumplimientoPromedio || 0), 0) /
                matches.length) *
                10,
            ) / 10
          : 0;
      const incidencias = matches.reduce(
        (s, b) => s + (b.totalIncidencias || 0),
        0,
      );
      return {
        ...g,
        totalProd,
        avgCumplimiento,
        incidencias,
        count: matches.length,
        barPercent: 0,
      };
    });

    const maxProd = Math.max(1, ...raw.map((r) => r.totalProd));
    return raw.map((r) => ({
      ...r,
      barPercent: r.totalProd > 0 ? Math.max(8, Math.round((r.totalProd / maxProd) * 100)) : 0,
    }));
  });
}
