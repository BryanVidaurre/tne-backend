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

    let m: RegExpExecArray | null;
    while ((m = reDq.exec(body)) !== null) out[m[1]] = m[2];
    while ((m = reSq.exec(body)) !== null) out[m[1]] = m[2];
    return out;
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

      return {
        run: `${num}-${dv}`,
        periodo: f2.tne_periodo ?? '',
        rbd: f2.tne_inst_rbd ?? '',
        institucion: f2.tne_inst_nombre ?? '',
      };
    }

    if (!res.ok()) {
      const loc = res.headers()['location'] ?? '';
      throw new Error(`HTTP ${res.status()} en tneEmitidas (loc=${loc})`);
    }

    const body = await res.text();
    const f = this.parseFrmTneAssignments(body);

    return {
      run: `${num}-${dv}`,
      periodo: f.tne_periodo ?? '',
      rbd: f.tne_inst_rbd ?? '',
      institucion: f.tne_inst_nombre ?? '',
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





