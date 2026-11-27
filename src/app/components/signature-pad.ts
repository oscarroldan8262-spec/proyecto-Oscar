import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="bg-white rounded-xl border border-[#DCE8F1] p-4 shadow-sm flex flex-col gap-3"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-[#344054]"
          >
            {{ label() }}
          </p>
          <p class="text-xs text-[#344054]/70 truncate mt-0.5">
            {{ supervisorName() || 'Sin asignar' }}
          </p>
        </div>
        <button
          type="button"
          (click)="clear()"
          [disabled]="disabled()"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#344054] bg-[#F5F7F8] hover:bg-[#DCE8F1]/60 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
        >
          <mat-icon class="!text-[16px] !w-4 !h-4">ink_eraser</mat-icon>
          Limpiar
        </button>
      </div>

      <div
        class="relative h-28 rounded-lg border border-dashed border-[#A9C5B5] bg-[#F5F7F8]/60 overflow-hidden touch-none"
      >
        <canvas
          #canvasEl
          class="w-full h-full block cursor-crosshair"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointerleave)="onPointerUp($event)"
        ></canvas>
        @if (!hasStrokes()) {
          <div
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-3 px-4"
          >
            <div class="w-full border-b border-[#344054]/25 mb-1.5"></div>
            <span class="text-[11px] text-[#344054]/50">
              Dibujar firma digital aquí
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class SignaturePad implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  readonly label = input.required<string>();
  readonly supervisorName = input<string>('');
  readonly initialDataUrl = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly signatureChanged = output<string>();

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl');
  readonly hasStrokes = signal(false);

  private drawing = false;
  private viewReady = false;
  private lastLoadedUrl = '';

  constructor() {
    effect(() => {
      const url = this.initialDataUrl();
      if (this.viewReady && url !== this.lastLoadedUrl) {
        this.loadDataUrl(url);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.viewReady = true;
    this.setupCanvasDimensions();
    const initial = this.initialDataUrl();
    if (initial) {
      this.loadDataUrl(initial);
    }
  }

  private setupCanvasDimensions(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(260, Math.round(rect.width));
    const height = Math.max(100, Math.round(rect.height));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#344054';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }

  private loadDataUrl(url: string): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !isPlatformBrowser(this.platformId)) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.lastLoadedUrl = url;

    if (!url) {
      this.hasStrokes.set(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      this.hasStrokes.set(true);
    };
    img.src = url;
  }

  private getPoint(ev: PointerEvent): {x: number; y: number} {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return {x: 0, y: 0};
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (ev.clientX - rect.left) * scaleX,
      y: (ev.clientY - rect.top) * scaleY,
    };
  }

  onPointerDown(ev: PointerEvent): void {
    if (this.disabled() || !isPlatformBrowser(this.platformId)) {
      return;
    }
    const canvas = this.canvasRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    canvas.setPointerCapture(ev.pointerId);
    const pt = this.getPoint(ev);
    ctx.strokeStyle = '#344054';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    this.drawing = true;
    this.hasStrokes.set(true);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.drawing || this.disabled()) {
      return;
    }
    const ctx = this.canvasRef()?.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }
    const pt = this.getPoint(ev);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  onPointerUp(ev: PointerEvent): void {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    const dataUrl = canvas.toDataURL('image/png');
    this.lastLoadedUrl = dataUrl;
    this.signatureChanged.emit(dataUrl);
  }

  clear(): void {
    if (this.disabled()) {
      return;
    }
    const canvas = this.canvasRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasStrokes.set(false);
    this.lastLoadedUrl = '';
    this.signatureChanged.emit('');
  }
}
