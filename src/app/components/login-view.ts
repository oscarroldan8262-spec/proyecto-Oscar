import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseClient} from '../services/firebase-client';

@Component({
  selector: 'app-login-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="min-h-screen bg-[#F5F7F8] flex items-center justify-center p-6"
    >
      <div
        class="w-full max-w-md bg-white rounded-2xl border border-[#DCE8F1] shadow-sm p-8"
      >
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-12 h-12 rounded-xl bg-[#D5EDE3] border border-[#A9C5B5]/60 flex items-center justify-center text-[#344054]"
          >
            <mat-icon>precision_manufacturing</mat-icon>
          </div>
          <div>
            <h1 class="font-display text-lg font-bold text-[#344054]">
              SISTEMA INDUSTRIAL
            </h1>
            <p class="text-xs text-[#344054]/75">
              Bitácora Digital de Cambio de Turno
            </p>
          </div>
        </div>

        <p class="text-sm text-[#344054]/85 leading-relaxed mb-6">
          Accede con tu cuenta autorizada para registrar entregas de turno,
          producción, incidencias, estado de maquinaria, checklist y firmas
          digitales de supervisión.
        </p>

        @if (fb.authError()) {
          <div
            class="mb-4 p-3 rounded-xl bg-[#F2D5D8]/60 border border-[#F2D5D8] text-xs text-[#344054]"
          >
            {{ fb.authError() }}
          </div>
        }

        <button
          type="button"
          (click)="signIn()"
          [disabled]="fb.isSigningIn()"
          class="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#B7DCC8] hover:bg-[#A9C5B5] text-[#344054] text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <mat-icon class="!text-[20px] !w-5 !h-5">login</mat-icon>
          <span>
            {{
              fb.isSigningIn()
                ? 'Conectando...'
                : 'Iniciar sesión con Google'
            }}
          </span>
        </button>

        <div
          class="mt-6 pt-5 border-t border-[#DCE8F1] grid grid-cols-3 gap-2 text-center text-[11px] text-[#344054]/70"
        >
          <div class="p-2 rounded-lg bg-[#D5EDE3]/50">Producción</div>
          <div class="p-2 rounded-lg bg-[#C7DDF2]/50">Incidencias</div>
          <div class="p-2 rounded-lg bg-[#DED5F0]/50">Historial PDF</div>
        </div>
      </div>
    </div>
  `,
})
export class LoginView {
  readonly fb = inject(FirebaseClient);

  async signIn(): Promise<void> {
    await this.fb.signInWithGoogle();
  }
}
