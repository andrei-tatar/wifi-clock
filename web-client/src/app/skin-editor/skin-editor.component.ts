import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, from } from 'rxjs';
import { concatMap, finalize, mergeMap, retry, switchMap, takeUntil } from 'rxjs/operators';
import { deflateRaw } from 'pako';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-skin-editor',
  templateUrl: './skin-editor.component.html',
  styleUrls: ['./skin-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkinEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  readonly skins = [
    { label: 'FROM FILES', index: FROM_FILE_INDEX },
    ...SKIN_NAMES.map((label, i) => ({ index: i + 1, label })),
  ];

  readonly canvasWidth = WIDTH * 5;
  readonly canvasHeight = HEIGHT * 2;

  @ViewChild('canvas')
  canvas?: ElementRef<HTMLCanvasElement>;

  get ctx() {
    if (!this.canvas) {
      throw new Error('Could not resolve canvas');
    }
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) {
      throw new Error('Could not resolve context')
    }
    return ctx;
  }

  readonly selectedSkin = new BehaviorSubject<number | null>(null);
  readonly hoverDigit = new BehaviorSubject<number>(-1);
  readonly selectedDigit = new BehaviorSubject<number>(-1);

  constructor(
    private httpClient: HttpClient
  ) {

  }

  ngOnInit() {
    this.selectedSkin.pipe(
      switchMap(index => {
        if (!index) {
          return EMPTY;
        }
        if (index === FROM_FILE_INDEX) {
          return this.loadFromFiles();
        } else {
          return this.loadFromGithub(index);
        }
      }),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  uploadImages() {
    const context = this.ctx;
    const images = this.exportImages(context);
    from(images.entries()).pipe(
      concatMap(([digit, image]) => this.uploadDigit(digit, image)),
    ).subscribe()
  }

  onMouseMove(ev: MouseEvent) {
    let target = ev.target as HTMLElement;
    target = target.closest('.editor-container') as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    const offX = Math.max(0, Math.floor(x / 0.2));
    const offY = Math.max(0, Math.floor(y / 0.5));
    this.hoverDigit.next(offY * 5 + offX);
  }

  onMouseLeave() {
    this.hoverDigit.next(-1);
  }

  selectCurrentDigit() {
    this.selectedDigit.next(this.selectedDigit.value === this.hoverDigit.value
      ? -1
      : this.hoverDigit.value);
  }

  private loadFromGithub(index: number) {
    const context = this.ctx;
    return from(new Array<number>(10).fill(0).map((_, index) => index)).pipe(
      mergeMap(digit => {
        const path = `https://raw.githubusercontent.com/andrei-tatar/wifi-clock/master/skins/${index}/${digit}.png`;
        return this.drawImage(path, digit, context);
      }),
    );
  }

  private loadFromFiles() {
    return new Observable<void>(observer => {
      const input = document.createElement('input');
      input.style.display = 'none';
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      let handled = false;
      const handler = () => {
        if (handled) {
          return;
        }
        handled = true;
        if (!input.files) {
          observer.complete();
          return;
        }

        const files = Array.from(input.files);
        const context = this.ctx;

        from(files.entries()).pipe(
          mergeMap(([index, file]) => {
            const digit = parseInt(file.name) ?? index;
            return this.readFile(file).pipe(
              switchMap(image => this.drawImage(image, digit, context))
            );
          }),
        ).subscribe(observer);
      };
      document.addEventListener('mousemove', handler);
      input.onchange = handler;
      input.click();
      return () => document.removeEventListener('mousemove', handler);
    }).pipe(finalize(() => {
      this.selectedSkin.next(null);
    }));
  }

  private loadImage(path: string) {
    return new Observable<HTMLImageElement>(observer => {
      const img = document.createElement('img');
      img.onload = () => {
        observer.next(img);
        observer.complete();
      };
      img.onerror = () => {
        observer.error(new Error(`Could not load image ${path}`));
      }
      img.setAttribute('crossOrigin', '');
      img.src = path;
    });
  }

  private drawImageToCanvas(image: HTMLImageElement, digit: number, ctx: CanvasRenderingContext2D) {
    return new Observable<void>(observer => {
      const { x, y } = this.getOffset(digit);
      ctx.drawImage(image, x, y);
      observer.complete();
    });
  }

  private drawImage(path: string, digit: number, ctx: CanvasRenderingContext2D) {
    return this.loadImage(path).pipe(
      switchMap(image => this.drawImageToCanvas(image, digit, ctx)),
    );
  }

  private readFile(file: File): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          observer.next(reader.result);
          observer.complete();
        }
      };
      reader.onerror = () => observer.error(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private getOffset(digit: number) {
    return {
      x: (digit % 5) * WIDTH,
      y: Math.floor(digit / 5) * HEIGHT,
    };
  }

  private exportImages(ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(0, 0, WIDTH * 5, HEIGHT * 2);
    const images = [];
    for (let digit = 0; digit < 10; digit++) {
      const image = this.exportImage(imageData, digit);
      images.push(image);
    }
    return images;
  }

  private exportImage(imageData: ImageData, index: number) {
    const image16bit = new Uint8Array(WIDTH * HEIGHT * 2);
    let offset = 0;
    const sum = [0, 0, 0];
    const { x: offsetX, y: offsetY } = this.getOffset(index);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const pixelOffset = ((y + offsetY) * imageData.width + x + offsetX) * 4;
        const r = imageData.data[pixelOffset + 0];
        const g = imageData.data[pixelOffset + 1];
        const b = imageData.data[pixelOffset + 2];
        sum[0] += r;
        sum[1] += g;
        sum[2] += b;
        const pixel16bit = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
        image16bit[offset++] = pixel16bit >> 8;
        image16bit[offset++] = pixel16bit & 0xFF;
      }
    }

    sum[0] = sum[0] / (WIDTH * HEIGHT) / 255.0;
    sum[1] = sum[1] / (WIDTH * HEIGHT) / 255.0;
    sum[2] = sum[2] / (WIDTH * HEIGHT) / 255.0;
    const color = this.getImageColor(sum);
    const compressed = deflateRaw(image16bit, { level: 9 });
    const file = new Uint8Array(compressed.length + 3);
    offset = 0;
    file[offset++] = color.r;
    file[offset++] = color.g;
    file[offset++] = color.b;
    file.set(compressed, offset);
    return file;
  }

  private rgb2hsv(r: number, g: number, b: number) {
    let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
  }

  private hsv2rgb(h: number, s: number, v: number) {
    let f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5), f(3), f(1)];
  }

  private getImageColor([r, g, b]: number[]) {
    const [h, s, _v] = this.rgb2hsv(r, g, b);
    const [cr, cg, cb] = this.hsv2rgb(h, s, 1); //increase value to 1
    return {
      r: cr * 255,
      g: cg * 255,
      b: cb * 255,
    };
  }

  private uploadDigit(digit: number, data: Uint8Array, tries = 5) {
    return this.httpClient.post(`/api/file/${digit}`, data).pipe(
      retry(tries),
    );
  }
}

const FROM_FILE_INDEX = -1;

const SKIN_NAMES = [
  "Nixie Cross",
  "Nixie Real",
  "Dots",
  "Flip Clock",
  "Pink Neo",
  "White Muddy",
  "White Dream",
  "Lego",
  "Gray Moon",
  "Neon Color",
  "White Angles",
  "Ancient",
  "Arcs",
  "7 Segment",
  "Bubble Gum",
  "Origami Orange",
  "Blade runner",
  "Connected dots",
  "Pink teleportation",
  "Origami Blue",
  "Spider Web",
  "Fat Digits",
];

export const WIDTH = 135;
export const HEIGHT = 240;
