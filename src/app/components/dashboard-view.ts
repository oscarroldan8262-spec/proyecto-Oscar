import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {
  INCIDENCIA_ESTADOS,
  Incidencia,
  IncidenciaEstado,
  MAQUINA_ESTADOS,
  MaquinaEstado,
  MaquinaEstadoTipo,
  ProduccionItem,
  TURNO_MATUTINO,
  TURNO_NOCTURNO,
  TURNO_VESPERTINO,
} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';
import {DonutIndicator} from './donut-indicator';
import {SignaturePad} from './signature-pad';
import {TimelineSection} from './timeline-section';

@Component({
  selector: 'app-dashboard-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    ReactiveFormsModule,
    DonutIndicator,
    SignaturePad,
    TimelineSection,
  ],
  template: `
    @if (store.loadingWorkspace()) {
      <div class="space-y-4">
        <div class="h-24 rounded-xl bg-white border border-[#DCE8F1] animate-pulse"></div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div class="h-64 rounded-xl bg-white border border-[#DCE8F1] animate-pulse"></div>
          <div class="h-64 rounded-xl bg-white border border-[#DCE8F1] animate-pulse"></div>
        </div>
      </div>
    } @else if (!store.activeBitacora()) {
      <div
        class="bg-white rounded-xl border border-[#DCE8F1] p-10 text-center shadow-sm"
      >
        <mat-icon class="text-[#A9C5B5] !text-[40px] !w-10 !h-10 mb-3"
          >assignment_add</mat-icon
        >
        <h2 class="font-display text-lg font-bold text-[#344054]">
          No hay bitácora activa seleccionada
        </h2>
        <p class="text-sm text-[#344054]/75 mt-1 mb-5">
          Crea una nueva bitácora de cambio de turno para comenzar el registro.
        </p>
        <button
          type="button"
          (click)="store.createNewBitacora()"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-sm font-semibold text-[#344054] cursor-pointer"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">add</mat-icon>
          NUEVA BITÁCORA
        </button>
      </div>
    } @else {
      <div class="space-y-5">
        <!-- Validation banner -->
        @if (validationError()) {
          <div
            class="rounded-xl bg-[#F2D5D8] border border-[#E5A8AF] px-4 py-3 flex items-center justify-between gap-3 text-xs font-medium text-[#344054]"
          >
            <div class="flex items-center gap-2">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">error_outline</mat-icon>
              <span>{{ validationError() }}</span>
            </div>
            <button
              type="button"
              (click)="validationError.set(null)"
              class="p-1 rounded-lg hover:bg-white/40 cursor-pointer"
              aria-label="Cerrar aviso"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">close</mat-icon>
            </button>
          </div>
        }

        <!-- ROW 1: DATOS GENERALES -->
        <section
          class="bg-white rounded-xl border border-[#DCE8F1] p-4 lg:p-5 shadow-sm"
          aria-labelledby="datos-generales-heading"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2.5">
              <h2
                id="datos-generales-heading"
                class="font-display text-xs font-bold uppercase tracking-wider text-[#344054]"
              >
                DATOS GENERALES DEL CAMBIO DE TURNO
              </h2>
              <span class="text-xs font-mono text-[#344054]/70">
                · {{ store.activeBitacora()?.folio }}
              </span>
            </div>
            <span
              class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md text-[#344054]"
              [style.background-color]="
                store.activeBitacora()?.estado === 'guardada'
                  ? '#D5EDE3'
                  : store.activeBitacora()?.estado === 'cerrada'
                    ? '#DED5F0'
                    : '#F7E8B5'
              "
            >
              Estado: {{ store.activeBitacora()?.estado?.toUpperCase() }}
            </span>
          </div>

          <form
            [formGroup]="generalForm"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
          >
            <div>
              <label
                for="areaLinea"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >ÁREA / LÍNEA *</label
              >
              <input
                id="areaLinea"
                type="text"
                formControlName="areaLinea"
                list="areas-list"
                class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              />
              <datalist id="areas-list">
                <option value="Línea 01 - Estampado y Ensamble"></option>
                <option value="Línea 02 - Mecanizado CNC"></option>
                <option value="Línea 03 - Empaque Automático"></option>
              </datalist>
            </div>

            <div>
              <label
                for="fechaBitacora"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >FECHA *</label
              >
              <input
                id="fechaBitacora"
                type="date"
                formControlName="fecha"
                class="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              />
            </div>

            <div>
              <label
                for="turnoSaliente"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >TURNO SALIENTE *</label
              >
              <select
                id="turnoSaliente"
                formControlName="turnoSaliente"
                class="w-full px-2.5 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              >
                @for (t of shiftOptions(); track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>

            <div>
              <label
                for="turnoEntrante"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >TURNO ENTRANTE *</label
              >
              <select
                id="turnoEntrante"
                formControlName="turnoEntrante"
                class="w-full px-2.5 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              >
                @for (t of shiftOptions(); track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>

            <div>
              <label
                for="supSaliente"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >SUPERVISOR SALIENTE *</label
              >
              <input
                id="supSaliente"
                type="text"
                formControlName="supervisorSaliente"
                list="sup-options"
                class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              />
            </div>

            <div>
              <label
                for="supEntrante"
                class="block text-[11px] font-semibold uppercase tracking-wide text-[#344054]/80 mb-1"
                >SUPERVISOR ENTRANTE *</label
              >
              <input
                id="supEntrante"
                type="text"
                formControlName="supervisorEntrante"
                list="sup-options"
                class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
              />
            </div>

            <datalist id="sup-options">
              @for (sup of store.supervisores(); track sup.id) {
                <option [value]="sup.nombre"></option>
              }
            </datalist>
          </form>
        </section>

        <!-- ROW 2: RESUMEN DEL TURNO -->
        <section
          aria-labelledby="resumen-heading"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <h2 id="resumen-heading" class="sr-only">RESUMEN DEL TURNO</h2>

          <div
            class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-[#344054]/70">
                Producción Total
              </p>
              <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-1">
                {{ store.totalProduccion() }}
              </p>
              <p class="text-[11px] text-[#344054]/65 tabular-nums">
                Meta: {{ store.totalMeta() }} u
              </p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-[#D5EDE3] flex items-center justify-center text-[#344054] shrink-0">
              <mat-icon>inventory_2</mat-icon>
            </div>
          </div>

          <div
            class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-[#344054]/70">
                Cumplimiento
              </p>
              <p class="font-mono text-xl font-bold tabular-nums text-[#344054] mt-1">
                {{ store.cumplimientoPromedio() }}%
              </p>
              <p class="text-[11px] text-[#344054]/65">
                Rendimiento turno
              </p>
            </div>
            <app-donut-indicator
              [value]="store.cumplimientoPromedio()"
              [size]="64"
              [strokeWidth]="7"
              strokeColor="#7FB59A"
              trackColor="#E8F3EE"
            />
          </div>

          <div
            class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-[#344054]/70">
                Total Incidencias
              </p>
              <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-1">
                {{ store.totalIncidencias() }}
              </p>
              <p class="text-[11px] text-[#344054]/65">
                Registradas hoy
              </p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-[#C7DDF2] flex items-center justify-center text-[#344054] shrink-0">
              <mat-icon>report_problem</mat-icon>
            </div>
          </div>

          <div
            class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-[#344054]/70">
                Incidencias Pendientes
              </p>
              <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-1">
                {{ store.incidenciasPendientes() }}
              </p>
              <p class="text-[11px] text-[#344054]/65">
                Requieren seguimiento
              </p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-[#F7E8B5] flex items-center justify-center text-[#344054] shrink-0">
              <mat-icon>pending_actions</mat-icon>
            </div>
          </div>

          <div
            class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-[#344054]/70">
                Máquinas Detenidas
              </p>
              <p class="font-mono text-2xl font-bold tabular-nums text-[#344054] mt-1">
                {{ store.maquinasDetenidas() }}
              </p>
              <p class="text-[11px] text-[#344054]/65">
                De {{ store.maquinas().length }} equipos
              </p>
            </div>
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-[#344054] shrink-0"
              [style.background-color]="
                store.maquinasDetenidas() > 0 ? '#F2D5D8' : '#D5EDE3'
              "
            >
              <mat-icon>precision_manufacturing</mat-icon>
            </div>
          </div>
        </section>

        <!-- ROW 3: PRODUCCIÓN DEL TURNO & INCIDENCIAS Y PENDIENTES (2-column split matching sketch) -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
          <!-- PRODUCCIÓN DEL TURNO -->
          <section
            class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm flex flex-col justify-between"
            aria-labelledby="produccion-heading"
          >
            <div>
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE8F1]">
                <div>
                  <h2
                    id="produccion-heading"
                    class="font-display text-base font-bold text-[#344054]"
                  >
                    PRODUCCIÓN DEL TURNO
                  </h2>
                  <p class="text-xs text-[#344054]/65">
                    Cálculo automático: (Producido / Meta) × 100
                  </p>
                </div>
                <button
                  type="button"
                  (click)="toggleAddProduct()"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D5EDE3] hover:bg-[#B7DCC8] text-xs font-semibold text-[#344054] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">add</mat-icon>
                  Agregar producto
                </button>
              </div>

              @if (showAddProduct()) {
                <form
                  [formGroup]="newProdForm"
                  (ngSubmit)="submitNewProduct()"
                  class="mt-3 p-3 rounded-xl bg-[#F5F7F8] border border-[#DCE8F1] grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                >
                  <div class="sm:col-span-5">
                    <label for="newProdName" class="block text-[11px] font-medium text-[#344054] mb-1">Producto</label>
                    <input
                      id="newProdName"
                      type="text"
                      formControlName="producto"
                      placeholder="Nombre del producto"
                      class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE8F1] bg-white"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <label for="newProdMeta" class="block text-[11px] font-medium text-[#344054] mb-1">Meta</label>
                    <input
                      id="newProdMeta"
                      type="number"
                      min="1"
                      formControlName="meta"
                      class="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-[#DCE8F1] bg-white"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <label for="newProdCount" class="block text-[11px] font-medium text-[#344054] mb-1">Producido</label>
                    <input
                      id="newProdCount"
                      type="number"
                      min="0"
                      formControlName="producido"
                      class="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-[#DCE8F1] bg-white"
                    />
                  </div>
                  <div class="sm:col-span-2 flex gap-1">
                    <button
                      type="submit"
                      [disabled]="newProdForm.invalid"
                      class="w-full py-1.5 px-2 rounded-lg bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-semibold text-[#344054] disabled:opacity-45 cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              }

              <div class="overflow-x-auto mt-3">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-[#DCE8F1] text-[11px] font-semibold uppercase tracking-wide text-[#344054]/75">
                      <th class="py-2.5 pr-2">PRODUCTO</th>
                      <th class="py-2.5 px-2 text-right">META</th>
                      <th class="py-2.5 px-2 text-right">PRODUCIDO</th>
                      <th class="py-2.5 pl-2 text-right">CUMPLIMIENTO %</th>
                      <th class="py-2.5 pl-2 text-right w-10"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#DCE8F1]/60 text-xs">
                    @for (row of store.produccion(); track row.id) {
                      <tr class="hover:bg-[#F5F7F8]/60 transition-colors">
                        <td class="py-2 pr-2 font-medium text-[#344054]">
                          <input
                            type="text"
                            [value]="row.producto"
                            (change)="onProdFieldChange(row, 'producto', $event)"
                            aria-label="Nombre de producto"
                            class="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-[#DCE8F1] focus:border-[#A9C5B5] focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td class="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            [value]="row.meta"
                            (change)="onProdFieldChange(row, 'meta', $event)"
                            aria-label="Meta de producción"
                            class="w-20 text-right font-mono tabular-nums bg-[#F5F7F8]/70 px-2 py-1 rounded border border-[#DCE8F1] focus:border-[#A9C5B5] focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td class="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            [value]="row.producido"
                            (change)="onProdFieldChange(row, 'producido', $event)"
                            aria-label="Cantidad producida"
                            class="w-20 text-right font-mono tabular-nums bg-[#F5F7F8]/70 px-2 py-1 rounded border border-[#DCE8F1] focus:border-[#A9C5B5] focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td class="py-2 pl-2 text-right">
                          <div class="inline-flex flex-col items-end gap-1 min-w-[82px]">
                            <span
                              class="font-mono font-semibold tabular-nums px-2 py-0.5 rounded-md text-[#344054]"
                              [style.background-color]="
                                row.cumplimiento >= 95
                                  ? '#D5EDE3'
                                  : row.cumplimiento >= 80
                                    ? '#F7E8B5'
                                    : '#F2D5D8'
                              "
                            >
                              {{ row.cumplimiento.toFixed(1) }}%
                            </span>
                            <div class="w-20 h-1.5 rounded-full bg-[#F5F7F8] overflow-hidden">
                              <div
                                class="h-full rounded-full transition-all duration-300"
                                [style.width.%]="clampBar(row.cumplimiento)"
                                [style.background-color]="
                                  row.cumplimiento >= 95
                                    ? '#8FC4A7'
                                    : row.cumplimiento >= 80
                                      ? '#E6CB78'
                                      : '#E5A8AF'
                                "
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td class="py-2 pl-2 text-right">
                          <button
                            type="button"
                            (click)="store.deleteProduccionRow(row.id)"
                            class="p-1 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/60 hover:text-[#344054] cursor-pointer"
                            aria-label="Eliminar producto"
                          >
                            <mat-icon class="!text-[16px] !w-4 !h-4">delete_outline</mat-icon>
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="py-6 text-center text-xs text-[#344054]/60">
                          No hay productos registrados. Haz clic en "Agregar producto".
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr class="border-t-2 border-[#DCE8F1] bg-[#F5F7F8]/80 text-xs font-bold text-[#344054]">
                      <td class="py-2.5 pr-2">TOTAL DEL TURNO</td>
                      <td class="py-2.5 px-2 text-right font-mono tabular-nums">
                        {{ store.totalMeta() }}
                      </td>
                      <td class="py-2.5 px-2 text-right font-mono tabular-nums">
                        {{ store.totalProduccion() }}
                      </td>
                      <td class="py-2.5 pl-2 text-right font-mono tabular-nums">
                        {{ store.cumplimientoPromedio().toFixed(1) }}%
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

          <!-- INCIDENCIAS Y PENDIENTES -->
          <section
            class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm flex flex-col justify-between"
            aria-labelledby="incidencias-heading"
          >
            <div>
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE8F1]">
                <div>
                  <h2
                    id="incidencias-heading"
                    class="font-display text-base font-bold text-[#344054]"
                  >
                    INCIDENCIAS Y PENDIENTES
                  </h2>
                  <p class="text-xs text-[#344054]/65">
                    Seguimiento operativo por máquina y estado
                  </p>
                </div>
                <span class="text-xs font-mono tabular-nums text-[#344054]/75">
                  {{ store.incidenciasPendientes() }} abiertas
                </span>
              </div>

              <div class="overflow-x-auto mt-3">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-[#DCE8F1] text-[11px] font-semibold uppercase tracking-wide text-[#344054]/75">
                      <th class="py-2.5 pr-2 w-16">HORA</th>
                      <th class="py-2.5 px-2">DESCRIPCIÓN</th>
                      <th class="py-2.5 px-2 w-28">MÁQUINA</th>
                      <th class="py-2.5 px-2 w-32">ESTADO</th>
                      <th class="py-2.5 pl-1 w-16 text-right"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#DCE8F1]/60 text-xs">
                    @for (inc of store.incidencias(); track inc.id) {
                      <tr class="hover:bg-[#F5F7F8]/60 transition-colors">
                        <td class="py-2.5 pr-2 font-mono tabular-nums text-[#344054]">
                          {{ inc.hora }}
                        </td>
                        <td class="py-2.5 px-2 text-[#344054]">
                          {{ inc.descripcion }}
                        </td>
                        <td class="py-2.5 px-2 font-mono text-[11px] font-medium text-[#344054]/85">
                          {{ inc.maquina }}
                        </td>
                        <td class="py-2.5 px-2">
                          <select
                            [value]="inc.estado"
                            (change)="onIncidenciaStatusChange(inc, $event)"
                            aria-label="Cambiar estado de incidencia"
                            class="w-full px-2 py-1 text-xs font-medium rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none cursor-pointer"
                            [style.background-color]="incidenciaBg(inc.estado)"
                          >
                            @for (st of incidenciaEstados; track st) {
                              <option [value]="st">{{ st }}</option>
                            }
                          </select>
                        </td>
                        <td class="py-2.5 pl-1 text-right whitespace-nowrap">
                          <button
                            type="button"
                            (click)="openEditIncidencia(inc)"
                            class="p-1 rounded-lg hover:bg-[#DCE8F1]/60 text-[#344054]/70 hover:text-[#344054] cursor-pointer"
                            aria-label="Editar incidencia"
                          >
                            <mat-icon class="!text-[15px] !w-4 !h-4">edit</mat-icon>
                          </button>
                          <button
                            type="button"
                            (click)="store.deleteIncidencia(inc.id)"
                            class="p-1 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/70 hover:text-[#344054] cursor-pointer"
                            aria-label="Eliminar incidencia"
                          >
                            <mat-icon class="!text-[15px] !w-4 !h-4">delete_outline</mat-icon>
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="py-6 text-center text-xs text-[#344054]/60">
                          Sin incidencias registradas en este turno.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="pt-4 mt-3 border-t border-[#DCE8F1] flex justify-center">
              <button
                type="button"
                (click)="openAddIncidencia()"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#A9C5B5] bg-[#F5F7F8] hover:bg-[#D5EDE3] text-xs font-semibold text-[#344054] transition-colors cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">add</mat-icon>
                AGREGAR INCIDENCIA
              </button>
            </div>
          </section>
        </div>

        <!-- ROW 4: ESTADO DE MÁQUINAS & CHECKLIST DE ENTREGA (2-column split matching sketch) -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
          <!-- ESTADO DE MÁQUINAS -->
          <section
            class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm"
            aria-labelledby="maquinas-heading"
          >
            <div class="flex items-center justify-between pb-3 border-b border-[#DCE8F1]">
              <div>
                <h2
                  id="maquinas-heading"
                  class="font-display text-base font-bold text-[#344054]"
                >
                  ESTADO DE MÁQUINAS
                </h2>
                <p class="text-xs text-[#344054]/65">
                  Control en vivo de equipos críticos del área
                </p>
              </div>
              <span class="text-xs text-[#344054]/70">
                Guardado automático
              </span>
            </div>

            <div class="divide-y divide-[#DCE8F1] mt-2">
              @for (maq of store.maquinas(); track maq.id) {
                <div class="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-[140px]">
                    <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-[#344054]/70"
                      >settings_applications</mat-icon
                    >
                    <span class="font-mono text-xs font-bold text-[#344054]">
                      {{ maq.nombre }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2" role="radiogroup" [attr.aria-label]="'Estado de ' + maq.nombre">
                    @for (st of maquinaEstados; track st) {
                      <button
                        type="button"
                        (click)="setMachineState(maq, st)"
                        [style.background-color]="
                          maq.estado === st ? machineSelectedBg(st) : '#F5F7F8'
                        "
                        [class.font-semibold]="maq.estado === st"
                        [class.border-[#344054]/30]="maq.estado === st"
                        [class.border-[#DCE8F1]]="maq.estado !== st"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-[#344054] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="!text-[14px] !w-3.5 !h-3.5">{{
                          maq.estado === st
                            ? 'radio_button_checked'
                            : 'radio_button_unchecked'
                        }}</mat-icon>
                        {{ st.toUpperCase() }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- CHECKLIST DE ENTREGA -->
          <section
            class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm flex flex-col justify-between"
            aria-labelledby="checklist-heading"
          >
            <div class="flex items-center justify-between pb-3 border-b border-[#DCE8F1]">
              <div>
                <h2
                  id="checklist-heading"
                  class="font-display text-base font-bold text-[#344054]"
                >
                  CHECKLIST DE ENTREGA
                </h2>
                <p class="text-xs text-[#344054]/65">
                  Verificación obligatoria antes del relevo
                </p>
              </div>
              @if (localChecklistPercent() === 100) {
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#B7DCC8] text-xs font-bold text-[#344054]"
                >
                  <mat-icon class="!text-[15px] !w-4 !h-4">verified</mat-icon>
                  100% COMPLETADO
                </span>
              }
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
              <form [formGroup]="checklistForm" class="space-y-3 w-full">
                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    formControlName="equiposLimpios"
                    (change)="onChecklistToggle()"
                    class="w-4 h-4 rounded accent-[#7FB59A] cursor-pointer"
                  />
                  <span class="text-sm font-medium text-[#344054]"
                    >EQUIPOS LIMPIOS</span
                  >
                </label>

                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    formControlName="herramientasCompletas"
                    (change)="onChecklistToggle()"
                    class="w-4 h-4 rounded accent-[#7FB59A] cursor-pointer"
                  />
                  <span class="text-sm font-medium text-[#344054]"
                    >HERRAMIENTAS COMPLETAS</span
                  >
                </label>

                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    formControlName="materialAbastecido"
                    (change)="onChecklistToggle()"
                    class="w-4 h-4 rounded accent-[#7FB59A] cursor-pointer"
                  />
                  <span class="text-sm font-medium text-[#344054]"
                    >MATERIAL ABASTECIDO</span
                  >
                </label>

                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    formControlName="sinRiesgosSeguridad"
                    (change)="onChecklistToggle()"
                    class="w-4 h-4 rounded accent-[#7FB59A] cursor-pointer"
                  />
                  <span class="text-sm font-medium text-[#344054]"
                    >SIN RIESGOS DE SEGURIDAD</span
                  >
                </label>
              </form>

              <div class="shrink-0 flex flex-col items-center">
                <app-donut-indicator
                  [value]="localChecklistPercent()"
                  [size]="108"
                  [strokeWidth]="10"
                  [strokeColor]="
                    localChecklistPercent() === 100 ? '#7FB59A' : '#9BC2E8'
                  "
                  trackColor="#EDF2F7"
                  subLabel="Checklist"
                />
              </div>
            </div>
          </section>
        </div>

        <!-- ROW 5: LÍNEA DE TIEMPO DE EVENTOS -->
        <app-timeline-section />

        <!-- ROW 6: NOTAS PARA EL SIGUIENTE TURNO -->
        <section
          class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm"
          aria-labelledby="notas-heading"
        >
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE8F1]">
            <div>
              <h2
                id="notas-heading"
                class="font-display text-base font-bold text-[#344054]"
              >
                NOTAS PARA EL SIGUIENTE TURNO
              </h2>
              <p class="text-xs text-[#344054]/65">
                Observaciones operativas, instrucciones de arranque o consignas de seguridad
              </p>
            </div>
            <button
              type="button"
              (click)="saveNotesOnly()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCE8F1]/80 hover:bg-[#C7DDF2] text-xs font-semibold text-[#344054] transition-colors cursor-pointer"
            >
              <mat-icon class="!text-[15px] !w-4 !h-4">save</mat-icon>
              Guardar notas
            </button>
          </div>

          <form [formGroup]="notesForm" class="mt-3">
            <textarea
              rows="4"
              formControlName="notas"
              placeholder="Escribe aquí las observaciones clave para el supervisor entrante..."
              class="w-full px-3.5 py-2 text-sm text-[#344054] rounded-xl border border-[#DCE8F1] bg-[#F5F7F8]/40 lined-notes focus:outline-none focus:border-[#A9C5B5] focus:bg-white resize-y"
            ></textarea>
          </form>
        </section>

        <!-- ROW 7: FIRMAS DE SUPERVISORES + GUARDAR / CANCELAR -->
        <section
          class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
          aria-label="Firmas de supervisores y acciones de bitácora"
        >
          <div class="lg:col-span-4">
            <app-signature-pad
              label="FIRMA SUPERVISOR SALIENTE"
              [supervisorName]="generalForm.controls.supervisorSaliente.value"
              [initialDataUrl]="firmaSalienteUrl()"
              (signatureChanged)="onSignatureChanged('saliente', $event)"
            />
          </div>

          <div class="lg:col-span-4">
            <app-signature-pad
              label="FIRMA SUPERVISOR ENTRANTE"
              [supervisorName]="generalForm.controls.supervisorEntrante.value"
              [initialDataUrl]="firmaEntranteUrl()"
              (signatureChanged)="onSignatureChanged('entrante', $event)"
            />
          </div>

          <div
            class="lg:col-span-4 bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex flex-col justify-between gap-3"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-[#344054]">
                Confirmación de Relevo
              </p>
              <p class="text-xs text-[#344054]/70 mt-1">
                Al guardar, se validarán los datos obligatorios y quedará registrada en el historial para consulta y exportación PDF.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                (click)="saveFullBitacora()"
                [disabled]="store.savingBitacora()"
                class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-bold text-[#344054] shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <mat-icon class="!text-[17px] !w-[17px] !h-[17px]">check_circle</mat-icon>
                {{
                  store.savingBitacora()
                    ? 'GUARDANDO...'
                    : 'GUARDAR BITÁCORA'
                }}
              </button>

              <button
                type="button"
                (click)="resetToSavedValues()"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#DCE8F1] bg-[#F5F7F8] hover:bg-[#F2D5D8]/60 text-xs font-semibold text-[#344054] transition-colors whitespace-nowrap cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-4 !h-4">close</mat-icon>
                CANCELAR
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Modal Agregar / Editar Incidencia -->
      @if (incModalOpen()) {
        <div
          class="fixed inset-0 z-50 bg-[#344054]/30 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-[#DCE8F1] shadow-xl p-6"
          >
            <div class="flex items-center justify-between pb-3 border-b border-[#DCE8F1]">
              <h3 class="font-display text-base font-bold text-[#344054]">
                {{ editingIncId() ? 'Editar incidencia' : 'Agregar incidencia' }}
              </h3>
              <button
                type="button"
                (click)="closeIncModal()"
                class="p-1.5 rounded-lg hover:bg-[#F5F7F8] text-[#344054] cursor-pointer"
                aria-label="Cerrar"
              >
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">close</mat-icon>
              </button>
            </div>

            <form
              [formGroup]="incForm"
              (ngSubmit)="submitIncidencia()"
              class="mt-4 space-y-3.5"
            >
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="incHora" class="block text-xs font-medium text-[#344054] mb-1">
                    Hora *
                  </label>
                  <input
                    id="incHora"
                    type="time"
                    formControlName="hora"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1]"
                  />
                </div>
                <div>
                  <label for="incMaquina" class="block text-xs font-medium text-[#344054] mb-1">
                    Máquina *
                  </label>
                  <input
                    id="incMaquina"
                    type="text"
                    formControlName="maquina"
                    list="maq-options"
                    placeholder="PRENSA-01"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1]"
                  />
                  <datalist id="maq-options">
                    @for (m of store.maquinas(); track m.id) {
                      <option [value]="m.nombre"></option>
                    }
                  </datalist>
                </div>
              </div>

              <div>
                <label for="incDescripcion" class="block text-xs font-medium text-[#344054] mb-1">
                  Descripción de la incidencia *
                </label>
                <textarea
                  id="incDescripcion"
                  rows="3"
                  formControlName="descripcion"
                  placeholder="Describe el fallo, paro o pendiente detectado..."
                  class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1]"
                ></textarea>
              </div>

              <div>
                <label for="incEstado" class="block text-xs font-medium text-[#344054] mb-1">
                  Estado *
                </label>
                <select
                  id="incEstado"
                  formControlName="estado"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1]"
                >
                  @for (st of incidenciaEstados; track st) {
                    <option [value]="st">{{ st }}</option>
                  }
                </select>
              </div>

              <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE8F1]">
                <button
                  type="button"
                  (click)="closeIncModal()"
                  class="px-4 py-2 rounded-xl border border-[#DCE8F1] text-xs font-medium text-[#344054] hover:bg-[#F5F7F8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="incForm.invalid"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-semibold text-[#344054] disabled:opacity-45 cursor-pointer"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">save</mat-icon>
                  {{ editingIncId() ? 'Actualizar' : 'Registrar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    }
  `,
})
export class DashboardView {
  readonly store = inject(ShiftLogStore);

