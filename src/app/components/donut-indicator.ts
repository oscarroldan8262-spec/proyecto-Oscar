import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

@Component({
  selector: 'app-donut-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative inline-flex items-center justify-center shrink-0"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      <svg
        [attr.width]="size()"
        [attr.height]="size()"
        [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
        class="-rotate-90"
        aria-hidden="true"
      >
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="trackColor()"
          [attr.stroke-width]="strokeWidth()"
        />
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="strokeColor()"
          [attr.stroke-width]="strokeWidth()"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashOffset()"
          class="transition-all duration-300 ease-out"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span
          class="font-mono font-semibold tabular-nums leading-none text-[#344054]"
          [class.text-sm]="size() < 80"
          [class.text-base]="size() >= 80"
        >
          {{ clampedPercent() }}%
        </span>
        @if (subLabel()) {
          <span class="text-[10px] text-[#344054]/70 mt-0.5 leading-none">
            {{ subLabel() }}
          </span>
        }
      </div>
    </div>
  `,
})
export class DonutIndicator {
  readonly value = input<number>(0);
  readonly size = input<number>(76);
  readonly strokeWidth = input<number>(8);
  readonly strokeColor = input<string>('#7FB59A');
  readonly trackColor = input<string>('#E7EEF3');
  readonly subLabel = input<string>('');

  readonly clampedPercent = computed(() => {
    const v = Math.round(Number(this.value()) || 0);
    return Math.max(0, Math.min(100, v));
  });

  readonly center = computed(() => this.size() / 2);
  readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashOffset = computed(
    () =>
      this.circumference() * (1 - Math.min(100, this.clampedPercent()) / 100),
  );
}
