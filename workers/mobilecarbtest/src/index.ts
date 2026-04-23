import { handleSite, SiteEnv } from '../../_shared/site-handler';

interface Env extends SiteEnv {
  MOBILECARBTEST_HTML_STORE: KVNamespace;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleSite(request, env, {
      domain: 'mobilecarbtest.com',
      htmlStore: env.MOBILECARBTEST_HTML_STORE,
    });
  },
};
