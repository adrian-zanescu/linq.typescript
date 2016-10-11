declare namespace Linq {
    interface IEnumerable<T> {
        getEnumerator(): IEnumerator<T>;
    }
    interface IEnumerator<T> {
        current(): T;
        moveNext(): boolean;
    }
    interface IDictionary<TValue> {
        [key: string]: TValue;
    }
    function IsEnumerable<T>(obj: any): obj is IEnumerable<T>;
    interface ILinqEnumerable<T> extends IEnumerable<T> {
        selectMany<S>(selector: (t: T, i: number) => IEnumerable<S> | S): ILinqEnumerable<S>;
        select<S>(selector: (t: T, i: number) => S): ILinqEnumerable<S>;
        where(predicate: (t: T, i: number) => boolean): ILinqEnumerable<T>;
        apply(action: (t: T) => void): ILinqEnumerable<T>;
        forEach(action: (t: T) => void): void;
        toArray(): T[];
        toDictionary<TValue>(keySelector: (t: T) => string, valueSelector: (t: T) => TValue): IDictionary<TValue>;
        join<TRight, TResult>(right: IEnumerable<TRight>, leftKey: (t: T) => any, rightKey: (r: TRight) => any, selector: (l: T, r: TRight) => TResult): ILinqEnumerable<TResult>;
        union(other: IEnumerable<T>): ILinqEnumerable<T>;
        take(count: number): ILinqEnumerable<T>;
        skip(count: number): ILinqEnumerable<T>;
        zip<S, R>(other: IEnumerable<S>, selector: (t: T, s: S) => R): ILinqEnumerable<R>;
        aggregate<S>(func: (t: T, acumulator: S) => S, seed?: S): S;
    }
    interface ILinqStatic {
        <T>(source: T[] | IEnumerable<T> | T): ILinqEnumerable<T>;
        empty<T>(): ILinqEnumerable<T>;
        generate<T>(generator: (i: number) => T): ILinqEnumerable<T>;
        repeat<T>(value: T, count: number): ILinqEnumerable<T>;
    }
    var linqStatic: ILinqStatic;
}
declare var linq: Linq.ILinqStatic;
