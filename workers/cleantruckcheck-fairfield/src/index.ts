import { handleSite, SiteEnv } from '../../_shared/site-handler';

interface Env extends SiteEnv {
  FAIRFIELD_HTML_STORE: KVNamespace;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleSite(request, env, {
      domain: 'cleantruckcheckfairfield.com',
      htmlStore: env.FAIRFIELD_HTML_STORE,
    });
  },
};
