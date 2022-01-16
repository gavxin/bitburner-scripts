/** @param {NS} ns **/
export async function main(ns) {
  const files = ["weaken.js", "grow.js", "hack.js"];
  const scripts = ["weaken.js", "grow.js", "hack.js"];

  function format_ram(r) {
    let s = ns.nFormat(r * 1024 * 1024 * 1024, '0ib');
    return s.substr(0, s.length - 2) + "B";
  }

  function format_ms(t) {
    if (t < 1000) {
      return parseFloat(t).toFixed(0) + "ms";
    } else if (t < 60 * 1000) {
      return parseFloat(t / 1000).toFixed(2) + "s";
    } else if (t < 3600 * 1000) {
      return parseFloat(t / 60 / 1000).toFixed(2) + "m";
    } else {
      return parseFloat(t / 3600 / 1000).toFixed(2) + "h";
    }
  }

  function get_server_info(target, depth, parent) {
    const money_avail = ns.getServerMoneyAvailable(target);
    const money_max = ns.getServerMaxMoney(target);
    const sec_min = ns.getServerMinSecurityLevel(target);
    const sec_now = ns.getServerSecurityLevel(target);
    const weaken_ms = ns.getWeakenTime(target);
    const grow_ms = ns.getGrowTime(target);
    const sec_delta = ((sec_now >= sec_min) ? "+" : "") + parseFloat(sec_now - sec_min).toFixed(2);
    const hack_ms = ns.getHackTime(target);
    const hack_analyze = ns.hackAnalyze(target);
    const hack_chance = ns.hackAnalyzeChance(target);
    const growth_percent = ns.getServerGrowth(target);
    const hack_grow_ratio = (growth_percent / 100 / grow_ms) / (hack_chance * hack_analyze / hack_ms);
    const weaken_security = -0.05;
    const grow_security = 0.004;
    const hack_security = 0.002;
    const grow_weaken_ratio = (-weaken_security / weaken_ms) / (grow_security / grow_ms);
    const hack_weaken_ratio = (-weaken_security / weaken_ms) / (hack_security * hack_chance / hack_ms);
    return {
      host: target,
      parent: parent,
      depth: depth || -1,
      root: ns.hasRootAccess(target),
      hackable: ns.getServerRequiredHackingLevel(target) <= ns.getPlayer().hacking,
      max_ram: ns.getServerMaxRam(target),
      money_avail,
      money_max,
      grow_ms,
      money: ns.nFormat(money_avail, '0.00a$') + "/" + parseFloat(money_avail / money_max * 100).toFixed(0) + "%",
      growth_percent,
      grow: format_ms(grow_ms) + "/" + growth_percent + "%",
      sec_min,
      sec_now,
      weaken_ms,
      security: sec_delta + "/" + format_ms(weaken_ms),
      hack_ms,
      hack_chance,
      hack_analyze,
      hack: parseFloat(hack_chance * 100).toFixed(2) + "%/" + parseFloat(hack_analyze * 100).toFixed(2)
        + "%/" + format_ms(hack_ms),
      hack_grow_ratio,
      hack_grow: parseFloat(hack_grow_ratio).toFixed(2),
      grow_weaken_ratio,
      grow_weaken: parseFloat(grow_weaken_ratio).toFixed(2),
      hack_weaken_ratio,
    };
  }

  function pretty_server_infos(servers) {
    const fields = [{
      name: "host",
      length: 19,
    }, {
      name: "depth",
      length: 6,
    }, {
      name: "root",
      length: 6,
    }, {
      name: "hackable",
      length: 9,
    }, {
      name: "max_ram",
      length: 8,
    }, {
      name: "security",
      length: 16,
    }, {
      name: "money",
      length: 14,
    }, {
      name: "grow",
      length: 14,
    }, {
      name: "hack",
      title: "hack chance/steal/time",
      length: 23,
    }/*, {
            name: "hack_grow",
            length: 10,
        }, {
            name: "grow_weaken",
            length: 12,
        }*/];

    let result = "\n";
    // print head
    for (let field of fields) {
      let s = ("title" in field) ? field.title : field.name;
      let spaces = Math.max(0, field.length - s.length);
      result += s + " ".repeat(spaces) + "| ";
    }
    result += "\n";
    result += "-".repeat(result.length - 2) + "\n";

    for (let server of servers) {
      for (let field of fields) {
        let s = new String(server[field.name]);
        let spaces = Math.max(field.length - s.length, 0);
        result += s + " ".repeat(spaces) + "| ";
      }
      result += "\n";
    }
    return result;
  }

  function list_servers() {
    let servers = [];
    function recursive(parent, current, depth) {
      let nexts = [];
      let go_next_level = false;
      ns.scan(current)
        .filter(s => s && s != parent && s != "home")
        .map(s => {
          let info = get_server_info(s, depth, current);
          if (info.root) {
            go_next_level = true;
          }
          servers.push(info);
          nexts.push(s);
        });
      if (go_next_level) {
        for (let next of nexts) {
          recursive(current, next, depth + 1);
        }
      }
    }
    recursive("home", "home", 1);
    servers.sort((a, b) => a.depth - b.depth);
    ns.clearLog();
    return servers;
  }

  function path_server(target) {
    const servers = list_servers();
    let result = [target];
    let current = target;
    while (current != "home") {
      let filtered = servers.filter(s => s.host == current);
      if (filtered.length == 0) {
        return;
      }
      current = filtered[0].parent;
      result.push(current);
    }
    result = result.reverse().slice(1);
    let s = "\n\n";
    s += 'home;';
    for (let server of result) {
      s += ` connect ${server};`;
    }
    s += ' backdoor;\n\n';
    ns.tprint(s);
  }

  const programs = [{
    name: "BruteSSH.exe",
    price: 500000,
    func: ns.brutessh,
  }, {
    name: "FTPCrack.exe",
    price: 1.5 * 1000 * 1000,
    func: ns.ftpcrack,
  }, {
    name: "relaySMTP.exe",
    price: 5 * 1000 * 1000,
    func: ns.relaysmtp,
  }, {
    name: "HTTPWorm.exe",
    price: 30 * 1000 * 1000,
    func: ns.httpworm,
  }, {
    name: "SQLInject.exe",
    price: 250 * 1000 * 1000,
    func: ns.sqlinject,
  }];

  function hackable_ports() {
    return programs.filter(p => ns.fileExists(p.name)).length;
  }

  function hack_ports(target) {
    programs.filter(p => ns.fileExists(p.name)).forEach(p => p.func(target));
  }

  async function nuke_server(target) {
    await ns.scp(files, "home", target);
    if (ns.hasRootAccess(target)) {
      return false;
    }
    if (ns.getServerNumPortsRequired(target) > hackable_ports()) {
      return false;
    }
    hack_ports(target);
    ns.nuke(target);
    if (!ns.hasRootAccess(target)) {
      return false;
    }
    return true;
  }

  function get_my_servers() {
    let rams = [];
    if (ns.getServerMaxRam("home") > ns.getScriptRam("auto.js") * 2) {
      rams.push({
        host: "home",
        max_ram: ns.getServerMaxRam("home") - ns.getScriptRam("auto.js") * 2,
      });
    }
    return rams;
  }

  function get_agents(servers) {
    let rams = [];
    if (servers === undefined) {
      servers = list_servers();
    }
    servers.filter(s => s.root && s.max_ram > 0).forEach(s => {
      rams.push({ host: s.host, max_ram: s.max_ram });
    });
    rams = rams.concat(get_my_servers());
    return rams;
  }

  function list(depth, p = ns.print) {
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getScriptRam");

    let servers = list_servers();
    if (depth) {
      servers = servers.filter(s => s.depth <= depth);
    }
    p(pretty_server_infos(servers));

    let agents = get_agents(servers);
    p(`available ram: ${agents.reduceRight((sum, cur) => sum + cur.max_ram, 0)}GB`);
    for (let script of scripts) {
      p(`${script}: ${ns.getScriptRam(script)}GB each, total count ${agents.reduceRight((sum, cur) => sum + Math.floor(cur.max_ram / ns.getScriptRam(script)), 0)}`);
    }
  }

  function my_killall(server) {
    if (server == "home") {
      ns.ps("home").filter(p => p.filename != "auto.js").forEach(p => ns.kill(p.pid));
    } else {
      ns.killall(server);
    }
  }

  async function nuke_all() {
    let loop = true;
    while (loop) {
      loop = false;
      for (let s of list_servers()) {
        let nuked = await nuke_server(s.host);
        if (nuked) {
          loop = true;
        }
      }
    }
    return true;
  }

  async function scp_all() {
    for (let s of list_servers().filter(s => s.root)) {
      await ns.scp(files, "home", s.host);
    }
  }

  async function scp_back() {
    for (let s of list_servers().filter(s => s.root && ns.getPurchasedServers().indexOf(s.host) == -1)) {
      for (let f of ns.ls(s.host).filter(f => files.indexOf(f) == -1)) {
        await ns.scp(f, s.host, "home");
      }
    }
  }

  async function wait_for(condition) {
    while (true) {
      if (await condition()) return;
      await ns.asleep(1000);
    }
  }

  async function startup(new_start = false) {
    await nuke_all();

    if (new_start) {
      ns.tprint("Clear localStorage.");
      localStorage.clear();
    }

    async function nuke_and_exact_hack() {
      await nuke_all();
      const agents = get_agents();
      await super_weaken_grow_hack(agents, "n00dles");
      // await super_hack_manual(agents, "n00dles", 1, 1, 1);
      return true;
    }

    let sequences = [
      {
        name: "starting ...",
        condition: async () => true,
        action: async () => {
          await nuke_all();
          await super_hack_manual(agents_from("home"), "n00dles", 1, 1, 8);
          return true;
        },
      },
      {
        name: "money >= 200k$",
        condition: async () => ns.getPlayer().money >= 200 * 1000,
        check: async () => ns.getPlayer().tor,
        action: async () => {
          // ns.purchaseTor();
          ns.tprint("\nPlease purchas tor manually! Goto City menu and buy Tor\n");
          return false;
        },
      },
    ];
    for (let program of programs) {
      sequences.push({
        name: `buy ${program.name}`,
        condition: async () => ns.getPlayer().money >= program.price,
        check: async () => ns.fileExists(program.name),
        action: async () => {
          ns.tprint("\n\nPlease purchas " + program.name + " manually!\n");
          ns.tprint(`\n\nhome; connect darkweb; buy ${program.name}; \n`);
          let buy_all = "\n\nhome; connect darkweb; ";
          for (let p of programs) {
            buy_all += "buy " + p.name + "; ";
          }
          ns.tprint(buy_all + "\n");
          return false;
        },
      });
    }

    // sequences.push(
    //   {
    //     name: "buy "

    //   }
    // );

    for (let seq of sequences) {
      ns.tprint(`Running ${seq.name}:${localStorage.getItem(seq.name)} ...`);
      if (localStorage.getItem(seq.name)) {
        // done already
        ns.tprint(`${seq.name} already done`);
        continue;
      }
      if (seq.check && await seq.check()) {
        // check pass
        localStorage.setItem(seq.name, true);
        continue;
      }

      await wait_for(seq.condition);
      let ret = await seq.action();
      if (!ret) {
        ns.tprint(`${seq.name} action return false, abort!`);
        return false;
      }
      localStorage.setItem(seq.name, true);
    }
    ns.tprint(`All sequences run complete`);
  }

  // ----------------------------------------------------------------------------
  // NO_BUY START

  function b_price() {
    let ram = 1;
    let s = "\n\n" + "price".padStart(6) + " | " + "raw".padStart(8) + " | " + "price\n";
    s += "-".repeat(32) + "\n";
    while (ns.getPurchasedServerCost(ram) < ns.getPlayer().money) {
      s += format_ram(ram).padStart(6) + " | " + ram.toString().padStart(8) + " | " + ns.nFormat(ns.getPurchasedServerCost(ram), '0.00a$') + "\n";
      ram *= 2;
    }
    ns.tprint(s);
  }

  function b_list() {
    let s = "\n\n" + "host".padEnd(12) + " | " + "ram".padStart(8) + "\n";
    s += "-".repeat(23) + "\n";
    ns.getPurchasedServers().forEach(n => {
      s += n.padEnd(12) + " | " + format_ram(ns.getServerMaxRam(n)).padStart(8) + "\n";
    });
    ns.tprint(s);
  }

  async function b_buy(ram, name) {
    name = name || "s" + format_ram(ram);
    const n = ns.purchaseServer(name, ram);
    ns.tprint(`✔ buy complete, server name:${n}`);
    if (n) {
      await ns.scp(files, "home", n);
    }
    return n;
  }

  function b_del(name) {
    ns.killall(name);
    if (!ns.deleteServer(name)) {
      ns.tprint(`❌ del server ${name} failed!`);
      return false;
    }
    ns.tprint(`✔ del server ${name} success!`);
    return true;
  }

  async function b_del_not_1pb() {
    let to_dels = ns.getPurchasedServers().filter(s => ns.getServerMaxRam(s) < 1024 * 1024);
    if (!await ns.prompt("To del servers: " + to_dels.join(", "))) {
      ns.tprint("select no, not delete!");
      return;
    }
    to_dels.forEach(name => b_del(name));
  }

  async function b_del_all() {
    let to_dels = ns.getPurchasedServers();
    if (!await ns.prompt("Confirm delete all servers!")) {
      ns.tprint("select no, not delete!");
      return;
    }
    to_dels.forEach(name => b_del(name));
  }

  async function buy_super_weaken_grow_hack(target, ram = 1048576) {
    let s = await b_buy(ram, `s${format_ram(ram)}_${target}`);
    if (!s) {
      ns.tprint(`❌ Buy server failed! need money ${ns.nFormat(ns.getPurchasedServerCost(ram), '0.00a$')}, current have ${ns.getPurchasedServers().length}/25`);
      return;
    }
    let agents = [{
      host: s,
      max_ram: ram,
    }];
    await super_weaken_grow_hack(agents, target);
    ns.tprint(`✔ bwgh target:${target} complete.`);
  }

  async function bwgh_all(count, ram, max_grow_min) {
    let bought_servers = ns.getPurchasedServers();
    count = count || (25 - bought_servers.length);
    ram = ram || 1048576;
    max_grow_min = max_grow_min || 10;
    // ns.tprint(`count:${count}, ram:${ram}, max_grow_min:${max_grow_min}`);

    let already_hacking = bought_servers.map(s => s.substr(s.indexOf('_') + 1));
    // ns.tprint("Already hacking:", already_hacking);

    let not_hacking = list_servers().filter(s => s.money_max > 0 && s.root && s.hackable && already_hacking.indexOf(s.host) == -1 && s.grow_ms < max_grow_min * 60 * 1000);
    not_hacking.sort((a, b) => b.money_max - a.money_max);
    not_hacking = not_hacking.map(s => s.host);
    // ns.tprint("Hackable servers:", not_hacking);

    for (let i = 0; i < count; i++) {
      if (i >= not_hacking.length) break;
      if (ns.getPlayer().money < ns.getPurchasedServerCost(ram)) {
        ns.tprint("❌ No more money!");
        break;
      }
      let target = not_hacking[i];
      ns.tprint(`bwgh ${i}th target is ${target}`);
      ns.exec("auto.js", "home", 1, "bwgh", target, ram);
      await ns.asleep(1000);
    }
    ns.tprint(`✔ bwgh all compelete!`);
  }

  async function bwgh_best() {
    let ram = 1024;
    let min = 1;
    while (ns.getPurchasedServerCost(ram * 2) < ns.getPlayer().money && ram * 2 <= 1024 * 1024) {
      ram *= 2;
      min += 1;
    }
    await bwgh_all(1, ram, min);
    ns.tprint(`✔ bwgh best compelete! ram:${ram}, min:${min}`);
  }

  async function wgh_by_name() {
    for (let n of ns.getPurchasedServers()) {
      let target = n.substr(n.indexOf("_") + 1);
      ns.tprint(`server ${n} target is ${target}, wgh it ...`);
      ns.exec("auto.js", "home", 1, "wgh", n, target);
      await ns.asleep(2000);
    }
    return;
  }

  // NO_BUY END
  // ----------------------------------------------------------------------------

  function agents_from(param) {
    if (param == "all") {
      return get_agents();
    } else if (param == "not_home") {
      return get_agents().filter(s => s.host != "home");
    } else if (param == "not_mine") {
      return get_agents().filter(s => s.host != "home").filter(s => ns.getPurchasedServers().indexOf(s.host) == -1);
    } else {
      try {
        let agents = [{
          host: param,
          max_ram: ns.getServerMaxRam(param),
        }];
        if (param == "home") {
          agents[0].max_ram -= ns.getScriptRam("auto.js");
          if (agents[0].max_ram < 0) {
            agents[0].max_ram = 0;
          }
        }
        return agents;
      } catch {
        ns.tprint(`agents_from() Invalid argument! param:${param}`);
        return [];
      }
    }
  }

  // Only use when move to new BitNode
  // const weaken_time_ratio = 4;
  // const grow_time_ratio = 4;
  // const hack_time_ratio = 1;

  const weaken_time_ratio = 20;
  const grow_time_ratio = 16;
  const hack_time_ratio = 5;

  // const time_ratio_divide = 5;
  // const weaken_time_ratio = 20 / time_ratio_divide;
  // const grow_time_ratio = Math.ceil(16 / time_ratio_divide);
  // const hack_time_ratio = 5 / time_ratio_divide;

  function get_super_run_unit_count(agents, target, w, g, h) {
    const arr = [
      { script: "weaken.js", ram: ns.getScriptRam("weaken.js"), time: ns.getWeakenTime(target), time_ratio: weaken_time_ratio, threads: w },
      { script: "grow.js", ram: ns.getScriptRam("grow.js"), time: ns.getGrowTime(target), time_ratio: grow_time_ratio, threads: g },
      { script: "hack.js", ram: ns.getScriptRam("hack.js"), time: ns.getHackTime(target), time_ratio: hack_time_ratio, threads: h },
    ];
    const unit_mem = arr.reduceRight((s, c) => s + c.threads * c.ram * c.time_ratio, 0);
    const unit_count_float = agents.reduceRight((s, c) => s + c.max_ram / unit_mem, 0);
    const unit_count = agents.reduceRight((s, c) => s + Math.floor(c.max_ram / unit_mem), 0);
    // ns.tprint(`calc unit_count w:${w}, g:${g}, h:${h}, unit mem:${unit_mem}, unit count:${unit_count}, unit count float:${unit_count_float}`);
    // if (unit_count == 0 && unit_count_float > 0.2) {
    //     return unit_count_float;
    // }
    return (agents.length == 1) ? unit_count_float : unit_count;
  }

  async function super_run(agents, target, w, g, h, unit_count = 1, dry_run = false) {
    const arr = [
      { script: "weaken.js", ram: ns.getScriptRam("weaken.js"), time: ns.getWeakenTime(target), time_ratio: weaken_time_ratio, threads: w },
      { script: "grow.js", ram: ns.getScriptRam("grow.js"), time: ns.getGrowTime(target), time_ratio: grow_time_ratio, threads: g },
      { script: "hack.js", ram: ns.getScriptRam("hack.js"), time: ns.getHackTime(target), time_ratio: hack_time_ratio, threads: h },
    ];

    const total_mem = agents.reduceRight((s, a) => s + a.max_ram, 0);
    const unit_mem = arr.reduceRight((s, c) => s + c.threads * c.ram * c.time_ratio, 0);
    ns.tprint(`  super_run w:${w}, g:${g}, h:${h}, unit count:${unit_count}, total_mem:${total_mem} unit mem:${unit_mem}`);

    const kMinMs = 5;
    if (unit_count > arr[0].time / arr[0].time_ratio / kMinMs) {
      const old_unit_count = unit_count;
      unit_count = arr[0].time / arr[0].time_ratio / kMinMs;
      ns.tprint(`⚠ unit count too large, you can't use FULL ram, change ${old_unit_count} to ${unit_count}`);
    }

    agents.sort((a, b) => b.max_ram - a.max_ram);
    if (!dry_run) {
      agents.forEach(a => my_killall(a.host));
    }

    unit_count = Math.floor(unit_count);

    if (unit_count <= 0) {
      ns.tprint(`❌kkk unit count too small!`);
      return false;
    }

    const w_tick_time = arr[0].time / arr[0].time_ratio / unit_count * 1.1;
    const g_tick_time = arr[1].time / arr[1].time_ratio / unit_count * 1.1;
    const h_tick_time = arr[2].time / arr[2].time_ratio / unit_count * 1.1;

    const tick_time = Math.max(w_tick_time, g_tick_time, h_tick_time);
    const max_time_ratio = Math.max(arr[0].time_ratio, arr[1].time_ratio, arr[2].time_ratio);
    ns.tprint(`  w_tick_time:${w_tick_time}, g_tick_time:${g_tick_time}, h_tick_time:${h_tick_time}. tick_time:${tick_time}`);

    let agent_index = 0;
    let agent_used_mem = 0;

    for (let i = 0; i < 3; i++) {
      const exact_time = tick_time * unit_count * arr[i].time_ratio;
      const mem_to_use = arr[i].threads * arr[i].ram;

      for (let tick = 0; tick < arr[i].time_ratio * unit_count; tick++) {
        while (agent_index < agents.length) {
          if (agent_used_mem + mem_to_use > agents[agent_index].max_ram) {
            agent_index++;
            agent_used_mem = 0;
          } else {
            break;
          }
        }

        if (agent_index >= agents.length) {
          ns.tprint(`⚠ Something goes wrong when super_run ${target}!! already used all mems!! i:${i}, tick:${tick}, total:${arr[i].time_ratio * unit_count}`);
          return false;
        }

        if (arr[i].threads > 0) {
          let start_time = 0;
          if (h > 0) {
            start_time = (max_time_ratio - arr[i].time_ratio) * tick_time * unit_count + tick * tick_time + tick * i / 3;
          } else {
            // no hacking, do not wait
            start_time = tick * tick_time + tick * i / 3;
          }
          if (!dry_run) {
            ns.exec(arr[i].script, agents[agent_index].host, arr[i].threads, target, start_time, exact_time, tick);
          }
          agent_used_mem += mem_to_use;
        }
      }
    }
    return true;
  }

  async function super_weaken(agents, target) {
    const unit_count = get_super_run_unit_count(agents, target, 1, 0, 0);
    return await super_run(agents, target, unit_count, 0, 0);
  }

  async function super_grow(agents, target) {
    let w = 1;
    let g = 10;
    let unit_count = 0;
    while (unit_count < 1 && g > 1) {
      g -= 1;
      unit_count = get_super_run_unit_count(agents, target, w, g, 0);
    }
    return await super_run(agents, target, unit_count * w, g * unit_count, 0);
  }

  async function super_hack_manual(agents, target, w, g, h) {
    const arr = [
      { script: "weaken.js", ram: ns.getScriptRam("weaken.js"), time: ns.getWeakenTime(target), time_ratio: weaken_time_ratio, threads: w },
      { script: "grow.js", ram: ns.getScriptRam("grow.js"), time: ns.getGrowTime(target), time_ratio: grow_time_ratio, threads: g },
      { script: "hack.js", ram: ns.getScriptRam("hack.js"), time: ns.getHackTime(target), time_ratio: hack_time_ratio, threads: h },
    ];

    const total_mem = agents.reduceRight((s, a) => s + a.max_ram, 0);
    const unit_mem = arr.reduceRight((s, c) => s + c.threads * c.ram * c.time_ratio, 0);
    let unit_count = Math.floor(total_mem / unit_mem);
    for (; unit_count > 0 && !await super_run(agents, target, w, g, h, unit_count, true);
      unit_count--) {
      await ns.asleep(100);
    }
    await super_run(agents, target, w, g, h, unit_count);
    ns.tprint(`super hack ${target} unit_count:${unit_count}`);
  }

  async function super_hack_analyze(agents, target) {
    let steal_percent = 40;
    while (steal_percent > 0) {
      const steal = ns.getServerMaxMoney(target) * steal_percent / 100;
      const hack_threads = Math.floor(ns.hackAnalyzeThreads(target, steal));
      const grow_threads = Math.ceil(ns.growthAnalyze(target, (100 / (100 - steal_percent * 2))));
      const weaken_threads = Math.ceil((ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads)) / ns.weakenAnalyze(1) * 1.2);

      const arr = [
        { script: "weaken.js", ram: ns.getScriptRam("weaken.js"), time: ns.getWeakenTime(target), time_ratio: weaken_time_ratio, threads: weaken_threads },
        { script: "grow.js", ram: ns.getScriptRam("grow.js"), time: ns.getGrowTime(target), time_ratio: grow_time_ratio, threads: grow_threads },
        { script: "hack.js", ram: ns.getScriptRam("hack.js"), time: ns.getHackTime(target), time_ratio: hack_time_ratio, threads: hack_threads },
      ];

      const unit_mem = arr.reduceRight((s, c) => s + c.threads * c.ram * c.time_ratio, 0);
      const unit_count = get_super_run_unit_count(agents, target, weaken_threads, grow_threads, hack_threads);
      ns.tprint(`steal:${steal_percent}% w:${weaken_threads}, g:${grow_threads}, h:${hack_threads}, unit count:${unit_count}, unit mem:${unit_mem}`);
      steal_percent -= 1;
    }
    return;
  }

  async function super_hack(agents, target) {
    let steal_percent = 20;
    while (steal_percent > 0) {
      const steal = ns.getServerMaxMoney(target) * steal_percent / 100;
      const hack_threads = Math.floor(ns.hackAnalyzeThreads(target, steal));
      const grow_threads = Math.ceil(ns.growthAnalyze(target, (100 / Math.max(100 - steal_percent * 2, 5))));
      const weaken_threads = Math.ceil((ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads)) / ns.weakenAnalyze(1) * 1.2);

      const unit_count = get_super_run_unit_count(agents, target, weaken_threads, grow_threads, hack_threads);
      ns.tprint(`    cheking super hack conditions... ${target} w:${weaken_threads}, g:${grow_threads}, h:${hack_threads}, unit count:${unit_count}`);
      if (unit_count <= 4) {
        steal_percent -= 1;
        ns.tprint(`  ${target} unit count too small, steal percent to ${steal_percent}%`);
        continue;
      }
      const kMaxUnitCount = 60;
      if (unit_count > kMaxUnitCount && steal_percent < 90) {
        steal_percent += 1;
        continue;
      }
      await super_run(agents, target, weaken_threads, grow_threads, hack_threads, Math.floor(unit_count));
      ns.tprint(`✔ super hack ${target} steal_percent:${steal_percent} started!`);
      return;
    }
    ns.tprint(`❌ super hack ${target} ERROR!`);
    return;
  }

  async function super_weaken_grow_hack(agents, target) {
    await super_weaken(agents, target);
    while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) * 1.1) {
      ns.tprint(`= Wait for target:${target} weaken...`);
      await ns.asleep(30 * 1000);
      continue;
    }
    await super_grow(agents, target);
    while (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.9 || ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) * 1.1) {
      ns.tprint(`= Wait for target:${target} grow...`);
      await ns.asleep(30 * 1000);
      continue;
    }
    await super_hack(agents, target);
    ns.tprint(`✔ wgh target:${target} complete.`);
  }

  function usage() {
    ns.tprint(
      "Usage: run auto.js <command>\n" +
      "\n" +
      "Available commands:\n" +
      "  list                         list servers, default depth is 5\n" +
      "  listf                        list servers and refresh every 1 seconds\n" +
      "  path <server>                path to server\n" +
      "  path_all                     path to all server\n" +
      "  nuke                         nuke all available servers\n" +
      "  scp                          scp scripts to all available servers\n" +
      "  scp_back                     scp servers content to home\n" +
      "  killall                      kill all server scripts\n" +
      "  startup [new]                startup from augmentation install\n" +
      "  b price                      buy server prices\n" +
      "  b list                       list purchased servers\n" +
      "  b buy <ram> [<name>]         buy server\n" +
      "  b del <name>                 del server\n" +
      "  b del_not_1pb                del servers which memory less than 1PB\n" +
      "  b del_all                    del all servers\n" +
      "  w <from> <target>            weaken server\n" +
      "  g <from> <target>            grow and weaken server\n" +
      "  h <from> <target>            hack, grow and weaken server\n" +
      "  wgh <from> <target>          weaken, grow and hack server\n" +
      "  wgh_by_name                  weaken, grow and hack server by server name\n" +
      "  bwgh <target> [<ram>]        buy [1PB] server, and first weaken, grow and hack server\n" +
      "  bwgh_all [<max_grow_min=10m>] [<ram=1PB>] [<count>]\n" +
      "                               buy <count> of <ram> server, do bwgh\n" +
      "  hm <from> <target> <w> <g> <h> <count>\n" +
      "                               hack, grow and weaken server\n" +
      "  ha <from> <target>           hack analyze\n" +
      ""
    )
    return;
  }

  if (ns.args.length < 1) {
    return usage();
  }

  if (ns.args[0] == "list") {
    list(ns.args[1], ns.tprint);
    return;
  } else if (ns.args[0] == "listf") {
    ns.tail();
    while (true) {
      list(ns.args[1]);
      await ns.sleep(1000);
    }
    return;
  } else if (ns.args[0] == "nuke") {
    return await nuke_all();
  } else if (ns.args[0] == "scp") {
    return await scp_all();
  } else if (ns.args[0] == "scp_back") {
    return await scp_back();
  } else if (ns.args[0] == "path") {
    path_server(ns.args[1]);
    return;
  } else if (ns.args[0] == "path_all") {
    const targets = [
      "CSEC",
      "avmnite-02h",
      "I.I.I.I",
      "run4theh111z",
      "powerhouse-fitness",
    ];
    for (let t of targets) {
      path_server(t);
    }
    return;
  } else if (ns.args[0] == "killall") {
    list_servers().filter(s => s.root && s.max_ram > 0).forEach(s => ns.killall(s.host));
    my_killall("home");
    ns.tprint("killall on all servers complete!");
    return;
  } else if (ns.args[0] == "startup") {
    return await startup(ns.args[1] == "new");
  } else if (ns.args[0] == "b") {
    let cmd = ns.args[1];
    if (cmd == "price") {
      return b_price();
    } else if (cmd == "list") {
      return b_list();
    } else if (cmd == "buy") {
      return await b_buy(ns.args[2], ns.args[3]);
    } else if (cmd == "del") {
      return b_del(ns.args[2]);
    } else if (cmd == "del_all") {
      return await b_del_all();
    } else if (cmd == "del_not_1pb") {
      return await b_del_not_1pb();
    } else {
      ns.tprint("Invalid argument!");
      return;
    }
  } else if (ns.args[0] == "w") {
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    return await super_weaken(agents, target);
  } else if (ns.args[0] == "g") {
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    return await super_grow(agents, target);
  } else if (ns.args[0] == "h") {
    ns.tprint("ns.args:", ns.args);
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    return await super_hack(agents, target);
  } else if (ns.args[0] == "ha") {
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    return await super_hack_analyze(agents, target);
  } else if (ns.args[0] == "hm") {
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    return await super_hack_manual(agents, target, ns.args[3], ns.args[4], ns.args[5]);
  } else if (ns.args[0] == "wgh") {
    let agents = agents_from(ns.args[1]);
    if (agents.length == 0) {
      ns.tprint("Got no agents! Invalid argument!");
      return;
    }
    let target = ns.args[2];
    await super_weaken_grow_hack(agents, target);
    return;
  } else if (ns.args[0] == "wgh_by_name") {
    return await wgh_by_name();
  } else if (ns.args[0] == "bwgh") {
    let target = ns.args[1];
    if (ns.args[2]) {
      await buy_super_weaken_grow_hack(target, ns.args[2]);
    } else {
      await buy_super_weaken_grow_hack(target);
    }
    return;
  } else if (ns.args[0] == "bwgh_best") {
    await bwgh_best();
    return;
  } else if (ns.args[0] == "bwgh_all") {
    let max_grow_min = ns.args[1];
    let ram = ns.args[2];
    let count = ns.args[3];
    await bwgh_all(count, ram, max_grow_min);
    return;
  } else if (ns.args[0] == "test") {
    return;
  } else {
    ns.tprint("ns.args:", ns.args);
    return usage();
  }
}