import {isScheduler} from './util/isScheduler';
import {Scheduler} from './Scheduler';
import {PartialObserver} from './Observer';
import {Operator} from './Operator';
import {Subscriber} from './Subscriber';
import {AnonymousSubscription, TeardownLogic, Subscription} from './Subscription';
import {root} from './util/root';
import {toSubscriber} from './util/toSubscriber';
import {IfObservable} from './observable/IfObservable';
import {ErrorObservable} from './observable/ErrorObservable';
import { $$observable } from './symbol/observable';

declare const require: any;
export interface ObservableConstructor<X, U extends Observable<X>> {
  new<X>(): U;
}

export interface Subscribable<T> {
  subscribe(observerOrNext?: PartialObserver<T> | ((value: T) => void),
            error?: (error: any) => void,
            complete?: () => void): AnonymousSubscription;
}

export type SubscribableOrPromise<T> = Subscribable<T> | PromiseLike<T>;
export type ObservableInput<T> = SubscribableOrPromise<T> | ArrayLike<T>;

/**
 * A representation of any set of values over any amount of time. This the most basic building block
 * of RxJS.
 *
 * @class Observable<T>
 */
export class Observable<T> implements Subscribable<T> {

  public _isScalar: boolean = false;

  protected source: Observable<any>;
  protected operator: Operator<any, T>;

