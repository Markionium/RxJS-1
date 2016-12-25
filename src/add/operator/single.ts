
import { Observable } from '../../Observable';
import { single } from '../../operator/single';

Observable.prototype.single = single;

declare module '../../Observable' {
  interface Observable<T> {
    single<R extends Observable<T>>(this: R,
                                    predicate?: (value: T, index: number, source: R) => boolean): R;
  }
}