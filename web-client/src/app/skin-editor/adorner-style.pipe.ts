import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { scan, map, distinctUntilChanged } from 'rxjs/operators';

@Pipe({
  name: 'adornerStyle',
  pure: true,
})
export class AdornerStylePipe implements PipeTransform {
  transform(digit$: Observable<number>, showFullWhenNothingSelected?: boolean) {
    return digit$.pipe(
      distinctUntilChanged(),
      scan(({ lastDigit }, digit) => {
        const nothingSelected = digit === -1;
        const show = showFullWhenNothingSelected || !nothingSelected;
        let x, y;
        if (nothingSelected) {
          digit = lastDigit;
          if (showFullWhenNothingSelected) {
            digit = 0;
          }
        }
        x = digit % 5;
        y = Math.floor(digit / 5);
        return {
          style: {
            transform: `translate(${x * 100}%, ${y * 100}%) scale(${show ? 1 : 0})`,
            opacity: show ? 1 : 0,
            ...(showFullWhenNothingSelected && nothingSelected) ? {
              width: '100%',
              height: '100%',
            } : {}
          },
          lastDigit: digit,
        };
      }, { style: {}, lastDigit: 0 }),
      map(v => v.style),
    )
  }
}
