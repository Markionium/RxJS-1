///<reference path='../../typings/index.d.ts'/>
declare const global: any;

import * as Rx from '../../dist/cjs/Rx';
import {root} from '../../dist/cjs/util/root';
import {$$iterator} from '../../dist/cjs/symbol/iterator';
import $$symbolObservable from 'symbol-observable';

export function lowerCaseO<T>(...args): Rx.Observable<T> {
  const values = [].slice.apply(arguments);

  const o = {
    subscribe: function (observer) {
      values.forEach(function (v) {
        observer.next(v);
      });
      observer.complete();
    }
  };

  o[$$symbolObservable] = function () {
    return this;
  };

  return <any>o;
};

export const createObservableInputs = <T>(value: T) => Rx.Observable.of(
  Rx.Observable.of(value),
  Rx.Observable.of(value, Rx.Scheduler.async),
  [value],
  Promise.resolve(value),
  <any>({ [$$iterator]: () => {
      const iteratorResults = [
        {value, done: false},
        {done: true}
      ];
      return {
        next: () => {
          return iteratorResults.shift();
        }
      };
    }}),
  <any>({ [$$symbolObservable]: () => Rx.Observable.of(value) })
);

global.__root__ = root;