  /**
   * @constructor
   * @param {Function} subscribe the function that is  called when the Observable is
   * initially subscribed to. This function is given a Subscriber, to which new values
   * can be `next`ed, or an `error` method can be called to raise an error, or
   * `complete` can be called to notify of a successful completion.
   */
  constructor(subscribe?: <R>(this: Observable<T>, subscriber: Subscriber<R>) => TeardownLogic) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }

  // HACK: Since TypeScript inherits static properties too, we have to
  // fight against TypeScript here so Subject can have a different static create signature
  /**
   * Creates a new cold Observable by calling the Observable constructor
   * @static true
   * @owner Observable
   * @method create
   * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
   * @return {Observable} a new cold observable
   */
  static create: Function = <T>(subscribe?: <R>(subscriber: Subscriber<R>) => TeardownLogic) => {
    return new Observable<T>(subscribe);
  };

  static of<X, U extends Observable<X>>(this: ObservableConstructor<X, U>, item1: X, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, item1: T, item2: T, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, item1: T, item2: T, item3: T, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, item1: T, item2: T, item3: T, item4: T, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, item1: T, item2: T, item3: T, item4: T, item5: T, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, item1: T, item2: T, item3: T, item4: T, item5: T, item6: T, scheduler?: Scheduler): U;
  static of<T, U extends Observable<T>>(this: ObservableConstructor<T, U>, ...args: Array<T | Scheduler>): U;
  /**
   * Creates an Observable that emits some values you specify as arguments,
   * immediately one after the other, and then emits a complete notification.
   *
   * <span class="informal">Emits the arguments you provide, then completes.
   * </span>
   *
   * <img src="./img/of.png" width="100%">
   *
   * This static operator is useful for creating a simple Observable that only
   * emits the arguments given, and the complete notification thereafter. It can
   * be used for composing with other Observables, such as with {@link concat}.
   * By default, it uses a `null` Scheduler, which means the `next`
   * notifications are sent synchronously, although with a different Scheduler
   * it is possible to determine when those notifications will be delivered.
   *
   * @example <caption>Emit 10, 20, 30, then 'a', 'b', 'c', then start ticking every second.</caption>
   * var numbers = Rx.Observable.of(10, 20, 30);
   * var letters = Rx.Observable.of('a', 'b', 'c');
   * var interval = Rx.Observable.interval(1000);
   * var result = numbers.concat(letters).concat(interval);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link create}
   * @see {@link empty}
   * @see {@link never}
   * @see {@link throw}
   *
   * @param {...T} values Arguments that represent `next` values to be emitted.
   * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
   * the emissions of the `next` notifications.
   * @return {Observable<T>} An Observable that emits each given input value.
   * @static true
   * @name of
   * @owner Observable
   */
  static of<R, U extends Observable<R>>(this: ObservableConstructor<R, U>, ...args: Array<R | Scheduler>): U {
    let scheduler = args[args.length - 1] as Scheduler;
    if (isScheduler(scheduler)) {
      args.pop();
    } else {
      scheduler = null;
    }

    const ArrayObservable: any = require('./observable/ArrayObservable').ArrayObservable;
    const ScalarObservable: any = require('./observable/ScalarObservable').ScalarObservable;
    const EmptyObservable: any = require('./observable/EmptyObservable').EmptyObservable;

    const len = args.length;
    let source: Observable<R>;
    if (len > 1) {
      source = new ArrayObservable(args as Array<R>, scheduler);
    } else if (len === 1) {
      source = new ScalarObservable(args[0] as R, scheduler);
    } else {
      source = new EmptyObservable(scheduler);
    }

    const observable: U = new this<R>();
    observable.source = source;
    return observable;
  }

  /**
   * Creates a new Observable, with this Observable as the source, and the passed
   * operator defined as the new observable's operator.
   * @method lift
   * @param {Operator} operator the operator defining the operation to take on the observable
   * @return {Observable} a new observable with the Operator applied
   */
  lift<R>(operator: Operator<T, R>): Observable < R > {
    const observable = new Observable<R>();
    observable.source = this;
    observable.operator = operator;
    return observable;
  }

  /**
   * Registers handlers for handling emitted values, error and completions from the observable, and
   *  executes the observable's subscriber function, which will take action to set up the underlying data stream
   * @method subscribe
   * @param {PartialObserver|Function} observerOrNext (optional) either an observer defining all functions to be called,
   *  or the first of three possible handlers, which is the handler for each value emitted from the observable.
   * @param {Function} error (optional) a handler for a terminal event resulting from an error. If no error handler is provided,
   *  the error will be thrown as unhandled
   * @param {Function} complete (optional) a handler for a terminal event resulting from successful completion.
   * @return {ISubscription} a subscription reference to the registered handlers
   */
  subscribe(): Subscription;
  subscribe(observer: PartialObserver<T>): Subscription;
  subscribe(next ?: (value: T) => void, error ?: (error: any) => void, complete ?: () => void): Subscription;
  subscribe(observerOrNext ?: PartialObserver<T> | ((value: T) => void),
            error ?: (error: any) => void,
            complete ?: () => void): Subscription {

    const { operator } = this;
    const sink = toSubscriber(observerOrNext, error, complete);

    if (operator) {
      operator.call(sink, this.source);
    } else {
      sink.add(this._subscribe(sink));
    }

    if (sink.syncErrorThrowable) {
      sink.syncErrorThrowable = false;
      if (sink.syncErrorThrown) {
        throw sink.syncErrorValue;
      }
    }

    return sink;
  }

  /**
   * @method forEach
   * @param {Function} next a handler for each value emitted by the observable
   * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
   * @return {Promise} a promise that either resolves on observable completion or
   *  rejects with the handled error
   */
  forEach(next: (value: T) => void, PromiseCtor ? : typeof Promise): Promise < void > {
    if (!PromiseCtor) {
      if (root.Rx && root.Rx.config && root.Rx.config.Promise) {
        PromiseCtor = root.Rx.config.Promise;
      } else if (root.Promise) {
        PromiseCtor = root.Promise;
      }
    }

    if (!PromiseCtor) {
      throw new Error('no Promise impl found');
    }

    return new PromiseCtor<void>((resolve, reject) => {
      const subscription = this.subscribe((value) => {
        if (subscription) {
          // if there is a subscription, then we can surmise
          // the next handling is asynchronous. Any errors thrown
          // need to be rejected explicitly and unsubscribe must be
          // called manually
          try {
            next(value);
          } catch (err) {
            reject(err);
            subscription.unsubscribe();
          }
        } else {
          // if there is NO subscription, then we're getting a nexted
          // value synchronously during subscription. We can just call it.
          // If it errors, Observable's `subscribe` will ensure the
          // unsubscription logic is called, then synchronously rethrow the error.
          // After that, Promise will trap the error and send it
          // down the rejection path.
          next(value);
        }
      }, reject, resolve);
    });
  }

  protected _subscribe(subscriber: Subscriber<any>): TeardownLogic {
    return this.source.subscribe(subscriber);
  }

  // `if` and `throw` are special snow flakes, the compiler sees them as reserved words
  static if: typeof IfObservable.create;
  static throw: typeof ErrorObservable.create;

  /**
   * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
   * @method Symbol.observable
   * @return {Observable} this instance of the observable
   */
  [$$observable]() {
    return this;
  }
}
