import { handleSite, SiteEnv } from '../../_shared/site-handler';

interface Env extends SiteEnv {
  HAYWARD_HTML_STORE: KVNamespace;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleSite(request, env, {
      domain: 'cleantruckcheckhayward.com',
      htmlStore: env.HAYWARD_HTML_STORE,
    });
  },
};
