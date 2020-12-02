import { Guard, JSONEntry } from './subject';

export function symmetricGuard<T extends JSONEntry>(
  test: (value: unknown) => T | undefined,
): Guard<T> {
  return {
    toValue: test,
    fromValue: test,
  };
}

export const ifNull = symmetricGuard((u) => (u === null ? u : undefined));
export const ifString = symmetricGuard((u) => (typeof u === 'string' ? u : undefined));


export const ifISODate: Guard<Date> = {
  toValue: d => {
    if (d instanceof Date) {
      return d.toISOString().split('T')[0];
    }
  },
  fromValue: u => { 
    if (typeof u === 'string' && u.match(/^\d\d\d\d-\d\d-\d\d$/)) {
      const d = new Date(u);
      d.setHours(12,0,0,0);
      return d;
    }}
};

// symmetricGuard((u) => (typeof u === 'string' && u.match(/^\d\d\d\d-\d\d-\d\d$/) ? u : undefined));


export const ifNumber = symmetricGuard((u) => (typeof u === 'number' ? u : undefined));
export const ifBoolean = symmetricGuard((u) => (typeof u === 'boolean' ? u : undefined));
export const ifStringEnum = <T extends string>(...items: T[]): Guard<T> => ({
  toValue: (u) => (typeof u === 'string' && items.indexOf(u) > -1 ? u : undefined),
  fromValue: (u) => (typeof u === 'string' && items.indexOf(u as T) > -1 ? (u as T) : undefined),
});
export const ifNumberEnum = <T extends number>(...items: T[]): Guard<T> => ({
  toValue: (u) => (typeof u === 'number' && items.indexOf(u) > -1 ? u : undefined),
  fromValue: (u) => (typeof u === 'number' && items.indexOf(u as T) > -1 ? (u as T) : undefined),
});
export const withDefault = <T, U>(guard: Guard<T>, def: U): Guard<T, U> => ({
  toValue: guard.toValue as any,
  fromValue: (u, root) => {
    const r = guard.fromValue(u, root);
    return typeof r === 'undefined' ? def : r;
  },
});

export function ifTupleOf<A>(gA: Guard<A>): Guard<[A]>;
export function ifTupleOf<A, B>(gA: Guard<A>, gB: Guard<B>): Guard<[A, B]>;
export function ifTupleOf<A, B, C>(gA: Guard<A>, gB: Guard<B>, gC: Guard<C>): Guard<[A, B, C]>;
export function ifTupleOf<A, B, C, D>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
): Guard<[A, B, C, D]>;
export function ifTupleOf(...guards: Guard<any>[]): Guard<any> {
  return {
    toValue: (u) => {
      if (!Array.isArray(u) || u.length !== guards.length) return undefined;
      const items = u.map((item, index) => guards[index].toValue(item));
      return items.some((i) => i === undefined) ? undefined : (items as any);
    },
    fromValue: (u, root) => {
      if (!Array.isArray(u) || u.length !== guards.length) return undefined;
      const items = u.map((item, index) => guards[index].fromValue(item, root));
      return items.some((i) => i === undefined) ? undefined : items;
    },
  };
}

export const ifObject = <T extends object>(
  guards: { [K in keyof T]: Guard<T[K], any> },
): Guard<T> => ({
  toValue: (u) => {
    if (typeof u !== 'object' || u == null) return;

    const result = {} as any;

    for (const [key, guard] of Object.entries<Guard<any>>(guards)) {
      const value = guard.toValue((u as any)[key]);
      if (value === undefined) return;
      result[key] = value;
    }

    return result;
  },
  fromValue: (u, root) => {
    if (typeof u !== 'object' || u == null) return;

    const result = {} as any;

    for (const [key, guard] of Object.entries<Guard<any>>(guards)) {
      const value = guard.fromValue((u as any)[key], root);
      if (value === undefined) return;
      result[key] = value;
    }

    return result;
  },
});

