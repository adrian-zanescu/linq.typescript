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
        apply(action: (t: T, i: number) => void): ILinqEnumerable<T>;
        forEach(action: (t: T, i: number) => void): void;
        toArray(): T[];
        toDictionary<TValue>(keySelector: (t: T, i: number) => string, valueSelector: (t: T, i: number) => TValue): IDictionary<TValue>;
        join<TRight, TResult>(right: IEnumerable<TRight>, leftKey: (t: T, i: number) => any, rightKey: (r: TRight, i: number) => any, selector: (l: T, r: TRight) => TResult): ILinqEnumerable<TResult>;
        union(other: IEnumerable<T>): ILinqEnumerable<T>;
        take(count: number): ILinqEnumerable<T>;
        skip(count: number): ILinqEnumerable<T>;
        zip<S, R>(other: IEnumerable<S>, selector: (t: T, s: S, i: number) => R): ILinqEnumerable<R>;
        aggregate<S>(func: (t: T, acumulator: S, i: number) => S, seed?: S): S;
        max(): T;
        min(): T;
        sum(): T;
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
