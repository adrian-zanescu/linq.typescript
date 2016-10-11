namespace Linq
{
    export interface IEnumerable<T>
    {
        getEnumerator(): IEnumerator<T>
    }

    export interface IEnumerator<T>
    {
        current(): T;
        moveNext(): boolean;
    }

    export interface IDictionary<TValue>
    {
        [key: string]: TValue;
    }

    class EmptyEnumerable<T> implements IEnumerable<T>
    {
        getEnumerator(): IEnumerator<T>
        {
            return EmptyEnumerator.instance<T>();
        }
    }

    class EmptyEnumerator<T> implements IEnumerator<T>
    {
        moveNext()
        {
            return false;
        }

        current()
        {
            return null;
        }

        private static _instance = new EmptyEnumerator<any>();
        static instance<T>()
        {
            return EmptyEnumerator._instance;
        }
    }

    export function IsEnumerable<T>(obj): obj is IEnumerable<T>
    {
        if (!obj)
        {
            return false;
        }
        var en = <Enumerable<any>>obj;
        return en.isEnumerable && en.isEnumerable() || en.getEnumerator ? true : false;
    }

    class Enumerable<T> implements IEnumerable<T>
    {
        private static _empty = new EmptyEnumerable<any>();
        static empty<T>(): IEnumerable<T>
        {
            return Enumerable._empty;
        }

        isEnumerable()
        {
            return true;
        }

        _source: IEnumerable<T>;
        constructor(source: IEnumerable<T>)
        {
            this._source = <IEnumerable<T>>(source || Enumerable.empty<T>());
        }

        getEnumerator()
        {
            return this._source.getEnumerator();
        }

        forEach(action: (t: T) => void, shouldBreak?: (t: T) => boolean)
        {
            var iter = this.getEnumerator();
            while (iter.moveNext())
            {
                var current = iter.current();
                if (shouldBreak && shouldBreak(current))
                {
                    break;
                }
                action(current);
            }
        }

        static toLinq<T>(source: IEnumerable<T>): ILinqEnumerable<T>
        {
            return new LinqEnumerable(source);
        }

        static fromArray<T>(source: T[]): ILinqEnumerable<T>
        {
            return Enumerable.toLinq(Implementations.fromArray(source));
        }

        static fromValue<T>(source: T): ILinqEnumerable<T>
        {
            return Enumerable.toLinq(Implementations.fromValue(source));
        }

        static generate<T>(generator: (i: number) => IEnumerable<T> | T): ILinqEnumerable<T>
        {
            return Enumerable.toLinq(Implementations.generate(generator));
        }

        static repeat<T>(value: T, count: number): ILinqEnumerable<T>
        {
            return Enumerable.generate(() => value).take(count);
        }
    }

    export interface ILinqEnumerable<T> extends IEnumerable<T>
    {
        selectMany<S>(selector: (t: T, i: number) => IEnumerable<S> | S): ILinqEnumerable<S>;
        select<S>(selector: (t: T, i: number) => S): ILinqEnumerable<S>;
        where(predicate: (t: T, i: number) => boolean): ILinqEnumerable<T>;

        apply(action: (t: T) => void): ILinqEnumerable<T>;
        forEach(action: (t: T) => void): void;

        toArray(): T[];
        toDictionary<TValue>(keySelector: (t: T) => string, valueSelector: (t: T) => TValue): IDictionary<TValue>;

        join<TRight, TResult>(right: IEnumerable<TRight>, leftKey: (t: T) => any, rightKey: (r: TRight) => any
            , selector: (l: T, r: TRight) => TResult): ILinqEnumerable<TResult>;
        union(other: IEnumerable<T>): ILinqEnumerable<T>;

        take(count: number): ILinqEnumerable<T>;
        skip(count: number): ILinqEnumerable<T>;
        zip<S, R>(other: IEnumerable<S>, selector: (t: T, s: S) => R): ILinqEnumerable<R>

        aggregate<S>(func: (t: T, acumulator: S) => S, seed?: S): S;
    }

    class LinqEnumerable<T> extends Enumerable<T> implements ILinqEnumerable<T>
    {
        selectMany<S>(selector: (t: T, i: number) => IEnumerable<S> | S): ILinqEnumerable<S>
        {
            var index = -1;
            var map = Implementations.flatMap<T, S>(this, t =>
            {
                index++;
                return selector(t, index);
            });
            return new LinqEnumerable(map);
        }

        select<S>(selector: (t: T, i: number) => S): ILinqEnumerable<S>
        {
            return this.selectMany<S>((t, i) => selector(t, i));
        }

        where(predicate: (t: T, i: number) => boolean): ILinqEnumerable<T>
        {
            return this.selectMany<T>((t, i) =>
            {
                return predicate(t, i) ? t : Enumerable.empty<T>();
            });
        }

        apply(action: (t: T) => void): ILinqEnumerable<T>
        {
            return this.select(a => { action(a); return a });
        }

        toArray(): T[]
        {
            var result: T[] = [];
            this.forEach(a => result.push(a));
            return result;
        }

        toDictionary<TValue>(keySelector: (t: T) => string, valueSelector: (t: T) => TValue): IDictionary<TValue>
        {
            var result: IDictionary<TValue> = {};
            this.forEach(a => 
            {
                result[keySelector(a)] = valueSelector(a);
            });
            return result;
        }

        take(count: number): ILinqEnumerable<T>
        {
            return new LinqEnumerable(
                {
                    getEnumerator: () =>
                    {
                        var inner = this.getEnumerator();
                        var result = Implementations.generate(i => inner.current(), (a, i) => i < count && inner.moveNext());
                        return result.getEnumerator();
                    }
                });
        }

        skip(count: number)
        {
            return this.where((_, i) => i >= count);
        }

        union(other: ILinqEnumerable<T>): ILinqEnumerable<T>
        {
            return Enumerable.generate(i => i).take(2)
                .selectMany(i => 
                {
                    if (i == 0)
                    {
                        return this;
                    }
                    return other;
                });
        }

        join<TRight, TResult>(right: ILinqEnumerable<TRight>, leftKey: (t: T) => any, rightKey: (r: TRight) => any
            , selector: (l: T, r: TRight) => TResult): ILinqEnumerable<TResult>
        {
            return new LinqEnumerable(
                {
                    getEnumerator: () =>
                    {
                        var keys = {};
                        var head = this.take(1).selectMany(l =>
                        {
                            var lk = leftKey(l);
                            return right.select(r =>
                            {
                                var rk = rightKey(r);
                                var rs: any[] = keys[rk] || [];
                                rs.push(r);
                                keys[rk] = rs;
                                return { rk: rk, r: r };
                            }).where(a => a.rk == lk)
                                .select(a => selector(l, a.r));
                        });
                        var tail = this.skip(1).selectMany(l =>
                        {
                            var lk = leftKey(l);
                            var rightJoin = Enumerable.fromArray<TRight>(keys[lk]);
                            return rightJoin.select(r =>
                            {
                                return selector(l, r);
                            });
                        });
                        return head.union(tail).getEnumerator();
                    }
                });
        }

        zip<S, R>(other: IEnumerable<S>, selector: (t: T, s: S) => R): ILinqEnumerable<R>
        {
            return new LinqEnumerable(
                {
                    getEnumerator: () =>
                    {
                        var iter1 = this.getEnumerator();
                        var iter2 = other.getEnumerator();
                        var gen = Implementations.generate((i) => selector(iter1.current(), iter2.current()), (prev, i) => iter1.moveNext() && iter2.moveNext());
                        return gen.getEnumerator();
                    }
                });
        }

        aggregate<S>(func: (t: T, acumulator: S) => S, seed?: S): S
        {
            var iter = this.getEnumerator();
            while (iter.moveNext())
            {
                seed = func(iter.current(), seed);
            }
            return seed;
        }
    }

    namespace Implementations
    {
        class ArrayEnumerable<T> implements IEnumerable<T>
        {
            _array: T[];
            constructor(array: T[])
            {
                this._array = array || [];
            }

            getEnumerator(): IEnumerator<T>
            {
                return new ArrayEnumerator<T>(this._array);
            }
        }

        export function fromArray<T>(array: T[]): IEnumerable<T>
        {
            return new ArrayEnumerable(array);
        }

        class ArrayEnumerator<T> extends ArrayEnumerable<T> implements IEnumerator<T>
        {
            private _index = -1;
            constructor(array: T[])
            {
                super(array);
            }

            private reachedEnd()
            {
                return this._index >= this._array.length;
            }

            moveNext()
            {
                this._index++;
                return !this.reachedEnd();
            }

            current()
            {
                return this._array[this._index];
            }
        }

        class ValueEnumerable<T> implements IEnumerable<T>
        {
            private _value: T;
            constructor(value: T)
            {
                this._value = value;
            }

            getEnumerator(): IEnumerator<T>
            {
                return new ValueEnumerator(this._value);
            }
        }

        export function fromValue<T>(source: T): IEnumerable<T>
        {
            return new ValueEnumerable(source);
        }

        class ValueEnumerator<T> implements IEnumerator<T>
        {
            private _value: T;
            constructor(value: T)
            {
                this._value = value;
            }

            private _moved = false;

            moveNext()
            {
                return this._moved ? false : (this._moved = true);
            }

            current()
            {
                return this._value;
            }
        }

        class GeneratedEnumerable<T> implements IEnumerable<T>
        {
            private _generator: (i: number) => IEnumerable<T> | T;
            private _moveNext: (t: T, i: number) => boolean;

            constructor(generator: (i?: number) => IEnumerable<T> | T, moveNext?: (previous: T, i: number) => boolean)
            {
                this._generator = generator || (i => null);
                this._moveNext = moveNext || ((previous, i) => true);
            }

            getEnumerator(): IEnumerator<T>
            {
                var previous: T = null;
                var index = -1;
                var gen: IEnumerator<number> =
                    {
                        moveNext: () =>
                        {
                            index++;
                            return this._moveNext(previous, index);
                        },
                        current: () => index
                    };
                return Linq.linqStatic({ getEnumerator: () => gen }).selectMany(a => this._generator(a)).select(a =>
                {
                    previous = a;
                    return a;
                }).getEnumerator();
            };
        }

        export function generate<T>(generator: (i: number) => IEnumerable<T> | T, moveNext?: (previous: T, i: number) => boolean): IEnumerable<T>
        {
            return new GeneratedEnumerable(generator, moveNext);
        }

        class FlatMapEnumerable<T, S> implements IEnumerable<S>
        {
            private _source: IEnumerable<T>;
            private _selector: (T) => IEnumerable<S> | S;
            constructor(source: IEnumerable<T>, selector: (t: T) => IEnumerable<S> | S)
            {
                this._source = source || Linq.linqStatic.empty<T>();
                this._selector = selector || (item => Linq.linqStatic.empty<S>());
            }

            getEnumerator(): IEnumerator<S>
            {
                return new FlatMapper<T, S>(this._source, this._selector);
            }
        }

        export function flatMap<T, S>(source: IEnumerable<T>, selector: (t: T) => IEnumerable<S> | S): IEnumerable<S>
        {
            return new FlatMapEnumerable(source, selector);
        }

        class FlatMapper<T, S> implements IEnumerator<S>
        {
            private _source: IEnumerable<T>;
            private _selector: (T) => IEnumerable<S> | S;

            constructor(source: IEnumerable<T>, selector: (t: T) => IEnumerable<S> | S)
            {
                this._source = source || Linq.linqStatic.empty<T>();
                this._selector = selector || (item => Linq.linqStatic.empty<S>());
            }

            private _current: S;
            private _enumerator: IEnumerator<T>;
            private _mapped: IEnumerator<S>;

            moveNext()
            {
                this._enumerator = this._enumerator || this._source.getEnumerator();

                if (this.innerMoveNext())
                {
                    return true;
                }
                while (this._enumerator.moveNext())
                {
                    var selectResult = this._selector(this._enumerator.current());
                    if (Linq.IsEnumerable(selectResult))
                    {
                        this._mapped = selectResult.getEnumerator();
                    }
                    else
                    {
                        this._current = selectResult;
                        this._mapped = null;
                        return true;
                    }
                    if (this.innerMoveNext())
                    {
                        return true;
                    }
                }
                return false;
            }

            private innerMoveNext()
            {
                while (this._mapped && this._mapped.moveNext())
                {
                    this._current = this._mapped.current();
                    return true;
                }
                return false;
            }

            current()
            {
                return this._current;
            }
        }
    }

    export interface ILinqStatic
    {
        <T>(source: T[] | IEnumerable<T> | T): ILinqEnumerable<T>
        empty<T>(): ILinqEnumerable<T>;
        generate<T>(generator: (i: number) => T): ILinqEnumerable<T>;
        repeat<T>(value: T, count: number): ILinqEnumerable<T>;
    }

    export var linqStatic: ILinqStatic;
    linqStatic = <any>((source) =>
    {
        if (source)
        {
            if (source instanceof Array)
            {
                return Enumerable.fromArray(source);
            }
            if (source.getEnumerator)
            {
                if (source.selectMany)
                {
                    return source;
                }
                return Enumerable.toLinq(source);
            }
        }
        return Enumerable.fromValue(source);
    });

    var empty = Enumerable.toLinq(Enumerable.empty());
    linqStatic.empty = () => empty;
    linqStatic.generate = Enumerable.generate;
    linqStatic.repeat = Enumerable.repeat;

    linq = linqStatic;
}

declare var linq: Linq.ILinqStatic;