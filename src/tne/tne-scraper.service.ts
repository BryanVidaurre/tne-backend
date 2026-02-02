import { Injectable, Logger } from '@nestjs/common';
import { request as pwRequest, APIRequestContext } from 'playwright';
import * as cheerio from 'cheerio';

type RunDv = { rut_num: number; rut_dv: string };

@Injectable()
export class TneScraperService {
  private readonly logger = new Logger(TneScraperService.name);

  private api: APIRequestContext | null = null;
  private loginPromise: Promise<void> | null = null;

  private readonly base = 'https://sistema.tne.cl';
  private splitRunDv(rut_num: number, rut_dv: string) {
    const num = String(rut_num).replace(/\D/g, '');
    const dv = String(rut_dv).trim().toUpperCase();
    if (!num || !/^[0-9K]$/.test(dv)) {
      throw new Error(`RUN inválido: ${rut_num}-${rut_dv}`);
    }
    return { num, dv };
  }

  private parseFrmTneAssignments(body: string) {
    const out: Record<string, string> = {};
    const reDq =
      /parent\.document\.frm_tne\.([a-zA-Z0-9_]+)\.value\s*=\s*"([^"]*)"\s*;/g;
    const reSq =
      /parent\.document\.frm_tne\.([a-zA-Z0-9_]+)\.value\s*=\s*'([^']*)'\s*;/g;
    const reAnyDoc =
      /(?:parent\.)?document\.frm_tne\.([a-zA-Z0-9_]+)\.value\s*=\s*['"]([^'"]*)['"]\s*;/g;
    const reJqVal =
      /\$\(\s*['"]#([a-zA-Z0-9_]+)['"]\s*\)\.val\(\s*['"]([^'"]*)['"]\s*\)/g;
    const reGetById =
      /document\.getElementById\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)\.value\s*=\s*['"]([^'"]*)['"]\s*;/g;

    let m: RegExpExecArray | null;
    while ((m = reDq.exec(body)) !== null) out[m[1]] = m[2];
    while ((m = reSq.exec(body)) !== null) out[m[1]] = m[2];
    while ((m = reAnyDoc.exec(body)) !== null) out[m[1]] = m[2];
    while ((m = reJqVal.exec(body)) !== null) out[m[1]] = m[2];
    while ((m = reGetById.exec(body)) !== null) out[m[1]] = m[2];

    // Fallback: read values straight from hidden/text inputs when script patterns do not match.
    const $ = cheerio.load(body);
    const keys = ['tne_periodo', 'tne_inst_rbd', 'tne_inst_nombre'];
    for (const key of keys) {
      if (out[key]) continue;
      const byId = $(`#${key}`).attr('value');
      const byName = $(`input[name="${key}"]`).attr('value');
      const value = (byId ?? byName ?? '').trim();
      if (value) out[key] = value;
    }

    return out;
  }

  private normalizeKey(key: string): string {
    return String(key || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private decodeEntities(value: string | null | undefined): string {
    const raw = String(value ?? '');
    if (!raw) return '';
    return cheerio.load(`<span>${raw}</span>`)('span').text();
  }

  private cleanField(value: string | null | undefined): string {
    return this.decodeEntities(value)
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseFallbackFieldsFromHtml(body: string) {
    const $ = cheerio.load(body);
    const all: Record<string, string> = {};

    $('input').each((_, el) => {
      const id = ($(el).attr('id') || '').trim();
      const name = ($(el).attr('name') || '').trim();
      const value = this.cleanField($(el).attr('value'));
      if (!value) return;
      if (id) all[id] = value;
      if (name) all[name] = value;
    });

    let periodo = '';
    let institucion = '';
    let rbd = '';

    for (const [k, v] of Object.entries(all)) {
      const nk = this.normalizeKey(k);
      if (!periodo && nk.includes('periodo') && /\b20\d{2}\b/.test(v)) {
        periodo = v.match(/\b20\d{2}\b/)?.[0] ?? v;
      }
      if (
        !institucion &&
        /(instit|instnombre|establec|colegio|universidad|nombreinst)/.test(nk) &&
        /[a-zA-Z]/.test(v)
      ) {
        institucion = v;
      }
      if (!rbd && nk.includes('rbd') && /[0-9]/.test(v)) {
        rbd = v;
      }
    }

    $('tr').each((_, tr) => {
      const cells = $(tr)
        .find('th,td')
        .map((__, c) => this.cleanField($(c).text()))
        .get()
        .filter(Boolean);
      if (cells.length < 2) return;
      const label = this.normalizeKey(cells[0]);
      const value = cells.slice(1).find(Boolean) ?? '';
      if (!value) return;

      if (!periodo && label.includes('periodo') && /\b20\d{2}\b/.test(value)) {
        periodo = value.match(/\b20\d{2}\b/)?.[0] ?? value;
      }
      if (!institucion && label.includes('instit')) {
        institucion = value;
      }
      if (!rbd && label.includes('rbd') && /[0-9]/.test(value)) {
        rbd = value;
      }
    });

    return { periodo, institucion, rbd };
  }

  private mergeTneInfo(body: string, assignments: Record<string, string>) {
    const exactPeriodo = this.cleanField(assignments.tne_periodo);
    const exactInstitucion = this.cleanField(assignments.tne_inst_nombre);
    const exactRbd = this.cleanField(assignments.tne_inst_rbd);

    if (exactPeriodo && exactInstitucion) {
      return { periodo: exactPeriodo, institucion: exactInstitucion, rbd: exactRbd };
    }

    const byKeyPeriodo = Object.entries(assignments).find(([k, v]) => {
      const nk = this.normalizeKey(k);
      return nk.includes('periodo') && /\b20\d{2}\b/.test(this.cleanField(v));
    });
    const byKeyInstitucion = Object.entries(assignments).find(([k, v]) => {
      const nk = this.normalizeKey(k);
      const cleaned = this.cleanField(v);
      return /(instit|instnombre|establec|colegio|universidad|nombreinst)/.test(nk) && /[a-zA-Z]/.test(cleaned);
    });
    const byKeyRbd = Object.entries(assignments).find(([k, v]) => {
      const nk = this.normalizeKey(k);
      return nk.includes('rbd') && /[0-9]/.test(this.cleanField(v));
    });

    const htmlFallback = this.parseFallbackFieldsFromHtml(body);

    const periodo =
      exactPeriodo ||
      this.cleanField(byKeyPeriodo?.[1]).match(/\b20\d{2}\b/)?.[0] ||
      htmlFallback.periodo ||
      '';
    const institucion = exactInstitucion || this.cleanField(byKeyInstitucion?.[1]) || htmlFallback.institucion || '';
    const rbd = exactRbd || this.cleanField(byKeyRbd?.[1]) || htmlFallback.rbd || '';

    return { periodo, institucion, rbd };
  }

  private async ensureLoggedIn(): Promise<void> {
    if (this.api) return;

    if (!this.loginPromise) {
      this.loginPromise = (async () => {
        const user = process.env.TNE_USER;
        const pass = process.env.TNE_PASS;
        if (!user || !pass) throw new Error('Faltan TNE_USER / TNE_PASS');

        // Contexto con cookie-jar interno
        this.api = await pwRequest.newContext({
          baseURL: this.base,
          extraHTTPHeaders: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'text/html,*/*',
          },
        });

        const loginGet = await this.api.get('/tie/ingresos/acceso/15/es', {
          maxRedirects: 10,
        });
        if (!loginGet.ok())
          throw new Error(`No se pudo abrir login: HTTP ${loginGet.status()}`);

        const html = await loginGet.text();
        const $ = cheerio.load(html);

        const form = $('form#frm, form[name="frm"], form').first();
        if (!form.length) throw new Error('No se encontró <form> de login');

        const actionAttr = (
          form.attr('action') || '/tie/ingresos/acceso'
        ).trim();
        const actionPath = actionAttr.startsWith('http')
          ? new URL(actionAttr).pathname
          : actionAttr.startsWith('/')
            ? actionAttr
            : `/${actionAttr}`;

        const userInput = form
          .find('input[type="text"], input[type="email"], input:not([type])')
          .first();
        const passInput = form.find('input[type="password"]').first();

        const userName = userInput.attr('name');
        const passName = passInput.attr('name');

        if (!userName)
          throw new Error('No se pudo detectar el name del input de usuario');
        if (!passName)
          throw new Error(
            'No se pudo detectar el name del input de contraseña',
          );

        // Capturar hidden inputs requeridos (ej: regi_cod=15, otros)
        const hidden: Record<string, string> = {};
        form.find('input[type="hidden"]').each((_, el) => {
          const name = $(el).attr('name');
          if (!name) return;
          hidden[name] = ($(el).attr('value') ?? '').toString();
        });

        // 2) POST login con todos los hidden + user/pass
        const payload: Record<string, string> = {
          ...hidden,
          [userName]: user,
          [passName]: pass,
        };

        await this.api.post(actionPath, {
          multipart: payload,
          maxRedirects: 10,
        });

        // 3) Check sesión: estados_tarjetas NO debe redirigir a /tie/ingresos
        const check = await this.api.get('/tie/estados_tarjetas/', {
          maxRedirects: 0,
        });

        if ([301, 302, 303, 307, 308].includes(check.status())) {
          const loc = check.headers()['location'] ?? '';
          throw new Error(`Login no válido (redirect a ${loc || 'login'})`);
        }
        if (!check.ok()) {
          throw new Error(`Login no válido (check HTTP ${check.status()})`);
        }

        this.logger.log(
          `Sesión TNE iniciada (form action=${actionPath}, userField=${userName}, passField=${passName})`,
        );
      })().finally(() => {
        this.loginPromise = null;
      });
    }

    await this.loginPromise;
  }

  private async refreshSession(): Promise<void> {
    if (this.api) {
      await this.api.dispose();
      this.api = null;
    }
    await this.ensureLoggedIn();
  }

  async fetchPeriodoRbdInstitucion(rut_num: number, rut_dv: string) {
    await this.ensureLoggedIn();
    const { num, dv } = this.splitRunDv(rut_num, rut_dv);

    const path = `/tie/estados_tarjetas/tneEmitidas/${num}/${dv}`;
    const res = await this.api!.get(path, { maxRedirects: 0 });
    this.logger.log(
      `tneEmitidas request run=${num}-${dv} status=${res.status()}`,
    );

    // Sesión expirada → relogin 1 vez
    if ([301, 302, 303, 307, 308, 401, 403].includes(res.status())) {
      this.logger.warn(
        `Sesión expirada en tneEmitidas (${res.status()}). Reintentando login...`,
      );
      await this.refreshSession();

      const res2 = await this.api!.get(path, { maxRedirects: 0 });
      if (!res2.ok()) {
        const loc = res2.headers()['location'] ?? '';
        throw new Error(`HTTP ${res2.status()} en tneEmitidas (loc=${loc})`);
      }

      const body2 = await res2.text();
      const f2 = this.parseFrmTneAssignments(body2);
      const merged2 = this.mergeTneInfo(body2, f2);

      if (!merged2.periodo && !merged2.institucion) {
        this.logger.warn(
          `Sin datos en tneEmitidas para RUN ${num}-${dv}. Claves capturadas: ${Object.keys(f2).slice(0, 12).join(', ') || 'ninguna'}`,
        );
      }

      return {
        run: `${num}-${dv}`,
        periodo: merged2.periodo,
        rbd: merged2.rbd,
        institucion: merged2.institucion,
      };
    }

    if (!res.ok()) {
      const loc = res.headers()['location'] ?? '';
      throw new Error(`HTTP ${res.status()} en tneEmitidas (loc=${loc})`);
    }

    const body = await res.text();
    const f = this.parseFrmTneAssignments(body);
    const merged = this.mergeTneInfo(body, f);

    if (!merged.periodo && !merged.institucion) {
      this.logger.warn(
        `Sin datos en tneEmitidas para RUN ${num}-${dv}. Claves capturadas: ${Object.keys(f).slice(0, 12).join(', ') || 'ninguna'}`,
      );
    }

    this.logger.log(
      `tneEmitidas parsed run=${num}-${dv} periodo=${merged.periodo || 'null'} institucion=${merged.institucion || 'null'} rbd=${merged.rbd || 'null'}`,
    );

    return {
      run: `${num}-${dv}`,
      periodo: merged.periodo,
      rbd: merged.rbd,
      institucion: merged.institucion,
    };
  }

  async fetchBatch(list: RunDv[]) {
    const out: Array<{
      run: string;
      periodo?: string;
      rbd?: string;
      institucion?: string;
      error?: string;
    }> = [];

    for (const it of list) {
      try {
        const r = await this.fetchPeriodoRbdInstitucion(it.rut_num, it.rut_dv);
        out.push(r);
      } catch (e: any) {
        out.push({
          run: `${it.rut_num}-${it.rut_dv}`,
          error: e?.message ?? String(e),
        });
      }

      await new Promise((r) => setTimeout(r, 700));
    }

    return out;
  }
}
