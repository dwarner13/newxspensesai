export async function withBackoff<T>(fn:()=>Promise<T>, opts={tries:3, baseMs:300}) {
  let attempt = 0, lastErr:any
  while (attempt < opts.tries) {
    try { return await fn() } catch (e:any) {
      lastErr = e
      const wait = opts.baseMs * Math.pow(2, attempt) + Math.random()*100
      await new Promise(r => setTimeout(r, wait))
      attempt++
    }
  }
  throw lastErr
}

export async function withTimeout<T>(p:Promise<T>, ms=25000) {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ])
}




