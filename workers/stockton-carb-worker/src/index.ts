import { handleSite, SiteEnv } from '../../_shared/site-handler';

interface Env extends SiteEnv {
  STOCKTON_HTML_STORE: KVNamespace;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleSite(request, env, {
      domain: 'carbteststockton.com',
      htmlStore: env.STOCKTON_HTML_STORE,
    });
  },
};
