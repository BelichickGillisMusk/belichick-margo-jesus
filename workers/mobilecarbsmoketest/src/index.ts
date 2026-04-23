import { handleSite, SiteEnv } from '../../_shared/site-handler';

interface Env extends SiteEnv {
  SMOKETEST_HTML_STORE: KVNamespace;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleSite(request, env, {
      domain: 'mobilecarbsmoketest.com',
      htmlStore: env.SMOKETEST_HTML_STORE,
    });
  },
};
