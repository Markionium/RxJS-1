import { Scheduler } from '../Scheduler';
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { TeardownLogic } from '../Subscription';

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
export class ArrayObservable<T> extends Observable<T> {

  static create<T>(array: T[], scheduler?: Scheduler): Observable<T> {
    return new ArrayObservable(array, scheduler);
  }

  static dispatch(state: any) {

    const { array, index, count, subscriber } = state;

    if (index >= count) {
      subscriber.complete();
      return;
    }

    subscriber.next(array[index]);

    if (subscriber.closed) {
      return;
    }

    state.index = index + 1;

    (<any> this).schedule(state);
  }

  // value used if Array has one value and _isScalar
  value: any;

  constructor(private array: T[], private scheduler?: Scheduler) {
    super();
    if (!scheduler && array.length === 1) {
      this._isScalar = true;
      this.value = array[0];
    }
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    let index = 0;
    const array = this.array;
    const count = array.length;
    const scheduler = this.scheduler;

    if (scheduler) {
      return scheduler.schedule(ArrayObservable.dispatch, 0, {
        array, index, count, subscriber
      });
    } else {
      for (let i = 0; i < count && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }
      subscriber.complete();
    }
  }
}
