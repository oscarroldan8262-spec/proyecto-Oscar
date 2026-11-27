import {Injectable, computed, effect, inject, signal} from '@angular/core';
import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bitacora,
  BitacoraEstado,
  Evento,
  EventoCategoria,
  EventoEstado,
  FIELD_LIMITS,
  Firma,
  FirmaTipo,
  FullBitacoraSnapshot,
  Incidencia,
  IncidenciaEstado,
  MaquinaCatalogo,
  MaquinaEstado,
  MaquinaEstadoTipo,
  NavSection,
  ProduccionItem,
  Supervisor,
  TURNO_MATUTINO,
  TURNO_NOCTURNO,
  TURNO_VESPERTINO,
  TurnoConfig,
} from '../models/shift-log';
import {FirebaseClient, OperationType} from './firebase-client';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftLogStore {
  private readonly fb = inject(FirebaseClient);

  readonly activeNav = signal<NavSection>('dashboard');
  readonly loadingWorkspace = signal(false);
  readonly savingBitacora = signal(false);
  readonly toast = signal<ToastMessage | null>(null);
  readonly activeShiftHeader = signal<string>(TURNO_MATUTINO);

  // Catalog collections
  readonly supervisores = signal<Supervisor[]>([]);
  readonly turnos = signal<TurnoConfig[]>([]);
  readonly maquinasCatalogo = signal<MaquinaCatalogo[]>([]);

  // All shift logs owned by user
  readonly bitacoras = signal<Bitacora[]>([]);
  readonly activeBitacoraId = signal<string | null>(null);

  // Subcollections of the active shift log
  readonly eventos = signal<Evento[]>([]);
  readonly incidencias = signal<Incidencia[]>([]);
  readonly produccion = signal<ProduccionItem[]>([]);
  readonly maquinas = signal<MaquinaEstado[]>([]);
  readonly firmas = signal<Firma[]>([]);

  // Active shift log derived object
  readonly activeBitacora = computed(() => {
    const id = this.activeBitacoraId();
    return this.bitacoras().find((b) => b.id === id) ?? null;
  });

  // Live computed KPIs for "RESUMEN DEL TURNO"
  readonly totalMeta = computed(() =>
    this.produccion().reduce((acc, item) => acc + (Number(item.meta) || 0), 0),
  );

  readonly totalProduccion = computed(() =>
    this.produccion().reduce(
      (acc, item) => acc + (Number(item.producido) || 0),
      0,
    ),
  );

  readonly cumplimientoPromedio = computed(() => {
    const meta = this.totalMeta();
    if (meta <= 0) {
      return 0;
    }
    return Math.round((this.totalProduccion() / meta) * 1000) / 10;
  });

  readonly totalIncidencias = computed(() => this.incidencias().length);

  readonly incidenciasPendientes = computed(
    () => this.incidencias().filter((i) => i.estado !== 'Resuelto').length,
  );

  readonly maquinasDetenidas = computed(
    () => this.maquinas().filter((m) => m.estado === 'Detenida').length,
  );

  readonly checklistPorcentaje = computed(() => {
    const b = this.activeBitacora();
    if (!b) {
      return 0;
    }
    const items = [
      b.equiposLimpios,
      b.herramientasCompletas,
      b.materialAbastecido,
      b.sinRiesgosSeguridad,
    ];
    const checked = items.filter(Boolean).length;
    return Math.round((checked / 4) * 100);
  });

  readonly checklistCompletado = computed(
    () => this.checklistPorcentaje() === 100,
  );

  private rootUnsubs: Unsubscribe[] = [];
  private childUnsubs: Unsubscribe[] = [];
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private seededForUid: string | null = null;

  constructor() {
    effect(() => {
      if (!this.fb.isBrowser) {
        return;
      }
      const ready = this.fb.authReady();
      const user = this.fb.user();
      if (!ready) {
        return;
      }
      if (user) {
        void this.attachUserWorkspace(user.uid, user.displayName, user.email);
      } else {
        this.clearListeners();
        this.resetState();
      }
    });

    effect(() => {
      if (!this.fb.isBrowser) {
        return;
      }
      const user = this.fb.user();
      const bitacoraId = this.activeBitacoraId();
      this.clearChildListeners();
      if (user && bitacoraId) {
        this.attachBitacoraChildren(user.uid, bitacoraId);
      }
    });
  }

  showToast(message: string, type: ToastMessage['type'] = 'success'): void {
    this.toast.set({type, message});
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 3800);
  }

  clearToast(): void {
    this.toast.set(null);
  }

  setNav(section: NavSection): void {
    this.activeNav.set(section);
  }

  selectBitacora(id: string): void {
    this.activeBitacoraId.set(id);
  }

  private clearListeners(): void {
    this.clearChildListeners();
    for (const unsub of this.rootUnsubs) {
      unsub();
    }
    this.rootUnsubs = [];
  }

  private clearChildListeners(): void {
    for (const unsub of this.childUnsubs) {
      unsub();
    }
    this.childUnsubs = [];
  }

  private resetState(): void {
    this.bitacoras.set([]);
    this.activeBitacoraId.set(null);
    this.supervisores.set([]);
    this.turnos.set([]);
    this.maquinasCatalogo.set([]);
    this.eventos.set([]);
    this.incidencias.set([]);
    this.produccion.set([]);
    this.maquinas.set([]);
    this.firmas.set([]);
    this.seededForUid = null;
  }

  private clip(value: string, maxLen: number): string {
    return (value ?? '').trim().slice(0, maxLen);
  }

  private todayIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private offsetDateIso(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private genId(prefix: string): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private async attachUserWorkspace(
    uid: string,
    displayName: string | null,
    email: string | null,
  ): Promise<void> {
    this.clearListeners();
    this.loadingWorkspace.set(true);

    try {
      await this.ensureUserProfile(uid, displayName, email);

      const db = this.fb.db;

      const bitacorasQuery = query(
        collection(db, 'bitacoras'),
        where('ownerId', '==', uid),
      );

      let initialChecked = false;
      const unsubBitacoras = onSnapshot(
        bitacorasQuery,
        (snap) => {
          const items = snap.docs
            .map((d) => ({id: d.id, ...(d.data() as Omit<Bitacora, 'id'>)}))
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio));

          this.bitacoras.set(items);

          if (!initialChecked) {
            initialChecked = true;
            if (items.length === 0 && this.seededForUid !== uid) {
              this.seededForUid = uid;
              void this.seedInitialWorkspace(uid, displayName || 'Supervisor Planta');
            } else if (items.length > 0 && !this.activeBitacoraId()) {
              this.activeBitacoraId.set(items[0].id);
            }
            this.loadingWorkspace.set(false);
          } else if (
            items.length > 0 &&
            (!this.activeBitacoraId() ||
              !items.some((b) => b.id === this.activeBitacoraId()))
          ) {
            this.activeBitacoraId.set(items[0].id);
          }
        },
        (err) => {
          this.loadingWorkspace.set(false);
          this.fb.handleFirestoreError(err, OperationType.LIST, 'bitacoras');
        },
      );

      const supQuery = query(
        collection(db, 'supervisores'),
        where('ownerId', '==', uid),
      );
      const unsubSup = onSnapshot(
        supQuery,
        (snap) => {
          const rows = snap.docs
            .map((d) => ({id: d.id, ...(d.data() as Omit<Supervisor, 'id'>)}))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          this.supervisores.set(rows);
        },
        (err) => this.fb.handleFirestoreError(err, OperationType.LIST, 'supervisores'),
      );

      const turnosQuery = query(
        collection(db, 'turnos'),
        where('ownerId', '==', uid),
      );
      const unsubTurnos = onSnapshot(
        turnosQuery,
        (snap) => {
          const rows = snap.docs
            .map((d) => ({id: d.id, ...(d.data() as Omit<TurnoConfig, 'id'>)}))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));
          this.turnos.set(rows);
        },
        (err) => this.fb.handleFirestoreError(err, OperationType.LIST, 'turnos'),
      );

      const maqQuery = query(
        collection(db, 'maquinas'),
        where('ownerId', '==', uid),
      );
      const unsubMaq = onSnapshot(
        maqQuery,
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<MaquinaCatalogo, 'id'>),
            }))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));
          this.maquinasCatalogo.set(rows);
        },
        (err) => this.fb.handleFirestoreError(err, OperationType.LIST, 'maquinas'),
      );

      this.rootUnsubs.push(unsubBitacoras, unsubSup, unsubTurnos, unsubMaq);
    } catch (error) {
      this.loadingWorkspace.set(false);
      throw error;
    }
  }

  private async ensureUserProfile(
    uid: string,
    displayName: string | null,
    email: string | null,
  ): Promise<void> {
    const db = this.fb.db;
    const publicRef = doc(db, 'users', uid);
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    const safeName = this.clip(displayName || 'Supervisor Industrial', 120);
    const safeEmail = this.clip(email || 'usuario@planta.local', 200);

    try {
      const snap = await getDoc(publicRef);
      if (!snap.exists()) {
        await setDoc(publicRef, {
          uid,
          displayName: safeName,
          role: 'supervisor',
          area: 'Línea de Ensamble A1',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(publicRef, {
          displayName: safeName,
          updatedAt: serverTimestamp(),
        });
      }

      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid,
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privateRef, {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      this.fb.handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }

  private attachBitacoraChildren(uid: string, bitacoraId: string): void {
    const db = this.fb.db;

    const evQ = query(
      collection(db, `bitacoras/${bitacoraId}/eventos`),
      where('ownerId', '==', uid),
    );
    const unsubEv = onSnapshot(
      evQ,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({id: d.id, ...(d.data() as Omit<Evento, 'id'>)}))
          .sort((a, b) => a.hora.localeCompare(b.hora));
        this.eventos.set(rows);
      },
      (err) =>
        this.fb.handleFirestoreError(
          err,
          OperationType.LIST,
          `bitacoras/${bitacoraId}/eventos`,
        ),
    );

    const incQ = query(
      collection(db, `bitacoras/${bitacoraId}/incidencias`),
      where('ownerId', '==', uid),
    );
    const unsubInc = onSnapshot(
      incQ,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({id: d.id, ...(d.data() as Omit<Incidencia, 'id'>)}))
          .sort((a, b) => a.hora.localeCompare(b.hora));
        this.incidencias.set(rows);
      },
      (err) =>
        this.fb.handleFirestoreError(
          err,
          OperationType.LIST,
          `bitacoras/${bitacoraId}/incidencias`,
        ),
    );

    const prodQ = query(
      collection(db, `bitacoras/${bitacoraId}/produccion`),
      where('ownerId', '==', uid),
    );
    const unsubProd = onSnapshot(
      prodQ,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProduccionItem, 'id'>),
          }))
          .sort((a, b) => a.producto.localeCompare(b.producto));
        this.produccion.set(rows);
      },
      (err) =>
        this.fb.handleFirestoreError(
          err,
          OperationType.LIST,
          `bitacoras/${bitacoraId}/produccion`,
        ),
    );

    const maqQ = query(
      collection(db, `bitacoras/${bitacoraId}/maquinas`),
      where('ownerId', '==', uid),
    );
    const unsubMaq = onSnapshot(
      maqQ,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MaquinaEstado, 'id'>),
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.maquinas.set(rows);
      },
      (err) =>
        this.fb.handleFirestoreError(
          err,
          OperationType.LIST,
          `bitacoras/${bitacoraId}/maquinas`,
        ),
    );

    const firmQ = query(
      collection(db, `bitacoras/${bitacoraId}/firmas`),
      where('ownerId', '==', uid),
    );
    const unsubFirm = onSnapshot(
      firmQ,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Firma, 'id'>),
        }));
        this.firmas.set(rows);
      },
      (err) =>
        this.fb.handleFirestoreError(
          err,
          OperationType.LIST,
          `bitacoras/${bitacoraId}/firmas`,
        ),
    );

    this.childUnsubs.push(unsubEv, unsubInc, unsubProd, unsubMaq, unsubFirm);
  }

  private async seedInitialWorkspace(
    uid: string,
    userName: string,
  ): Promise<void> {
    const db = this.fb.db;
    const today = this.todayIso();
    const yesterday = this.offsetDateIso(-1);
    const twoDaysAgo = this.offsetDateIso(-2);

    try {
      const batch1 = writeBatch(db);

      // Supervisores
      const sups = [
        {
          id: this.genId('sup'),
          nombre: userName || 'Ing. Carlos Mendoza',
          area: 'Línea 01 - Estampado y Ensamble',
          turnoDefault: TURNO_MATUTINO,
        },
        {
          id: this.genId('sup'),
          nombre: 'Ing. Laura Villalobos',
          area: 'Línea 01 - Estampado y Ensamble',
          turnoDefault: TURNO_VESPERTINO,
        },
        {
          id: this.genId('sup'),
          nombre: 'Téc. Roberto Sánchez',
          area: 'Línea 02 - Mecanizado CNC',
          turnoDefault: TURNO_MATUTINO,
        },
        {
          id: this.genId('sup'),
          nombre: 'Ing. Sofía Ramírez',
          area: 'Línea 03 - Empaque Automático',
          turnoDefault: TURNO_NOCTURNO,
        },
      ];
      for (const s of sups) {
        batch1.set(doc(db, 'supervisores', s.id), {
          ownerId: uid,
          nombre: this.clip(s.nombre, 120),
          area: s.area,
          turnoDefault: s.turnoDefault,
          activo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Turnos
      const turnosSeed = [
        {
          id: this.genId('trn'),
          codigo: 'T1-MAT',
          nombre: 'Matutino',
          horario: '06:00 - 14:00',
        },
        {
          id: this.genId('trn'),
          codigo: 'T2-VES',
          nombre: 'Vespertino',
          horario: '14:00 - 22:00',
        },
        {
          id: this.genId('trn'),
          codigo: 'T3-NOC',
          nombre: 'Nocturno',
          horario: '22:00 - 06:00',
        },
      ];
      for (const t of turnosSeed) {
        batch1.set(doc(db, 'turnos', t.id), {
          ownerId: uid,
          codigo: t.codigo,
          nombre: t.nombre,
          horario: t.horario,
          activo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Maquinas catalogo
      const maqCatalogo = [
        {
          id: this.genId('maqcat'),
          codigo: 'PRENSA-01',
          area: 'Estampado Principal',
          estadoDefault: 'Operando' as MaquinaEstadoTipo,
        },
        {
          id: this.genId('maqcat'),
          codigo: 'TORNO-02',
          area: 'Mecanizado CNC',
          estadoDefault: 'Operando' as MaquinaEstadoTipo,
        },
        {
          id: this.genId('maqcat'),
          codigo: 'ENVASADORA-03',
          area: 'Empaque Final',
          estadoDefault: 'Operando' as MaquinaEstadoTipo,
        },
      ];
      for (const m of maqCatalogo) {
        batch1.set(doc(db, 'maquinas', m.id), {
          ownerId: uid,
          codigo: m.codigo,
          area: m.area,
          estadoDefault: m.estadoDefault,
          activo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Active Shift Log (Today)
      const activeId = this.genId('bit');
      batch1.set(doc(db, 'bitacoras', activeId), {
        ownerId: uid,
        folio: `BIT-${today.replace(/-/g, '')}-01`,
        areaLinea: 'Línea 01 - Estampado y Ensamble',
        fecha: today,
        turnoSaliente: TURNO_MATUTINO,
        turnoEntrante: TURNO_VESPERTINO,
        supervisorSaliente: sups[0].nombre,
        supervisorEntrante: sups[1].nombre,
        notas:
          'Se entrega línea estable tras ajuste de presión en PRENSA-01. Verificar nivel de lubricante en TORNO-02 a las 16:00 hrs y confirmar llegada de lote de empaque P-9 en almacén.',
        estado: 'borrador',
        equiposLimpios: true,
        herramientasCompletas: true,
        materialAbastecido: true,
        sinRiesgosSeguridad: false,
        totalProduccion: 1365,
        cumplimientoPromedio: 94.1,
        totalIncidencias: 3,
        incidenciasPendientes: 2,
        maquinasDetenidas: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Historical Shift Log 1 (Yesterday Vespertino)
      const hist1Id = this.genId('bit');
      batch1.set(doc(db, 'bitacoras', hist1Id), {
        ownerId: uid,
        folio: `BIT-${yesterday.replace(/-/g, '')}-02`,
        areaLinea: 'Línea 01 - Estampado y Ensamble',
        fecha: yesterday,
        turnoSaliente: TURNO_VESPERTINO,
        turnoEntrante: TURNO_NOCTURNO,
        supervisorSaliente: 'Ing. Laura Villalobos',
        supervisorEntrante: 'Ing. Sofía Ramírez',
        notas:
          'Turno vespertino cerró por encima de meta en Carcasa Metálica A-12. Se programó cambio de boquilla en ENVASADORA-03.',
        estado: 'guardada',
        equiposLimpios: true,
        herramientasCompletas: true,
        materialAbastecido: true,
        sinRiesgosSeguridad: true,
        totalProduccion: 1410,
        cumplimientoPromedio: 97.2,
        totalIncidencias: 2,
        incidenciasPendientes: 0,
        maquinasDetenidas: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Historical Shift Log 2 (2 days ago Matutino)
      const hist2Id = this.genId('bit');
      batch1.set(doc(db, 'bitacoras', hist2Id), {
        ownerId: uid,
        folio: `BIT-${twoDaysAgo.replace(/-/g, '')}-01`,
        areaLinea: 'Línea 02 - Mecanizado CNC',
        fecha: twoDaysAgo,
        turnoSaliente: TURNO_MATUTINO,
        turnoEntrante: TURNO_VESPERTINO,
        supervisorSaliente: 'Téc. Roberto Sánchez',
        supervisorEntrante: 'Ing. Laura Villalobos',
        notas:
          'Paro preventivo de 35 minutos en TORNO-02 para calibración de husillo. Calidad liberó primer lote sin desviaciones.',
        estado: 'guardada',
        equiposLimpios: true,
        herramientasCompletas: true,
        materialAbastecido: false,
        sinRiesgosSeguridad: true,
        totalProduccion: 1180,
        cumplimientoPromedio: 88.4,
        totalIncidencias: 3,
        incidenciasPendientes: 1,
        maquinasDetenidas: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch1.commit();

      // Subcollections for activeId + historical logs
      const batch2 = writeBatch(db);

      // Active production (3 example products)
      const prodSeed = [
        {producto: 'Carcasa Metálica A-12', meta: 500, producido: 485},
        {producto: 'Eje de Precisión M-4', meta: 450, producido: 430},
        {producto: 'Empaque Termosellado P-9', meta: 500, producido: 450},
      ];
      for (const p of prodSeed) {
        const pid = this.genId('prod');
        batch2.set(doc(db, `bitacoras/${activeId}/produccion`, pid), {
          ownerId: uid,
          bitacoraId: activeId,
          producto: p.producto,
          meta: p.meta,
          producido: p.producido,
          cumplimiento: Math.round((p.producido / p.meta) * 1000) / 10,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Active incidents
      const incSeed: {
        hora: string;
        descripcion: string;
        maquina: string;
        estado: IncidenciaEstado;
      }[] = [
        {
          hora: '07:45',
          descripcion: 'Variación leve de presión hidráulica en carrera de retorno',
          maquina: 'PRENSA-01',
          estado: 'Resuelto',
        },
        {
          hora: '10:20',
          descripcion: 'Temperatura de husillo cercana al umbral superior (58°C)',
          maquina: 'TORNO-02',
          estado: 'En proceso',
        },
        {
          hora: '12:50',
          descripcion: 'Sensor óptico de conteo requiere limpieza con aire seco',
          maquina: 'ENVASADORA-03',
          estado: 'Pendiente',
        },
      ];
      for (const inc of incSeed) {
        const iid = this.genId('inc');
        batch2.set(doc(db, `bitacoras/${activeId}/incidencias`, iid), {
          ownerId: uid,
          bitacoraId: activeId,
          hora: inc.hora,
          descripcion: inc.descripcion,
          maquina: inc.maquina,
          estado: inc.estado,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Active machine states
      const maqSeed: {nombre: string; estado: MaquinaEstadoTipo}[] = [
        {nombre: 'PRENSA-01', estado: 'Operando'},
        {nombre: 'TORNO-02', estado: 'Operando'},
        {nombre: 'ENVASADORA-03', estado: 'Mantenimiento'},
      ];
      for (const m of maqSeed) {
        const mid = this.genId('maq');
        batch2.set(doc(db, `bitacoras/${activeId}/maquinas`, mid), {
          ownerId: uid,
          bitacoraId: activeId,
          nombre: m.nombre,
          estado: m.estado,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Active timeline events
      const evSeed: {
        hora: string;
        categoria: EventoCategoria;
        titulo: string;
        descripcion: string;
        responsable: string;
        estado: EventoEstado;
      }[] = [
        {
          hora: '06:15',
          categoria: 'PRODUCCIÓN',
          titulo: 'Arranque de línea y validación de primera pieza',
          descripcion:
            'Inspección dimensional aprobada por Calidad para lote A-12 sin rebabas.',
          responsable: sups[0].nombre,
          estado: 'Cerrado',
        },
        {
          hora: '07:45',
          categoria: 'AJUSTE',
          titulo: 'Calibración de válvula reguladora en PRENSA-01',
          descripcion:
            'Se estabilizó presión de trabajo a 145 bar tras leve oscilación al arranque.',
          responsable: 'Téc. Roberto Sánchez',
          estado: 'Cerrado',
        },
        {
          hora: '10:20',
          categoria: 'ANOMALÍA',
          titulo: 'Alerta térmica preventiva en TORNO-02',
          descripcion:
            'Se incrementó flujo de refrigerante; monitorear estabilidad durante el próximo turno.',
          responsable: 'Téc. Roberto Sánchez',
          estado: 'En seguimiento',
        },
        {
          hora: '12:50',
          categoria: 'MANTENIMIENTO',
          titulo: 'Inspección de sensor óptico en ENVASADORA-03',
          descripcion:
            'Equipo colocado en revisión preventiva antes de cambio de turno vespertino.',
          responsable: 'Ing. Sofía Ramírez',
          estado: 'Abierto',
        },
      ];
      for (const ev of evSeed) {
        const eid = this.genId('evt');
        batch2.set(doc(db, `bitacoras/${activeId}/eventos`, eid), {
          ownerId: uid,
          bitacoraId: activeId,
          hora: ev.hora,
          fecha: today,
          categoria: ev.categoria,
          titulo: ev.titulo,
          descripcion: ev.descripcion,
          responsable: ev.responsable,
          estado: ev.estado,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Seed basic subcollections for historical logs so PDF & modal inspection have rich data
      const histConfigs = [
        {
          id: hist1Id,
          fecha: yesterday,
          prod: [
            {producto: 'Carcasa Metálica A-12', meta: 500, producido: 495},
            {producto: 'Eje de Precisión M-4', meta: 450, producido: 445},
            {producto: 'Empaque Termosellado P-9', meta: 500, producido: 470},
          ],
          maq: [
            {nombre: 'PRENSA-01', estado: 'Operando' as MaquinaEstadoTipo},
            {nombre: 'TORNO-02', estado: 'Operando' as MaquinaEstadoTipo},
            {nombre: 'ENVASADORA-03', estado: 'Operando' as MaquinaEstadoTipo},
          ],
          inc: [
            {
              hora: '16:10',
              descripcion: 'Cambio de rollo de película termoencogible',
              maquina: 'ENVASADORA-03',
              estado: 'Resuelto' as IncidenciaEstado,
            },
            {
              hora: '19:35',
              descripcion: 'Reajuste de tope mecánico de alimentación',
              maquina: 'PRENSA-01',
              estado: 'Resuelto' as IncidenciaEstado,
            },
          ],
        },
        {
          id: hist2Id,
          fecha: twoDaysAgo,
          prod: [
            {producto: 'Carcasa Metálica A-12', meta: 450, producido: 410},
            {producto: 'Eje de Precisión M-4', meta: 435, producido: 380},
            {producto: 'Empaque Termosellado P-9', meta: 450, producido: 390},
          ],
          maq: [
            {nombre: 'PRENSA-01', estado: 'Operando' as MaquinaEstadoTipo},
            {nombre: 'TORNO-02', estado: 'Detenida' as MaquinaEstadoTipo},
            {nombre: 'ENVASADORA-03', estado: 'Operando' as MaquinaEstadoTipo},
          ],
          inc: [
            {
              hora: '08:15',
              descripcion: 'Vibración en eje principal durante desbaste',
              maquina: 'TORNO-02',
              estado: 'Pendiente' as IncidenciaEstado,
            },
            {
              hora: '11:00',
              descripcion: 'Atasco menor en banda de salida',
              maquina: 'ENVASADORA-03',
              estado: 'Resuelto' as IncidenciaEstado,
            },
            {
              hora: '13:10',
              descripcion: 'Reposición de lubricante en guía lineal',
              maquina: 'PRENSA-01',
              estado: 'Resuelto' as IncidenciaEstado,
            },
          ],
        },
      ];

      for (const h of histConfigs) {
        for (const p of h.prod) {
          batch2.set(doc(db, `bitacoras/${h.id}/produccion`, this.genId('prod')), {
            ownerId: uid,
            bitacoraId: h.id,
            producto: p.producto,
            meta: p.meta,
            producido: p.producido,
            cumplimiento: Math.round((p.producido / p.meta) * 1000) / 10,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const m of h.maq) {
          batch2.set(doc(db, `bitacoras/${h.id}/maquinas`, this.genId('maq')), {
            ownerId: uid,
            bitacoraId: h.id,
            nombre: m.nombre,
            estado: m.estado,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const inc of h.inc) {
          batch2.set(doc(db, `bitacoras/${h.id}/incidencias`, this.genId('inc')), {
            ownerId: uid,
            bitacoraId: h.id,
            hora: inc.hora,
            descripcion: inc.descripcion,
            maquina: inc.maquina,
            estado: inc.estado,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch2.commit();
      this.activeBitacoraId.set(activeId);
    } catch (error) {
      this.fb.handleFirestoreError(error, OperationType.WRITE, 'bitacoras');
    }
  }

  // --- Shift Log Actions ---

  async createNewBitacora(presetTurno?: string): Promise<string | null> {
    const user = this.fb.user();
    if (!user) {
      return null;
    }
    const db = this.fb.db;
    const today = this.todayIso();
    const id = this.genId('bit');
    const count = this.bitacoras().length + 1;
    const turnoSaliente = presetTurno || this.activeShiftHeader() || TURNO_MATUTINO;
    const turnoEntrante =
      turnoSaliente === TURNO_MATUTINO
        ? TURNO_VESPERTINO
        : turnoSaliente === TURNO_VESPERTINO
          ? TURNO_NOCTURNO
          : TURNO_MATUTINO;

    const sups = this.supervisores();
    const sup1 = sups[0]?.nombre || user.displayName || 'Supervisor Saliente';
    const sup2 = sups[1]?.nombre || 'Supervisor Entrante';

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'bitacoras', id), {
        ownerId: user.uid,
        folio: `BIT-${today.replace(/-/g, '')}-${String(count).padStart(2, '0')}`,
        areaLinea: 'Línea 01 - Estampado y Ensamble',
        fecha: today,
        turnoSaliente,
        turnoEntrante,
        supervisorSaliente: this.clip(sup1, FIELD_LIMITS.supervisorNombre),
        supervisorEntrante: this.clip(sup2, FIELD_LIMITS.supervisorNombre),
        notas: '',
        estado: 'borrador',
        equiposLimpios: false,
        herramientasCompletas: false,
        materialAbastecido: false,
        sinRiesgosSeguridad: false,
        totalProduccion: 0,
        cumplimientoPromedio: 0,
        totalIncidencias: 0,
        incidenciasPendientes: 0,
        maquinasDetenidas: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Default 3 products
      const defaultProds = [
        {producto: 'Carcasa Metálica A-12', meta: 500, producido: 0},
        {producto: 'Eje de Precisión M-4', meta: 450, producido: 0},
        {producto: 'Empaque Termosellado P-9', meta: 500, producido: 0},
      ];
      for (const p of defaultProds) {
        batch.set(doc(db, `bitacoras/${id}/produccion`, this.genId('prod')), {
          ownerId: user.uid,
          bitacoraId: id,
          producto: p.producto,
          meta: p.meta,
          producido: p.producido,
          cumplimiento: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Default machines from catalog or standard 3
      const catMaq = this.maquinasCatalogo();
      const maqList =
        catMaq.length > 0
          ? catMaq.filter((m) => m.activo).map((m) => ({
              nombre: m.codigo,
              estado: m.estadoDefault,
            }))
          : [
              {nombre: 'PRENSA-01', estado: 'Operando' as MaquinaEstadoTipo},
              {nombre: 'TORNO-02', estado: 'Operando' as MaquinaEstadoTipo},
              {nombre: 'ENVASADORA-03', estado: 'Operando' as MaquinaEstadoTipo},
            ];

      for (const m of maqList) {
        batch.set(doc(db, `bitacoras/${id}/maquinas`, this.genId('maq')), {
          ownerId: user.uid,
          bitacoraId: id,
          nombre: this.clip(m.nombre, FIELD_LIMITS.maquinaNombre),
          estado: m.estado,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      this.activeBitacoraId.set(id);
      this.activeNav.set('dashboard');
      this.showToast('Nueva bitácora creada y lista para captura.', 'success');
      return id;
    } catch (error) {
      return this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `bitacoras/${id}`,
      );
    }
  }

  async saveBitacora(
    payload: {
      areaLinea: string;
      fecha: string;
      turnoSaliente: string;
      turnoEntrante: string;
      supervisorSaliente: string;
      supervisorEntrante: string;
      notas: string;
      equiposLimpios: boolean;
      herramientasCompletas: boolean;
      materialAbastecido: boolean;
      sinRiesgosSeguridad: boolean;
      estado?: BitacoraEstado;
    },
    silent = false,
  ): Promise<void> {
    const user = this.fb.user();
    const bitacora = this.activeBitacora();
    if (!user || !bitacora) {
      return;
    }

    this.savingBitacora.set(true);
    try {
      const ref = doc(this.fb.db, 'bitacoras', bitacora.id);
      await updateDoc(ref, {
        areaLinea: this.clip(payload.areaLinea, FIELD_LIMITS.areaLinea),
        fecha: this.clip(payload.fecha, 10),
        turnoSaliente: this.clip(payload.turnoSaliente, FIELD_LIMITS.turnoLabel),
        turnoEntrante: this.clip(payload.turnoEntrante, FIELD_LIMITS.turnoLabel),
        supervisorSaliente: this.clip(
          payload.supervisorSaliente,
          FIELD_LIMITS.supervisorNombre,
        ),
        supervisorEntrante: this.clip(
          payload.supervisorEntrante,
          FIELD_LIMITS.supervisorNombre,
        ),
        notas: this.clip(payload.notas, FIELD_LIMITS.notas),
        estado: payload.estado ?? bitacora.estado,
        equiposLimpios: Boolean(payload.equiposLimpios),
        herramientasCompletas: Boolean(payload.herramientasCompletas),
        materialAbastecido: Boolean(payload.materialAbastecido),
        sinRiesgosSeguridad: Boolean(payload.sinRiesgosSeguridad),
        totalProduccion: this.totalProduccion(),
        cumplimientoPromedio: this.cumplimientoPromedio(),
        totalIncidencias: this.totalIncidencias(),
        incidenciasPendientes: this.incidenciasPendientes(),
        maquinasDetenidas: this.maquinasDetenidas(),
        updatedAt: serverTimestamp(),
      });
      if (!silent) {
        const nowTime = new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        });
        this.showToast(
          `Bitácora ${bitacora.folio} guardada correctamente (${nowTime}).`,
          'success',
        );
      }
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacora.id}`,
      );
    } finally {
      this.savingBitacora.set(false);
    }
  }

  private async syncParentSummary(): Promise<void> {
    const bitacora = this.activeBitacora();
    if (!bitacora) {
      return;
    }
    try {
      await updateDoc(doc(this.fb.db, 'bitacoras', bitacora.id), {
        totalProduccion: this.totalProduccion(),
        cumplimientoPromedio: this.cumplimientoPromedio(),
        totalIncidencias: this.totalIncidencias(),
        incidenciasPendientes: this.incidenciasPendientes(),
        maquinasDetenidas: this.maquinasDetenidas(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacora.id}`,
      );
    }
  }

  async deleteBitacora(bitacoraId: string): Promise<void> {
    const user = this.fb.user();
    if (!user) {
      return;
    }
    const db = this.fb.db;
    try {
      const subNames = [
        'eventos',
        'incidencias',
        'produccion',
        'maquinas',
        'firmas',
      ];
      const batch = writeBatch(db);
      for (const sub of subNames) {
        const snap = await getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/${sub}`),
            where('ownerId', '==', user.uid),
          ),
        );
        for (const d of snap.docs) {
          batch.delete(d.ref);
        }
      }
      batch.delete(doc(db, 'bitacoras', bitacoraId));
      await batch.commit();

      if (this.activeBitacoraId() === bitacoraId) {
        const remaining = this.bitacoras().filter((b) => b.id !== bitacoraId);
        this.activeBitacoraId.set(remaining[0]?.id ?? null);
      }
      this.showToast('Bitácora eliminada.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `bitacoras/${bitacoraId}`,
      );
    }
  }

  // --- Producción CRUD ---

  async addProduccionRow(
    producto: string,
    meta: number,
    producido: number,
  ): Promise<void> {
    const user = this.fb.user();
    const bitacoraId = this.activeBitacoraId();
    if (!user || !bitacoraId) {
      return;
    }
    const id = this.genId('prod');
    const safeMeta = Math.max(0, Number(meta) || 0);
    const safeProd = Math.max(0, Number(producido) || 0);
    const cumplimiento =
      safeMeta > 0 ? Math.round((safeProd / safeMeta) * 1000) / 10 : 0;
    try {
      await setDoc(doc(this.fb.db, `bitacoras/${bitacoraId}/produccion`, id), {
        ownerId: user.uid,
        bitacoraId,
        producto: this.clip(producto, FIELD_LIMITS.producto),
        meta: safeMeta,
        producido: safeProd,
        cumplimiento,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await this.syncParentSummary();
      this.showToast('Producto agregado a producción.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `bitacoras/${bitacoraId}/produccion/${id}`,
      );
    }
  }

  async updateProduccionRow(
    id: string,
    producto: string,
    meta: number,
    producido: number,
  ): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    const safeMeta = Math.max(0, Number(meta) || 0);
    const safeProd = Math.max(0, Number(producido) || 0);
    const cumplimiento =
      safeMeta > 0 ? Math.round((safeProd / safeMeta) * 1000) / 10 : 0;
    try {
      await updateDoc(
        doc(this.fb.db, `bitacoras/${bitacoraId}/produccion`, id),
        {
          producto: this.clip(producto, FIELD_LIMITS.producto),
          meta: safeMeta,
          producido: safeProd,
          cumplimiento,
          updatedAt: serverTimestamp(),
        },
      );
      await this.syncParentSummary();
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacoraId}/produccion/${id}`,
      );
    }
  }

  async deleteProduccionRow(id: string): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    try {
      await deleteDoc(
        doc(this.fb.db, `bitacoras/${bitacoraId}/produccion`, id),
      );
      await this.syncParentSummary();
      this.showToast('Registro de producción eliminado.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `bitacoras/${bitacoraId}/produccion/${id}`,
      );
    }
  }

  // --- Incidencias CRUD ---

  async addIncidencia(
    hora: string,
    descripcion: string,
    maquina: string,
    estado: IncidenciaEstado,
  ): Promise<void> {
    const user = this.fb.user();
    const bitacoraId = this.activeBitacoraId();
    if (!user || !bitacoraId) {
      return;
    }
    const id = this.genId('inc');
    try {
      await setDoc(doc(this.fb.db, `bitacoras/${bitacoraId}/incidencias`, id), {
        ownerId: user.uid,
        bitacoraId,
        hora: this.clip(hora, 10),
        descripcion: this.clip(descripcion, FIELD_LIMITS.incidenciaDescripcion),
        maquina: this.clip(maquina, FIELD_LIMITS.maquinaNombre),
        estado,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await this.syncParentSummary();
      this.showToast('Incidencia registrada.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `bitacoras/${bitacoraId}/incidencias/${id}`,
      );
    }
  }

  async updateIncidencia(
    id: string,
    data: Partial<Pick<Incidencia, 'hora' | 'descripcion' | 'maquina' | 'estado'>>,
  ): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (data.hora !== undefined) updatePayload['hora'] = this.clip(data.hora, 10);
    if (data.descripcion !== undefined) {
      updatePayload['descripcion'] = this.clip(
        data.descripcion,
        FIELD_LIMITS.incidenciaDescripcion,
      );
    }
    if (data.maquina !== undefined) {
      updatePayload['maquina'] = this.clip(
        data.maquina,
        FIELD_LIMITS.maquinaNombre,
      );
    }
    if (data.estado !== undefined) updatePayload['estado'] = data.estado;

    try {
      await updateDoc(
        doc(this.fb.db, `bitacoras/${bitacoraId}/incidencias`, id),
        updatePayload,
      );
      await this.syncParentSummary();
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacoraId}/incidencias/${id}`,
      );
    }
  }

  async deleteIncidencia(id: string): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    try {
      await deleteDoc(
        doc(this.fb.db, `bitacoras/${bitacoraId}/incidencias`, id),
      );
      await this.syncParentSummary();
      this.showToast('Incidencia eliminada.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `bitacoras/${bitacoraId}/incidencias/${id}`,
      );
    }
  }

  // --- Máquinas Estado ---

  async updateMaquinaEstado(
    id: string,
    estado: MaquinaEstadoTipo,
  ): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    try {
      await updateDoc(doc(this.fb.db, `bitacoras/${bitacoraId}/maquinas`, id), {
        estado,
        updatedAt: serverTimestamp(),
      });
      await this.syncParentSummary();
      this.showToast('Estado de máquina actualizado.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacoraId}/maquinas/${id}`,
      );
    }
  }

  // --- Eventos Línea de Tiempo ---

  async addEvento(data: {
    hora: string;
    fecha: string;
    categoria: EventoCategoria;
    titulo: string;
    descripcion: string;
    responsable: string;
    estado: EventoEstado;
  }): Promise<void> {
    const user = this.fb.user();
    const bitacoraId = this.activeBitacoraId();
    if (!user || !bitacoraId) {
      return;
    }
    const id = this.genId('evt');
    try {
      await setDoc(doc(this.fb.db, `bitacoras/${bitacoraId}/eventos`, id), {
        ownerId: user.uid,
        bitacoraId,
        hora: this.clip(data.hora, 10),
        fecha: this.clip(data.fecha, 10),
        categoria: data.categoria,
        titulo: this.clip(data.titulo, FIELD_LIMITS.eventoTitulo),
        descripcion: this.clip(data.descripcion, FIELD_LIMITS.eventoDescripcion),
        responsable: this.clip(
          data.responsable,
          FIELD_LIMITS.supervisorNombre,
        ),
        estado: data.estado,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      this.showToast('Evento agregado a la línea de tiempo.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `bitacoras/${bitacoraId}/eventos/${id}`,
      );
    }
  }

  async updateEvento(
    id: string,
    data: Partial<
      Pick<
        Evento,
        | 'hora'
        | 'fecha'
        | 'categoria'
        | 'titulo'
        | 'descripcion'
        | 'responsable'
        | 'estado'
      >
    >,
  ): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    const payload: Record<string, unknown> = {updatedAt: serverTimestamp()};
    if (data.hora !== undefined) payload['hora'] = this.clip(data.hora, 10);
    if (data.fecha !== undefined) payload['fecha'] = this.clip(data.fecha, 10);
    if (data.categoria !== undefined) payload['categoria'] = data.categoria;
    if (data.titulo !== undefined) {
      payload['titulo'] = this.clip(data.titulo, FIELD_LIMITS.eventoTitulo);
    }
    if (data.descripcion !== undefined) {
      payload['descripcion'] = this.clip(
        data.descripcion,
        FIELD_LIMITS.eventoDescripcion,
      );
    }
    if (data.responsable !== undefined) {
      payload['responsable'] = this.clip(
        data.responsable,
        FIELD_LIMITS.supervisorNombre,
      );
    }
    if (data.estado !== undefined) payload['estado'] = data.estado;

    try {
      await updateDoc(
        doc(this.fb.db, `bitacoras/${bitacoraId}/eventos`, id),
        payload,
      );
      this.showToast('Evento actualizado.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `bitacoras/${bitacoraId}/eventos/${id}`,
      );
    }
  }

  async deleteEvento(id: string): Promise<void> {
    const bitacoraId = this.activeBitacoraId();
    if (!bitacoraId) {
      return;
    }
    try {
      await deleteDoc(doc(this.fb.db, `bitacoras/${bitacoraId}/eventos`, id));
      this.showToast('Evento eliminado.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `bitacoras/${bitacoraId}/eventos/${id}`,
      );
    }
  }

  // --- Firmas ---

  async saveFirma(
    tipo: FirmaTipo,
    supervisor: string,
    dataUrl: string,
  ): Promise<void> {
    const user = this.fb.user();
    const bitacoraId = this.activeBitacoraId();
    if (!user || !bitacoraId) {
      return;
    }
    const docId = `firma_${tipo}`;
    const safeUrl = dataUrl.slice(0, FIELD_LIMITS.firmaDataUrl);
    const ref = doc(this.fb.db, `bitacoras/${bitacoraId}/firmas`, docId);
    const existing = this.firmas().find((f) => f.id === docId);

    try {
      if (existing) {
        await updateDoc(ref, {
          supervisor: this.clip(supervisor, FIELD_LIMITS.supervisorNombre),
          dataUrl: safeUrl,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ownerId: user.uid,
          bitacoraId,
          tipo,
          supervisor: this.clip(supervisor, FIELD_LIMITS.supervisorNombre),
          dataUrl: safeUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.WRITE,
        `bitacoras/${bitacoraId}/firmas/${docId}`,
      );
    }
  }

  // --- Historial & Reportes Full Loader ---

  async loadFullBitacora(bitacoraId: string): Promise<FullBitacoraSnapshot | null> {
    const user = this.fb.user();
    if (!user) {
      return null;
    }
    const bitacora = this.bitacoras().find((b) => b.id === bitacoraId);
    if (!bitacora) {
      return null;
    }

    const db = this.fb.db;
    try {
      const [evSnap, incSnap, prodSnap, maqSnap, firmSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/eventos`),
            where('ownerId', '==', user.uid),
          ),
        ),
        getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/incidencias`),
            where('ownerId', '==', user.uid),
          ),
        ),
        getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/produccion`),
            where('ownerId', '==', user.uid),
          ),
        ),
        getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/maquinas`),
            where('ownerId', '==', user.uid),
          ),
        ),
        getDocs(
          query(
            collection(db, `bitacoras/${bitacoraId}/firmas`),
            where('ownerId', '==', user.uid),
          ),
        ),
      ]);

      return {
        bitacora,
        eventos: evSnap.docs
          .map((d) => ({id: d.id, ...(d.data() as Omit<Evento, 'id'>)}))
          .sort((a, b) => a.hora.localeCompare(b.hora)),
        incidencias: incSnap.docs
          .map((d) => ({id: d.id, ...(d.data() as Omit<Incidencia, 'id'>)}))
          .sort((a, b) => a.hora.localeCompare(b.hora)),
        produccion: prodSnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProduccionItem, 'id'>),
          }))
          .sort((a, b) => a.producto.localeCompare(b.producto)),
        maquinas: maqSnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MaquinaEstado, 'id'>),
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        firmas: firmSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Firma, 'id'>),
        })),
      };
    } catch (error) {
      return this.fb.handleFirestoreError(
        error,
        OperationType.GET,
        `bitacoras/${bitacoraId}`,
      );
    }
  }

  // --- Configuración Catalog CRUD ---

  async addSupervisor(
    nombre: string,
    area: string,
    turnoDefault: string,
  ): Promise<void> {
    const user = this.fb.user();
    if (!user) {
      return;
    }
    const id = this.genId('sup');
    try {
      await setDoc(doc(this.fb.db, 'supervisores', id), {
        ownerId: user.uid,
        nombre: this.clip(nombre, 120),
        area: this.clip(area, 120),
        turnoDefault: this.clip(turnoDefault, 80),
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      this.showToast('Supervisor agregado.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `supervisores/${id}`,
      );
    }
  }

  async toggleSupervisor(sup: Supervisor): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'supervisores', sup.id), {
        activo: !sup.activo,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.UPDATE,
        `supervisores/${sup.id}`,
      );
    }
  }

  async deleteSupervisor(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fb.db, 'supervisores', id));
      this.showToast('Supervisor eliminado.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `supervisores/${id}`,
      );
    }
  }

  async addTurno(
    codigo: string,
    nombre: string,
    horario: string,
  ): Promise<void> {
    const user = this.fb.user();
    if (!user) {
      return;
    }
    const id = this.genId('trn');
    try {
      await setDoc(doc(this.fb.db, 'turnos', id), {
        ownerId: user.uid,
        codigo: this.clip(codigo, 40),
        nombre: this.clip(nombre, 80),
        horario: this.clip(horario, 60),
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      this.showToast('Turno agregado.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(error, OperationType.CREATE, `turnos/${id}`);
    }
  }

  async deleteTurno(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fb.db, 'turnos', id));
      this.showToast('Turno eliminado.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(error, OperationType.DELETE, `turnos/${id}`);
    }
  }

  async addMaquinaCatalogo(
    codigo: string,
    area: string,
    estadoDefault: MaquinaEstadoTipo,
  ): Promise<void> {
    const user = this.fb.user();
    if (!user) {
      return;
    }
    const id = this.genId('maqcat');
    try {
      await setDoc(doc(this.fb.db, 'maquinas', id), {
        ownerId: user.uid,
        codigo: this.clip(codigo, 60),
        area: this.clip(area, 120),
        estadoDefault,
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      this.showToast('Máquina registrada en catálogo.', 'success');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.CREATE,
        `maquinas/${id}`,
      );
    }
  }

  async deleteMaquinaCatalogo(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.fb.db, 'maquinas', id));
      this.showToast('Máquina eliminada del catálogo.', 'info');
    } catch (error) {
      this.fb.handleFirestoreError(
        error,
        OperationType.DELETE,
        `maquinas/${id}`,
      );
    }
  }
}
