/* source https://gist.github.com/NishchalSharma/7344d0b3e9c1628d2eda5f7252143328 */

/* Returns probability of occuring below and above target price. */
function probability(
  price: number,
  target: number,
  days: number,
  volatility: number,
): { pbelow: number; pabove: number } {
  const p = price;
  const q = target;
  const t = days / 365;
  const v = volatility;

  const vt = v * Math.sqrt(t);
  const lnpq = Math.log(q / p);

  const d1 = lnpq / vt;

  const y = Math.floor((1 / (1 + 0.2316419 * Math.abs(d1))) * 100000) / 100000;
  const z = Math.floor(0.3989423 * Math.exp(-((d1 * d1) / 2)) * 100000) / 100000;
  const y5 = 1.330274 * Math.pow(y, 5);
  const y4 = 1.821256 * Math.pow(y, 4);
  const y3 = 1.781478 * Math.pow(y, 3);
  const y2 = 0.356538 * Math.pow(y, 2);
  const y1 = 0.3193815 * y;
  let x = 1 - z * (y5 - y4 + y3 - y2 + y1);
  x = Math.floor(x * 100000) / 100000;

  if (d1 < 0) {
    x = 1 - x;
  }

  const pbelow = Math.floor(x * 1000) / 10;
  const pabove = Math.floor((1 - x) * 1000) / 10;

  return { pbelow, pabove };
}

export function probability_above(price: number, target: number, days: number, volatility: number): number {
  return probability(price, target, days, volatility).pabove;
}

export function probability_below(price: number, target: number, days: number, volatility: number): number {
  return probability(price, target, days, volatility).pbelow;
}

//  JavaScript adapted from Bernt Arne Odegaard's Financial Numerical Recipes
//  http://finance.bi.no/~bernt/gcc_prog/algoritms/algoritms/algoritms.html
//  by Steve Derezinski, CXWeb, Inc.  http://www.cxweb.com
//  Copyright (C) 1998  Steve Derezinski, Bernt Arne Odegaard
//
//  This program is free software; you can redistribute it and/or
//  modify it under the terms of the GNU General Public License
//  as published by the Free Software Foundation.

//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//  http://www.fsf.org/copyleft/gpl.html

function ndist(z: number): number {
  // return (1.0 / (Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z);
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

function N(z: number): number {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c2 = 0.3989423;
  const a = Math.abs(z);
  if (a > 6.0) {
    return 1.0;
  }
  const t = 1.0 / (1.0 + a * p);
  const b = c2 * Math.exp(-z * (z / 2.0));
  let n = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  n = 1.0 - b * n;
  if (z < 0.0) {
    n = 1.0 - n;
  }
  return n;
}

// given a decimal number z, return a string with whole number + fractional string
// i.e.  z = 4.375, return "4 3/8"
export function fraction(z: number): string {
  const whole = Math.floor(z);
  const fract = z - whole;
  const thirtytwos = Math.round(fract * 32);
  if (thirtytwos == 0) {
    return `${whole} `;
  } //(if fraction is < 1/64)
  if (thirtytwos == 32) {
    return `${whole + 1}`;
  } //(if fraction is > 63/64)

  //32's non-trivial denominators: 2,4,8,16
  if (thirtytwos / 16 == 1) {
    return `${whole} 1/2`;
  }

  if (thirtytwos / 8 == 1) {
    return `${whole} 1/4`;
  }
  if (thirtytwos / 8 == 3) {
    return `${whole} 3/4`;
  }

  if (thirtytwos / 4 == Math.floor(thirtytwos / 4)) {
    return `${whole} ${thirtytwos / 4}/8`;
  }

  if (thirtytwos / 2 == Math.floor(thirtytwos / 2)) {
    return `${whole} ${thirtytwos / 2}/16`;
  } else return `${whole} ${thirtytwos}/32`;
} //end function

/**
 * Compute option contract greeks
 * @param call boolean (to calc call: call=true, put: call=false)
 * @param S stock price
 * @param K strike price
 * @param r no-risk interest rate
 * @param T time to maturity in years
 * @param v volitility (1 std dev of S for 1 year)
 * @returns price, delta, theta (per year), vega (per 100%), rho (per 100%)
 */
export function greeks(
  call: boolean,
  S: number,
  K: number,
  r: number,
  T: number,
  v: number,
): { delta: number; gamma: number; theta: number; vega: number; rho: number; price: number } {
  const sqt = Math.sqrt(T);

  const d1 = (Math.log(S / K) + (r + v * v * 0.5) * T) / (v * sqt);
  // const d1 = (Math.log(S / K) + r * t) / (v * sqt) + 0.5 * (v * sqt);
  const d2 = d1 - v * sqt;

  let Nd2: number; // N(d2), used often
  let delta: number; // The delta of the option
  if (call) {
    delta = N(d1);
    Nd2 = N(d2);
  } else {
    //put
    delta = -N(-d1);
    Nd2 = -N(-d2);
  }

  const ert: number = Math.exp(-r * T); // e(-rt), ditto
  const nd1: number = ndist(d1); // n(d1), also used often

  const gamma = nd1 / (S * v * sqt);
  const theta = -((S * nd1 * v) / (2 * sqt)) - r * K * ert * Nd2;
  const vega = S * sqt * nd1;
  const rho = K * T * ert * Nd2;

  const black_scholes = S * delta - K * ert * Nd2;
  return { delta, gamma, theta, vega, rho, price: black_scholes };
}

// call = boolean (to calc call, call=true, put: call=false)
// S = stock prics, X = strike price, r = no-risk interest rate
// v = volitility (1 std dev of S for (1 yr? 1 month?, you pick)
// t = time to maturity
function black_scholes(call: boolean, S: number, X: number, r: number, v: number, t: number): number {
  return greeks(call, S, X, r, t, v).price;
} //end of black_scholes

/**
 * Compute option contract volatility
 * @param call boolean (to calc call: call=true, put: call=false)
 * @param S stock price
 * @param X strike price
 * @param r no-risk interest rate
 * @param T time to maturity in years
 * @param o option price
 * @returns implied volatility
 */
export function option_implied_volatility(
  call: boolean,
  S: number,
  X: number,
  r: number,
  T: number,
  o: number,
): number {
  // define some temp vars, to minimize function calls
  const sqt = Math.sqrt(T);
  const MAX_ITER = 100;
  const ACC = 0.0001;

  let sigma = o / S / (0.398 * sqt);
  for (let i = 0; i < MAX_ITER; i++) {
    const price = black_scholes(call, S, X, r, sigma, T);
    const diff = o - price;
    if (Math.abs(diff) < ACC) return sigma;
    const d1 = (Math.log(S / X) + r * T) / (sigma * sqt) + 0.5 * sigma * sqt;
    const vega = S * sqt * ndist(d1);
    sigma = sigma + diff / vega;
  }
  throw new Error("Error, failed to converge");
} //end of option_implied_volatility

// function call_iv(s: number, x: number, r: number, t: number, o: number): number { return option_implied_volatility(true, s, x, r / 100, t / 365, o); }

// console.log(greeks(false, 43.87, 45, 0.0175, 63 / 365, 0.20324132));
// const iv_ = option_implied_volatility(false, 43.87, 45, 0.0175, 63 / 365, 2.04352);
// console.log(iv_);