export const ifRecord = <T>(guard: Guard<T>): Guard<{ [key: string]: T }> => ({
  toValue: (u) => {
    if (typeof u !== 'object' || u == null) return;

    const result = {} as any;

    for (const [key, rawValue] of Object.entries(u)) {
      const value = guard.toValue(rawValue);
      if (value === undefined) return;
      result[key] = value;
    }

    return result;
  },
  fromValue: (u, root) => {
    if (typeof u !== 'object' || u == null) return;

    const result = {} as any;

    for (const [key, rawValue] of Object.entries(u)) {
      const value = guard.fromValue(rawValue, root);
      if (value === undefined) return;
      result[key] = value;
    }

    return result;
  },
});

// export const ifArrayOf = <T>(guard: Guard<T>, minLength = 0, maxLength = Infinity): Guard<T[]> => ({
//   toValue: (u) => {
//     if (!Array.isArray(u) || u.length < minLength || u.length > maxLength) return undefined;
//     const items = u.map((i) => guard.toValue(i));
//     return items.some((i) => i === undefined) ? undefined : (items as any);
//   },
//   fromValue: (u, root) => {
//     if (u == null) return undefined;
//     if (
//       typeof u === 'object' &&
//       root.isNode(u) &&
//       typeof u.length === 'number' &&
//       (u.length as number) >= minLength &&
//       (u.length as number) <= maxLength
//     ) {
//       return [...Array(u.length)].map((_, i) => u[i]) as any;
//     }

//     if (!Array.isArray(u) || u.length < minLength || u.length > maxLength) {
//       // console.log("NOOOO", u, root.isNode(u), Object.keys(u));
//       return undefined;
//     }
//     const items = u.map((i) => guard.fromValue(i, root));
//     return items.some((i) => i === undefined) ? undefined : (items as T[]);
//   },
// });

export const ifNullOr = <T>(guard: Guard<T>): Guard<T | null> => ({
  toValue: (u) => (u == null ? null : guard.toValue(u)),
  fromValue: (u, root) => (u == null ? null : guard.fromValue(u, root)),
});

// export const identityGuard: Guard<any> = {
//   toValue: (i) => i,
//   fromValue: (i) => i,
// };



// prettier-ignore-start
export function ifAnyOf<A>(gA: Guard<A>): Guard<A>;
export function ifAnyOf<A, B>(gA: Guard<A>, gB: Guard<B>): Guard<A | B>;
export function ifAnyOf<A, B, C>(gA: Guard<A>, gB: Guard<B>, gC: Guard<C>): Guard<A | B | C>;
export function ifAnyOf<A, B, C, D>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
): Guard<A | B | C | D>;
export function ifAnyOf<A, B, C, D, E>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
): Guard<A | B | C | D | E>;
export function ifAnyOf<A, B, C, D, E, F>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
): Guard<A | B | C | D | E | F>;
export function ifAnyOf<A, B, C, D, E, F, G>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
): Guard<A | B | C | D | E | F | G>;
export function ifAnyOf<A, B, C, D, E, F, G, H>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
): Guard<A | B | C | D | E | F | G | H>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
): Guard<A | B | C | D | E | F | G | H | I>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
): Guard<A | B | C | D | E | F | G | H | I | J>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
): Guard<A | B | C | D | E | F | G | H | I | J | K>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
): Guard<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
): Guard<
  A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X
>;
export function ifAnyOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
): Guard<
  A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO,
  BP
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
  gBP: Guard<BP>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
  | BP
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO,
  BP,
  BQ
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
  gBP: Guard<BP>,
  gBQ: Guard<BQ>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
  | BP
  | BQ
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO,
  BP,
  BQ,
  BR
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
  gBP: Guard<BP>,
  gBQ: Guard<BQ>,
  gBR: Guard<BR>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
  | BP
  | BQ
  | BR
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO,
  BP,
  BQ,
  BR,
  BS
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
  gBP: Guard<BP>,
  gBQ: Guard<BQ>,
  gBR: Guard<BR>,
  gBS: Guard<BS>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
  | BP
  | BQ
  | BR
  | BS
>;
export function ifAnyOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  AA,
  AB,
  AC,
  AD,
  AE,
  AF,
  AG,
  AH,
  AI,
  AJ,
  AK,
  AL,
  AM,
  AN,
  AO,
  AP,
  AQ,
  AR,
  AS,
  AT,
  AU,
  AV,
  AW,
  AX,
  AY,
  AZ,
  BA,
  BB,
  BC,
  BD,
  BE,
  BF,
  BG,
  BH,
  BI,
  BJ,
  BK,
  BL,
  BM,
  BN,
  BO,
  BP,
  BQ,
  BR,
  BS,
  BT
