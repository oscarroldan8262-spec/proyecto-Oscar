import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {
  EVENTO_CATEGORIAS,
  EVENTO_ESTADOS,
  Evento,
  EventoCategoria,
  EventoEstado,
} from '../models/shift-log';
import {ShiftLogStore} from '../services/shift-log-store';

@Component({
  selector: 'app-timeline-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <section
      class="bg-white rounded-xl border border-[#DCE8F1] p-5 shadow-sm"
      aria-labelledby="timeline-heading"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DCE8F1]"
      >
        <div>
          <h2
            id="timeline-heading"
            class="font-display text-base font-bold tracking-tight text-[#344054]"
          >
            LÍNEA DE TIEMPO DE EVENTOS
          </h2>
          <p class="text-xs text-[#344054]/70 mt-0.5">
            Registro cronológico del turno · {{ filteredEventos().length }}
            eventos visibles
          </p>
        </div>

        <button
          type="button"
          (click)="openCreateModal()"
          [disabled]="readOnly()"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-[#344054] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 cursor-pointer"
        >
          <mat-icon class="!text-[16px] !w-4 !h-4">add</mat-icon>
          Nuevo evento
        </button>
      </div>

      <!-- Search and Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 py-4">
        <div class="relative md:col-span-2">
          <mat-icon
            class="!text-[18px] !w-[18px] !h-[18px] text-[#344054]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            >search</mat-icon
          >
          <input
            type="text"
            [value]="searchText()"
            (input)="onSearchInput($event)"
            placeholder="Buscar por título, descripción o responsable..."
            class="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
          />
        </div>

        <div>
          <select
            [value]="selectedCategory()"
            (change)="onCategoryFilter($event)"
            aria-label="Filtrar por categoría"
            class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
          >
            <option value="TODAS">Todas las categorías</option>
            @for (cat of categorias; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="date"
            [value]="selectedDate()"
            (change)="onDateFilter($event)"
            aria-label="Filtrar por fecha"
            class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] bg-[#F5F7F8]/60 text-[#344054] focus:outline-none focus:border-[#A9C5B5] focus:bg-white"
          />
          @if (searchText() || selectedCategory() !== 'TODAS' || selectedDate()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="px-2.5 py-2 text-xs rounded-lg bg-[#F5F7F8] hover:bg-[#DCE8F1]/60 text-[#344054] shrink-0 cursor-pointer"
              title="Limpiar filtros"
            >
              <mat-icon class="!text-[16px] !w-4 !h-4">filter_alt_off</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Vertical Timeline -->
      @if (filteredEventos().length === 0) {
        <div
          class="py-10 px-4 text-center rounded-xl border border-dashed border-[#DCE8F1] bg-[#F5F7F8]/40"
        >
          <mat-icon class="text-[#344054]/40 !text-[32px] !w-8 !h-8 mb-2"
            >timeline</mat-icon
          >
          <p class="text-sm font-medium text-[#344054]">
            No hay eventos que coincidan con los filtros
          </p>
          <p class="text-xs text-[#344054]/65 mt-1">
            Registra un nuevo evento o ajusta la búsqueda por categoría o fecha.
          </p>
        </div>
      } @else {
        <div class="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#DCE8F1]">
          @for (ev of filteredEventos(); track ev.id) {
            <article class="relative">
              <span
                class="absolute -left-6 top-4 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                [style.background-color]="categoryDotColor(ev.categoria)"
                aria-hidden="true"
              ></span>

              <div
                class="rounded-xl border border-[#DCE8F1] bg-[#F5F7F8]/45 hover:bg-white transition-colors p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      class="font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-white border border-[#DCE8F1] text-[#344054]"
                    >
                      {{ ev.hora }}
                    </span>
                    <span
                      class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md text-[#344054]"
                      [style.background-color]="categoryBgColor(ev.categoria)"
                    >
                      {{ ev.categoria }}
                    </span>
                    <span class="text-xs text-[#344054]/60 font-mono tabular-nums">
                      {{ ev.fecha }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <select
                      [value]="ev.estado"
                      (change)="onStatusChange(ev, $event)"
                      [disabled]="readOnly()"
                      aria-label="Estado del evento"
                      class="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none cursor-pointer"
                      [style.background-color]="statusBgColor(ev.estado)"
                    >
                      @for (st of estados; track st) {
                        <option [value]="st">{{ st }}</option>
                      }
                    </select>

                    <button
                      type="button"
                      (click)="openEditModal(ev)"
                      [disabled]="readOnly()"
                      class="p-1.5 rounded-lg hover:bg-[#DCE8F1]/60 text-[#344054]/75 hover:text-[#344054] transition-colors disabled:opacity-40 cursor-pointer"
                      aria-label="Editar evento"
                    >
                      <mat-icon class="!text-[16px] !w-4 !h-4">edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      (click)="deleteEvento(ev.id)"
                      [disabled]="readOnly()"
                      class="p-1.5 rounded-lg hover:bg-[#F2D5D8] text-[#344054]/75 hover:text-[#344054] transition-colors disabled:opacity-40 cursor-pointer"
                      aria-label="Eliminar evento"
                    >
                      <mat-icon class="!text-[16px] !w-4 !h-4">delete</mat-icon>
                    </button>
                  </div>
                </div>

                <h3 class="font-display text-sm font-semibold text-[#344054] mt-2">
                  {{ ev.titulo }}
                </h3>
                @if (ev.descripcion) {
                  <p class="text-xs text-[#344054]/80 mt-1 leading-relaxed">
                    {{ ev.descripcion }}
                  </p>
                }

                <div
                  class="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-[#DCE8F1]/80 text-xs text-[#344054]/75"
                >
                  <button
                    type="button"
                    (click)="filterByResponsible(ev.responsable)"
                    class="inline-flex items-center gap-1 hover:underline cursor-pointer"
                    title="Consultar eventos de este responsable"
                  >
                    <mat-icon class="!text-[14px] !w-3.5 !h-3.5">person</mat-icon>
                    Responsable: <strong class="font-medium text-[#344054]">{{ ev.responsable }}</strong>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }

      <!-- Create / Edit Event Modal -->
      @if (modalOpen()) {
        <div
          class="fixed inset-0 z-50 bg-[#344054]/30 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div
            class="w-full max-w-lg bg-white rounded-2xl border border-[#DCE8F1] shadow-xl p-6"
          >
            <div class="flex items-center justify-between pb-3 border-b border-[#DCE8F1]">
              <h3 class="font-display text-base font-bold text-[#344054]">
                {{ editingId() ? 'Editar evento de turno' : 'Registrar nuevo evento' }}
              </h3>
              <button
                type="button"
                (click)="closeModal()"
                class="p-1.5 rounded-lg hover:bg-[#F5F7F8] text-[#344054] cursor-pointer"
                aria-label="Cerrar"
              >
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">close</mat-icon>
              </button>
            </div>

            <form
              [formGroup]="eventoForm"
              (ngSubmit)="submitEvento()"
              class="mt-4 space-y-3.5"
            >
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="evHora" class="block text-xs font-medium text-[#344054] mb-1">
                    Hora *
                  </label>
                  <input
                    id="evHora"
                    type="time"
                    formControlName="hora"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                  />
                </div>
                <div>
                  <label for="evFecha" class="block text-xs font-medium text-[#344054] mb-1">
                    Fecha *
                  </label>
                  <input
                    id="evFecha"
                    type="date"
                    formControlName="fecha"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="evCategoria" class="block text-xs font-medium text-[#344054] mb-1">
                    Categoría *
                  </label>
                  <select
                    id="evCategoria"
                    formControlName="categoria"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                  >
                    @for (cat of categorias; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="evEstado" class="block text-xs font-medium text-[#344054] mb-1">
                    Estado *
                  </label>
                  <select
                    id="evEstado"
                    formControlName="estado"
                    class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                  >
                    @for (st of estados; track st) {
                      <option [value]="st">{{ st }}</option>
                    }
                  </select>
                </div>
              </div>

              <div>
                <label for="evTitulo" class="block text-xs font-medium text-[#344054] mb-1">
                  Título del evento *
                </label>
                <input
                  id="evTitulo"
                  type="text"
                  formControlName="titulo"
                  placeholder="Ej. Ajuste de presión hidráulica en prensa"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                />
              </div>

              <div>
                <label for="evDescripcion" class="block text-xs font-medium text-[#344054] mb-1">
                  Descripción
                </label>
                <textarea
                  id="evDescripcion"
                  rows="3"
                  formControlName="descripcion"
                  placeholder="Detalles técnicos o acciones realizadas..."
                  class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                ></textarea>
              </div>

              <div>
                <label for="evResponsable" class="block text-xs font-medium text-[#344054] mb-1">
                  Responsable *
                </label>
                <input
                  id="evResponsable"
                  type="text"
                  formControlName="responsable"
                  list="supervisores-datalist"
                  placeholder="Nombre del técnico o supervisor"
                  class="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE8F1] text-[#344054] focus:outline-none focus:border-[#A9C5B5]"
                />
                <datalist id="supervisores-datalist">
                  @for (sup of store.supervisores(); track sup.id) {
                    <option [value]="sup.nombre"></option>
                  }
                </datalist>
              </div>

              <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DCE8F1]">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 rounded-xl border border-[#DCE8F1] text-xs font-medium text-[#344054] hover:bg-[#F5F7F8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="eventoForm.invalid"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-[#344054] text-xs font-semibold disabled:opacity-45 cursor-pointer"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">save</mat-icon>
                  {{ editingId() ? 'Guardar cambios' : 'Agregar evento' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
})
export class TimelineSection {
  readonly store = inject(ShiftLogStore);
  readonly readOnly = input<boolean>(false);

  readonly categorias = EVENTO_CATEGORIAS;
  readonly estados = EVENTO_ESTADOS;

  readonly searchText = signal('');
  readonly selectedCategory = signal<string>('TODAS');
  readonly selectedDate = signal<string>('');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly eventoForm = new FormGroup({
    hora: new FormControl('08:00', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fecha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    categoria: new FormControl<EventoCategoria>('PRODUCCIÓN', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    responsable: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    estado: new FormControl<EventoEstado>('Abierto', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly filteredEventos = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const cat = this.selectedCategory();
    const dt = this.selectedDate();

    return this.store.eventos().filter((ev) => {
      if (cat !== 'TODAS' && ev.categoria !== cat) {
        return false;
      }
      if (dt && ev.fecha !== dt) {
        return false;
      }
      if (q) {
        const hay = `${ev.titulo} ${ev.descripcion} ${ev.responsable} ${ev.categoria}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
  });

  categoryBgColor(cat: EventoCategoria): string {
    switch (cat) {
      case 'ANOMALÍA':
        return '#F2D5D8';
      case 'PENDIENTE':
        return '#F7E8B5';
      case 'AJUSTE':
        return '#C7DDF2';
      case 'MANTENIMIENTO':
        return '#DED5F0';
      case 'PRODUCCIÓN':
        return '#B7DCC8';
    }
  }

  categoryDotColor(cat: EventoCategoria): string {
    switch (cat) {
      case 'ANOMALÍA':
        return '#E5A8AF';
      case 'PENDIENTE':
        return '#E6CB78';
      case 'AJUSTE':
        return '#9BC2E8';
      case 'MANTENIMIENTO':
        return '#BEAFE3';
      case 'PRODUCCIÓN':
        return '#8FC4A7';
    }
  }

  statusBgColor(status: EventoEstado): string {
    switch (status) {
      case 'Abierto':
        return '#F7E8B5';
      case 'En seguimiento':
        return '#C7DDF2';
      case 'Cerrado':
        return '#D5EDE3';
    }
  }

  onSearchInput(ev: Event): void {
    this.searchText.set((ev.target as HTMLInputElement).value);
  }

  onCategoryFilter(ev: Event): void {
    this.selectedCategory.set((ev.target as HTMLSelectElement).value);
  }

  onDateFilter(ev: Event): void {
    this.selectedDate.set((ev.target as HTMLInputElement).value);
  }

  filterByResponsible(nombre: string): void {
    this.searchText.set(nombre);
  }

  clearFilters(): void {
    this.searchText.set('');
    this.selectedCategory.set('TODAS');
    this.selectedDate.set('');
  }

  async onStatusChange(ev: Evento, domEv: Event): Promise<void> {
    const estado = (domEv.target as HTMLSelectElement).value as EventoEstado;
    await this.store.updateEvento(ev.id, {estado});
  }

  openCreateModal(): void {
    const active = this.store.activeBitacora();
    const nowTime = new Date().toTimeString().slice(0, 5);
    this.editingId.set(null);
    this.eventoForm.reset({
      hora: nowTime,
      fecha: active?.fecha || new Date().toISOString().slice(0, 10),
      categoria: 'PRODUCCIÓN',
      titulo: '',
      descripcion: '',
      responsable: active?.supervisorSaliente || '',
      estado: 'Abierto',
    });
    this.modalOpen.set(true);
  }

  openEditModal(ev: Evento): void {
    this.editingId.set(ev.id);
    this.eventoForm.reset({
      hora: ev.hora,
      fecha: ev.fecha,
      categoria: ev.categoria,
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      responsable: ev.responsable,
      estado: ev.estado,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingId.set(null);
  }

  async submitEvento(): Promise<void> {
    if (this.eventoForm.invalid) {
      return;
    }
    const val = this.eventoForm.getRawValue();
    const id = this.editingId();
    if (id) {
      await this.store.updateEvento(id, val);
    } else {
      await this.store.addEvento(val);
    }
    this.closeModal();
  }

  async deleteEvento(id: string): Promise<void> {
    await this.store.deleteEvento(id);
  }
}