  readonly incidenciaEstados = INCIDENCIA_ESTADOS;
  readonly maquinaEstados = MAQUINA_ESTADOS;

  readonly validationError = signal<string | null>(null);
  readonly showAddProduct = signal(false);
  readonly incModalOpen = signal(false);
  readonly editingIncId = signal<string | null>(null);

  readonly generalForm = new FormGroup({
    areaLinea: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fecha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    turnoSaliente: new FormControl(TURNO_MATUTINO, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    turnoEntrante: new FormControl(TURNO_VESPERTINO, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    supervisorSaliente: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    supervisorEntrante: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly checklistForm = new FormGroup({
    equiposLimpios: new FormControl(false, {nonNullable: true}),
    herramientasCompletas: new FormControl(false, {nonNullable: true}),
    materialAbastecido: new FormControl(false, {nonNullable: true}),
    sinRiesgosSeguridad: new FormControl(false, {nonNullable: true}),
  });

  readonly notesForm = new FormGroup({
    notas: new FormControl('', {nonNullable: true}),
  });

  readonly newProdForm = new FormGroup({
    producto: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(140)],
    }),
    meta: new FormControl(500, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    producido: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  readonly incForm = new FormGroup({
    hora: new FormControl('09:00', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    maquina: new FormControl('PRENSA-01', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    estado: new FormControl<IncidenciaEstado>('Pendiente', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly checklistTick = signal(0);

  readonly localChecklistPercent = computed(() => {
    this.checklistTick();
    const v = this.checklistForm.getRawValue();
    const checked = [
      v.equiposLimpios,
      v.herramientasCompletas,
      v.materialAbastecido,
      v.sinRiesgosSeguridad,
    ].filter(Boolean).length;
    return Math.round((checked / 4) * 100);
  });

  readonly shiftOptions = computed(() => {
    const base = [TURNO_MATUTINO, TURNO_VESPERTINO, TURNO_NOCTURNO];
    const custom = this.store
      .turnos()
      .map((t) => `${t.nombre} (${t.horario})`);
    return Array.from(new Set([...base, ...custom]));
  });

  readonly firmaSalienteUrl = computed(
    () => this.store.firmas().find((f) => f.tipo === 'saliente')?.dataUrl ?? '',
  );
  readonly firmaEntranteUrl = computed(
    () => this.store.firmas().find((f) => f.tipo === 'entrante')?.dataUrl ?? '',
  );

  private loadedId: string | null = null;

  constructor() {
    effect(() => {
      const b = this.store.activeBitacora();
      if (b && b.id !== this.loadedId) {
        this.loadedId = b.id;
        this.syncFormsFromBitacora(b);
      } else if (!b) {
        this.loadedId = null;
      }
    });
  }

  private syncFormsFromBitacora(b: NonNullable<ReturnType<typeof this.store.activeBitacora>>): void {
    this.generalForm.reset({
      areaLinea: b.areaLinea,
      fecha: b.fecha,
      turnoSaliente: b.turnoSaliente,
      turnoEntrante: b.turnoEntrante,
      supervisorSaliente: b.supervisorSaliente,
      supervisorEntrante: b.supervisorEntrante,
    });
    this.checklistForm.reset({
      equiposLimpios: b.equiposLimpios,
      herramientasCompletas: b.herramientasCompletas,
      materialAbastecido: b.materialAbastecido,
      sinRiesgosSeguridad: b.sinRiesgosSeguridad,
    });
    this.notesForm.reset({notas: b.notas});
    this.checklistTick.update((n) => n + 1);
    this.validationError.set(null);
  }

  clampBar(val: number): number {
    return Math.max(0, Math.min(100, val));
  }

  incidenciaBg(estado: IncidenciaEstado): string {
    switch (estado) {
      case 'Pendiente':
        return '#F7E8B5';
      case 'En proceso':
        return '#C7DDF2';
      case 'Resuelto':
        return '#D5EDE3';
    }
  }

  machineSelectedBg(estado: MaquinaEstadoTipo): string {
    switch (estado) {
      case 'Operando':
        return '#B7DCC8';
      case 'Detenida':
        return '#F7E8B5';
      case 'Mantenimiento':
        return '#F2D5D8';
    }
  }

  toggleAddProduct(): void {
    this.showAddProduct.update((v) => !v);
  }

  async submitNewProduct(): Promise<void> {
    if (this.newProdForm.invalid) {
      return;
    }
    const v = this.newProdForm.getRawValue();
    await this.store.addProduccionRow(v.producto, v.meta, v.producido);
    this.newProdForm.reset({producto: '', meta: 500, producido: 0});
    this.showAddProduct.set(false);
  }

  async onProdFieldChange(
    row: ProduccionItem,
    field: 'producto' | 'meta' | 'producido',
    ev: Event,
  ): Promise<void> {
    const val = (ev.target as HTMLInputElement).value;
    const producto = field === 'producto' ? val : row.producto;
    const meta = field === 'meta' ? Number(val) || 0 : row.meta;
    const producido = field === 'producido' ? Number(val) || 0 : row.producido;
    await this.store.updateProduccionRow(row.id, producto, meta, producido);
  }

  async onIncidenciaStatusChange(inc: Incidencia, ev: Event): Promise<void> {
    const estado = (ev.target as HTMLSelectElement).value as IncidenciaEstado;
    await this.store.updateIncidencia(inc.id, {estado});
  }

  openAddIncidencia(): void {
    this.editingIncId.set(null);
    const nowTime = new Date().toTimeString().slice(0, 5);
    this.incForm.reset({
      hora: nowTime,
      descripcion: '',
      maquina: this.store.maquinas()[0]?.nombre || 'PRENSA-01',
      estado: 'Pendiente',
    });
    this.incModalOpen.set(true);
  }

  openEditIncidencia(inc: Incidencia): void {
    this.editingIncId.set(inc.id);
    this.incForm.reset({
      hora: inc.hora,
      descripcion: inc.descripcion,
      maquina: inc.maquina,
      estado: inc.estado,
    });
    this.incModalOpen.set(true);
  }

  closeIncModal(): void {
    this.incModalOpen.set(false);
    this.editingIncId.set(null);
  }

  async submitIncidencia(): Promise<void> {
    if (this.incForm.invalid) {
      return;
    }
    const val = this.incForm.getRawValue();
    const id = this.editingIncId();
    if (id) {
      await this.store.updateIncidencia(id, val);
    } else {
      await this.store.addIncidencia(
        val.hora,
        val.descripcion,
        val.maquina,
        val.estado,
      );
    }
    this.closeIncModal();
  }

  async setMachineState(maq: MaquinaEstado, estado: MaquinaEstadoTipo): Promise<void> {
    if (maq.estado === estado) {
      return;
    }
    await this.store.updateMaquinaEstado(maq.id, estado);
  }

  async onChecklistToggle(): Promise<void> {
    this.checklistTick.update((n) => n + 1);
    const g = this.generalForm.getRawValue();
    const c = this.checklistForm.getRawValue();
    const n = this.notesForm.getRawValue();
    if (this.generalForm.valid) {
      await this.store.saveBitacora(
        {
          ...g,
          ...c,
          ...n,
        },
        true,
      );
    }
  }

  async saveNotesOnly(): Promise<void> {
    if (this.generalForm.invalid) {
      this.validationError.set(
        'Completa primero los campos obligatorios en Datos Generales.',
      );
      return;
    }
    const g = this.generalForm.getRawValue();
    const c = this.checklistForm.getRawValue();
    const n = this.notesForm.getRawValue();
    await this.store.saveBitacora({...g, ...c, ...n}, false);
  }

  async onSignatureChanged(
    tipo: 'saliente' | 'entrante',
    dataUrl: string,
  ): Promise<void> {
    const g = this.generalForm.getRawValue();
    const sup =
      tipo === 'saliente' ? g.supervisorSaliente : g.supervisorEntrante;
    await this.store.saveFirma(tipo, sup || 'Supervisor', dataUrl);
  }

  async saveFullBitacora(): Promise<void> {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      this.validationError.set(
        'Por favor completa todos los campos obligatorios: Área/Línea, Fecha, Turnos y Supervisores.',
      );
      return;
    }
    this.validationError.set(null);
    const g = this.generalForm.getRawValue();
    const c = this.checklistForm.getRawValue();
    const n = this.notesForm.getRawValue();
    await this.store.saveBitacora({
      ...g,
      ...c,
      ...n,
      estado: 'guardada',
    });
  }

  resetToSavedValues(): void {
    const b = this.store.activeBitacora();
    if (b) {
      this.syncFormsFromBitacora(b);
      this.store.showToast('Cambios descartados.', 'info');
    }
  }
}
