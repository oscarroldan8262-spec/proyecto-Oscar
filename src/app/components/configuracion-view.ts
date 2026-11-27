import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {
  MAQUINA_ESTADOS,
  MaquinaEstadoTipo,
  TURNO_MATUTINO,
  TURNO_NOCTURNO,
  TURNO_VESPERTINO,
} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';

@Component({
  selector: 'app-configuracion-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
        <h2 class="font-display text-lg font-bold text-[#344054]">
          CONFIGURACIÓN DEL SISTEMA INDUSTRIAL
        </h2>
        <p class="text-xs text-[#344054]/70 mt-0.5">
          Administra el catálogo de supervisores, horarios de turno y equipos de planta sincronizados en la base de datos.
        </p>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <!-- Supervisores -->
        <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
          <h3 class="font-display text-base font-bold text-[#344054] pb-3 border-b border-[#DCE8F1]">
            Supervisores
          </h3>

          <form
            [formGroup]="supForm"
            (ngSubmit)="submitSupervisor()"
            class="mt-3 space-y-2.5"
          >
            <input
              type="text"
              formControlName="nombre"
              placeholder="Nombre completo *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <input
              type="text"
              formControlName="area"
              placeholder="Área asignada *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <select
              formControlName="turnoDefault"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            >
              <option [value]="matutino">{{ matutino }}</option>
              <option [value]="vespertino">{{ vespertino }}</option>
              <option [value]="nocturno">{{ nocturno }}</option>
            </select>
            <button
              type="submit"
              [disabled]="supForm.invalid"
              class="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-xs font-semibold text-[#344054] disabled:opacity-45 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">person_add</mat-icon>
              Agregar supervisor
            </button>
          </form>

          <ul class="mt-4 divide-y divide-[#DCE8F1]">
            @for (sup of store.supervisores(); track sup.id) {
              <li class="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <p class="font-semibold text-[#344054] truncate">{{ sup.nombre }}</p>
                  <p class="text-[11px] text-[#344054]/65 truncate">{{ sup.area }}</p>
                </div>
                <button
                  type="button"
                  (click)="store.deleteSupervisor(sup.id)"
                  class="p-1.5 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/70 cursor-pointer shrink-0"
                  aria-label="Eliminar supervisor"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">delete_outline</mat-icon>
                </button>
              </li>
            }
          </ul>
        </section>

        <!-- Turnos -->
        <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
          <h3 class="font-display text-base font-bold text-[#344054] pb-3 border-b border-[#DCE8F1]">
            Turnos de Planta
          </h3>

          <form
            [formGroup]="turnoForm"
            (ngSubmit)="submitTurno()"
            class="mt-3 space-y-2.5"
          >
            <input
              type="text"
              formControlName="codigo"
              placeholder="Código (ej. T4-ESP) *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <input
              type="text"
              formControlName="nombre"
              placeholder="Nombre del turno *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <input
              type="text"
              formControlName="horario"
              placeholder="Horario (ej. 06:00 - 14:00) *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <button
              type="submit"
              [disabled]="turnoForm.invalid"
              class="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C7DDF2] hover:bg-[#B2D0EC] text-xs font-semibold text-[#344054] disabled:opacity-45 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">schedule</mat-icon>
              Agregar turno
            </button>
          </form>

          <ul class="mt-4 divide-y divide-[#DCE8F1]">
            @for (t of store.turnos(); track t.id) {
              <li class="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <p class="font-semibold text-[#344054] truncate">
                    {{ t.nombre }} ({{ t.codigo }})
                  </p>
                  <p class="text-[11px] font-mono text-[#344054]/65">{{ t.horario }}</p>
                </div>
                <button
                  type="button"
                  (click)="store.deleteTurno(t.id)"
                  class="p-1.5 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/70 cursor-pointer shrink-0"
                  aria-label="Eliminar turno"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">delete_outline</mat-icon>
                </button>
              </li>
            }
          </ul>
        </section>

        <!-- Catálogo de Máquinas -->
        <section class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm">
          <h3 class="font-display text-base font-bold text-[#344054] pb-3 border-b border-[#DCE8F1]">
            Catálogo de Máquinas
          </h3>

          <form
            [formGroup]="maqForm"
            (ngSubmit)="submitMaquina()"
            class="mt-3 space-y-2.5"
          >
            <input
              type="text"
              formControlName="codigo"
              placeholder="Código equipo (ej. TROQUEL-04) *"
              class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <input
              type="text"
              formControlName="area"
              placeholder="Área de ubicación *"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            />
            <select
              formControlName="estadoDefault"
              class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/50"
            >
              @for (st of maquinaEstados; track st) {
                <option [value]="st">{{ st }}</option>
              }
            </select>
            <button
              type="submit"
              [disabled]="maqForm.invalid"
              class="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#DED5F0] hover:bg-[#CFC2E8] text-xs font-semibold text-[#344054] disabled:opacity-45 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">precision_manufacturing</mat-icon>
              Agregar máquina
            </button>
          </form>

          <ul class="mt-4 divide-y divide-[#DCE8F1]">
            @for (m of store.maquinasCatalogo(); track m.id) {
              <li class="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <p class="font-mono font-bold text-[#344054] truncate">{{ m.codigo }}</p>
                  <p class="text-[11px] text-[#344054]/65 truncate">{{ m.area }}</p>
                </div>
                <button
                  type="button"
                  (click)="store.deleteMaquinaCatalogo(m.id)"
                  class="p-1.5 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/70 cursor-pointer shrink-0"
                  aria-label="Eliminar máquina"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">delete_outline</mat-icon>
                </button>
              </li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class ConfiguracionView {
  readonly store = inject(ShiftLogStore);

  readonly matutino = TURNO_MATUTINO;
  readonly vespertino = TURNO_VESPERTINO;
  readonly nocturno = TURNO_NOCTURNO;
  readonly maquinaEstados = MAQUINA_ESTADOS;

  readonly supForm = new FormGroup({
    nombre: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    area: new FormControl('Línea 01 - Estampado y Ensamble', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    turnoDefault: new FormControl(TURNO_MATUTINO, {nonNullable: true}),
  });

  readonly turnoForm = new FormGroup({
    codigo: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    nombre: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    horario: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
  });

  readonly maqForm = new FormGroup({
    codigo: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    area: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    estadoDefault: new FormControl<MaquinaEstadoTipo>('Operando', {
      nonNullable: true,
    }),
  });

  async submitSupervisor(): Promise<void> {
    if (this.supForm.invalid) return;
    const v = this.supForm.getRawValue();
    await this.store.addSupervisor(v.nombre, v.area, v.turnoDefault);
    this.supForm.reset({
      nombre: '',
      area: 'Línea 01 - Estampado y Ensamble',
      turnoDefault: TURNO_MATUTINO,
    });
  }

  async submitTurno(): Promise<void> {
    if (this.turnoForm.invalid) return;
    const v = this.turnoForm.getRawValue();
    await this.store.addTurno(v.codigo, v.nombre, v.horario);
    this.turnoForm.reset({codigo: '', nombre: '', horario: ''});
  }

  async submitMaquina(): Promise<void> {
    if (this.maqForm.invalid) return;
    const v = this.maqForm.getRawValue();
    await this.store.addMaquinaCatalogo(v.codigo, v.area, v.estadoDefault);
    this.maqForm.reset({codigo: '', area: '', estadoDefault: 'Operando'});
  }
}