>(
  gA: Guard<A>,
  gB: Guard<B>,
  gC: Guard<C>,
  gD: Guard<D>,
  gE: Guard<E>,
  gF: Guard<F>,
  gG: Guard<G>,
  gH: Guard<H>,
  gI: Guard<I>,
  gJ: Guard<J>,
  gK: Guard<K>,
  gL: Guard<L>,
  gM: Guard<M>,
  gN: Guard<N>,
  gO: Guard<O>,
  gP: Guard<P>,
  gQ: Guard<Q>,
  gR: Guard<R>,
  gS: Guard<S>,
  gT: Guard<T>,
  gU: Guard<U>,
  gV: Guard<V>,
  gW: Guard<W>,
  gX: Guard<X>,
  gY: Guard<Y>,
  gZ: Guard<Z>,
  gAA: Guard<AA>,
  gAB: Guard<AB>,
  gAC: Guard<AC>,
  gAD: Guard<AD>,
  gAE: Guard<AE>,
  gAF: Guard<AF>,
  gAG: Guard<AG>,
  gAH: Guard<AH>,
  gAI: Guard<AI>,
  gAJ: Guard<AJ>,
  gAK: Guard<AK>,
  gAL: Guard<AL>,
  gAM: Guard<AM>,
  gAN: Guard<AN>,
  gAO: Guard<AO>,
  gAP: Guard<AP>,
  gAQ: Guard<AQ>,
  gAR: Guard<AR>,
  gAS: Guard<AS>,
  gAT: Guard<AT>,
  gAU: Guard<AU>,
  gAV: Guard<AV>,
  gAW: Guard<AW>,
  gAX: Guard<AX>,
  gAY: Guard<AY>,
  gAZ: Guard<AZ>,
  gBA: Guard<BA>,
  gBB: Guard<BB>,
  gBC: Guard<BC>,
  gBD: Guard<BD>,
  gBE: Guard<BE>,
  gBF: Guard<BF>,
  gBG: Guard<BG>,
  gBH: Guard<BH>,
  gBI: Guard<BI>,
  gBJ: Guard<BJ>,
  gBK: Guard<BK>,
  gBL: Guard<BL>,
  gBM: Guard<BM>,
  gBN: Guard<BN>,
  gBO: Guard<BO>,
  gBP: Guard<BP>,
  gBQ: Guard<BQ>,
  gBR: Guard<BR>,
  gBS: Guard<BS>,
  gBT: Guard<BT>,
): Guard<
  | A
  | B
  | C
  | D
  | E
  | F
  | G
  | H
  | I
  | J
  | K
  | L
  | M
  | N
  | O
  | P
  | Q
  | R
  | S
  | T
  | U
  | V
  | W
  | X
  | Y
  | Z
  | AA
  | AB
  | AC
  | AD
  | AE
  | AF
  | AG
  | AH
  | AI
  | AJ
  | AK
  | AL
  | AM
  | AN
  | AO
  | AP
  | AQ
  | AR
  | AS
  | AT
  | AU
  | AV
  | AW
  | AX
  | AY
  | AZ
  | BA
  | BB
  | BC
  | BD
  | BE
  | BF
  | BG
  | BH
  | BI
  | BJ
  | BK
  | BL
  | BM
  | BN
  | BO
  | BP
  | BQ
  | BR
  | BS
  | BT
>;
// prettier-ignore-end
export function ifAnyOf<A>(...gA: Guard<A>[]): Guard<A>;
export function ifAnyOf(...guards: Guard<any>[]): Guard<any> {
  return {
    toValue: (u) => {
      for (const guard of guards) {
        const result = guard.toValue(u);
        if (result !== undefined) return result;
      }
    },
    fromValue: (u, root) => {
      for (const guard of guards) {
        const result = guard.fromValue(u, root);
        if (result !== undefined) return result;
      }
    },
  };
}
