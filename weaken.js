/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length < 1) {
    ns.toast("need param host", "error");
    return;
  }

  let target = ns.args[0];
  let sleep_ms = ns.args[1] || 0;
  let exact_ms = ns.args[2];

  if (sleep_ms > 0) {
    await ns.asleep(sleep_ms);
  }

  let ms = 0;
  while (true) {
    let real_ms = ns.getWeakenTime(target);
    await ns.weaken(target);
    if (exact_ms) {
      ms += real_ms;
      ms %= exact_ms;
      if (real_ms > exact_ms) {
        ns.print(`given exact_ms:${exact_ms} smaller than real_ms:${real_ms}`);
      } else {
        if (ms + ns.getWeakenTime(target) < exact_ms) {
          continue;
        } else {
          await ns.asleep(exact_ms - ms);
          ms = 0;
        }
      }
    }
  }
}
