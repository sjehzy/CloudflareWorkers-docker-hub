// _worker.js

// =================================================================
// =                     配置区 (请修改这里)                        =
// =================================================================
// 1. 将 "你的DockerHub用户名" 替换为你的 Docker Hub 用户名
const DOCKER_USERNAME = "你的DockerHub用户名";
// 2. 将 "你的DockerHubAccessToken" 替换为你创建的 Read-only Access Token
const DOCKER_ACCESS_TOKEN = "dckr_pat_kG8W-你的DockerHubAccessToken";
// =================================================================
// =                     配置结束                                  =
// =================================================================


// --- 以下代码通常无需修改 ---

// 生成 Base64 编码的认证字符串
//const DOCKER_AUTH = btoa(`${DOCKER_USERNAME}:${DOCKER_ACCESS_TOKEN}`);
// 新的、正确的代码
function base64Encode(str) {
	// 将 Unicode 字符串转换为 UTF-8 字节数组
	const utf8Bytes = new TextEncoder().encode(str);
	// 将字节数组转换为二进制安全的字符串
	const binaryStr = String.fromCodePoint(...utf8Bytes);
	// 最后进行 btoa 编码
	return btoa(binaryStr);
  }
  
  const DOCKER_AUTH = base64Encode(`${DOCKER_USERNAME}:${DOCKER_ACCESS_TOKEN}`);

// 默认 Docker 镜像仓库主机地址
let hub_host = 'registry-1.docker.io';
// Docker 认证服务器地址
const auth_url = 'https://auth.docker.io';
const DOCKER_HUB_API_URL = 'https://hub.docker.com/v2';

// 屏蔽的爬虫 User-Agent
let 屏蔽爬虫UA = ['netcraft'];

// 根据主机名选择对应的上游仓库地址
function routeByHosts(host) {
    const routes = {
        "quay": "quay.io",
        "gcr": "gcr.io",
        "k8s-gcr": "k8s.gcr.io",
        "k8s": "registry.k8s.io",
        "ghcr": "ghcr.io",
        "cloudsmith": "docker.cloudsmith.io",
        "nvcr": "nvcr.io",
        "test": "registry-1.docker.io",
    };
    if (host in routes) return [routes[host], false];
    else return [hub_host, true];
}

const PREFLIGHT_INIT = {
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
};

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*';
    return new Response(body, { status, headers });
}

function newUrl(urlStr, base) {
    try {
        return new URL(urlStr, base);
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function nginx() {
    return `<!DOCTYPE html><html><head><title>Welcome to nginx!</title><style>body{width:35em;margin:0 auto;font-family:Tahoma,Verdana,Arial,sans-serif;}</style></head><body><h1>Welcome to nginx!</h1><p>If you see this page, the nginx web server is successfully installed and working. Further configuration is required.</p><p>For online documentation and support please refer to <a href="http://nginx.org/">nginx.org</a>.<br/>Commercial support is available at <a href="http://nginx.com/">nginx.com</a>.</p><p><em>Thank you for using nginx.</em></p></body></html>`;
}

/**
 * 构建搜索结果HTML页面
 */
function buildSearchHTML(results, query, page, totalPages, workerHostname) { 
    const nextPage = parseInt(page) + 1;
    const prevPage = parseInt(page) - 1;

    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Docker Hub 镜像搜索 - ${query}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8f9fa; color: #212529; }
            .container { max-width: 1200px; margin: 0 auto; }
            header { text-align: center; margin-bottom: 30px; }
            h1 { color: #007bff; }
            .search-form { display: flex; max-width: 600px; margin: 0 auto 20px; }
            .search-input { flex: 1; padding: 10px 15px; font-size: 16px; border: 2px solid #ddd; border-right: none; border-radius: 4px 0 0 4px; outline: none; }
            .search-input:focus { border-color: #007bff; }
            .search-button { padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 0 4px 4px 0; cursor: pointer; font-size: 16px; }
            .search-button:hover { background-color: #0056b3; }
            .results-info { text-align: center; margin-bottom: 20px; color: #6c757d; }
            .results-list { list-style: none; padding: 0; }
            .result-item { background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
            .result-item:hover { transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
            .result-name { font-size: 1.2em; font-weight: bold; margin-bottom: 5px; }
            .result-name a { color: #007bff; text-decoration: none; }
            .result-name a:hover { text-decoration: underline; }
            .result-description { color: #495057; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .result-meta { display: flex; flex-wrap: wrap; gap: 15px; color: #6c757d; font-size: 0.9em; }
            .meta-item { display: flex; align-items: center; }
            .meta-item svg { margin-right: 5px; }
            .pagination { display: flex; justify-content: center; list-style: none; padding: 0; margin-top: 30px; }
            .pagination li { margin: 0 5px; }
            .pagination a { display: inline-block; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; color: #007bff; text-decoration: none; }
            .pagination a:hover, .pagination a.active { background-color: #007bff; color: white; border-color: #007bff; }
            .no-results { text-align: center; padding: 50px 0; color: #6c757d; }
            .usage { background-color: #e9f5ff; border-left: 5px solid #007bff; padding: 15px; margin-top: 30px; border-radius: 0 4px 4px 0; }
            .usage h3 { margin-top: 0; color: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>Docker Hub 镜像搜索</h1>
                <form class="search-form" action="/search" method="get">
                    <input type="text" class="search-input" name="q" placeholder="搜索镜像，例如: nginx, mysql" value="${query || ''}" required>
                    <button type="submit" class="search-button">搜索</button>
                </form>
            </header>

            ${results.length > 0 ? `
                <div class="results-info">
                    找到 ${results.length} 个结果
                </div>
                <ul class="results-list">
                    ${results.map(result => `
                        <li class="result-item">
                            <div class="result-name">
                                <a href="https://hub.docker.com/r/${result.repo_name}" target="_blank">${result.repo_name}</a>
                            </div>
                            <div class="result-description">${result.short_description || '无描述'}</div>
                            <div class="result-meta">
                                <div class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    ${result.star_count || 0} 星
                                </div>
                                <div class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                                    ${result.is_official ? '官方' : ''}
                                </div>
                                <div class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                    ${result.is_automated ? '自动构建' : ''}
                                </div>
                                <div class="meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                                    拉取命令: <code>docker pull ${result.repo_name}</code>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <div class="usage">
                    <h3>使用加速</h3>
                    <p>使用此代理加速拉取：<code>docker pull ${workerHostname}/${results[0].repo_name}</code></p>
                </div>
                <nav>
                    <ul class="pagination">
                        ${prevPage >= 1 ? `<li><a href="/search?q=${encodeURIComponent(query)}&page=${prevPage}">上一页</a></li>` : ''}
                        ${Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => `
                            <li><a href="/search?q=${encodeURIComponent(query)}&page=${p}" class="${p == page ? 'active' : ''}">${p}</a></li>
                        `).join('')}
                        ${nextPage <= totalPages ? `<li><a href="/search?q=${encodeURIComponent(query)}&page=${nextPage}">下一页</a></li>` : ''}
                    </ul>
                </nav>
            ` : query ? `
                <div class="no-results">
                    <h2>没有找到匹配 "${query}" 的镜像</h2>
                    <p>请尝试其他关键词。</p>
                </div>
            ` : ''}
        </div>
    </body>
    </html>`;
}

/**
 * 从Docker Hub API搜索镜像
 */
async function searchDockerHub(query, page = 1, perPage = 20, dockerCache) {
    const cacheKey = `search:${query}:${page}:${perPage}`;
    
    try {
        // 尝试从KV缓存获取
        const cachedResponse = await dockerCache.get(cacheKey);
        if (cachedResponse) {
            console.log(`Cache hit for ${cacheKey}`);
            return JSON.parse(cachedResponse);
        }

        console.log(`Cache miss for ${cacheKey}, fetching from Docker Hub`);
        
        // 构建搜索URL
        const searchUrl = new URL('/v2/search/repositories', DOCKER_HUB_API_URL);
        searchUrl.searchParams.set('query', query);
        searchUrl.searchParams.set('page', page);
        searchUrl.searchParams.set('page_size', perPage);

        // 发送请求
        const response = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': `Basic ${DOCKER_AUTH}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // 详细的错误处理
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Docker Hub API error: ${response.status} - ${errorText}`);
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        // 存入KV缓存，有效期10分钟
        await dockerCache.put(cacheKey, JSON.stringify(data), { expirationTtl: 600 });
        
        return data;
    } catch (error) {
        console.error('SearchDockerHub detailed error:', error);
        throw error; // 重新抛出错误，让上层处理
    }
}


export default {
    async fetch(request, env, ctx) {
        // 绑定 KV 命名空间
        const DOCKER_CACHE = env.DOCKER_CACHE;

        const getReqHeader = (key) => request.headers.get(key);
        let url = new URL(request.url);
        const userAgentHeader = request.headers.get('User-Agent');
        const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
        if (env.UA) 屏蔽爬虫UA = 屏蔽爬虫UA.concat(await ADD(env.UA));
        const workers_url = `https://${url.hostname}`;

        // --- 新增：处理搜索请求 ---
        if (url.pathname === '/search') {
            const query = url.searchParams.get('q');
            const page = url.searchParams.get('page') || '1';
            
            if (!query) {
                // 如果没有搜索词，返回一个简单的搜索框页面
                const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Docker Hub 镜像搜索</title>
                    <style>
                        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
                        .search-container { text-align: center; }
                        h1 { color: #165DFF; }
                        .search-form { display: flex; max-width: 500px; margin: 20px auto; }
                        .search-input { flex: 1; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-right: none; border-radius: 4px 0 0 4px; }
                        .search-button { padding: 10px 20px; background-color: #165DFF; color: white; border: none; border-radius: 0 4px 4px 0; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <div class="search-container">
                        <h1>Docker Hub 镜像搜索</h1>
                        <form class="search-form" action="/search" method="get">
                            <input type="text" class="search-input" name="q" placeholder="输入镜像名称..." required>
                            <button type="submit" class="search-button">搜索</button>
                        </form>
                    </div>
                </body>
                </html>`;
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            }

            try {
                const searchResults = await searchDockerHub(query, page, 20, env.DOCKER_CACHE);
                const totalPages = Math.ceil(searchResults.count / 20);
                const html = buildSearchHTML(searchResults.results, query, page, totalPages, url.hostname);
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            } catch (error) {
                console.error('Search error:', error);
                return new Response(`搜索失败: ${error.message}`, { status: 500 });
            }
        }
        // --- 搜索功能结束 ---


        const ns = url.searchParams.get('ns');
        const hostname = url.searchParams.get('hubhost') || url.hostname;
        const hostTop = hostname.split('.')[0];

        let checkHost;
        if (ns) {
            hub_host = ns === 'docker.io' ? 'registry-1.docker.io' : ns;
        } else {
            checkHost = routeByHosts(hostTop);
            hub_host = checkHost[0];
        }

        const fakePage = checkHost ? checkHost[1] : false;
        console.log(`域名头部: ${hostTop} 反代地址: ${hub_host} searchInterface: ${fakePage}`);
        url.hostname = hub_host;

        const hubParams = ['/v1/search', '/v1/repositories'];
        if (屏蔽爬虫UA.some(fxxk => userAgent.includes(fxxk)) && 屏蔽爬虫UA.length > 0) {
            return new Response(await nginx(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        
        } else if ((userAgent && userAgent.includes('mozilla')) || hubParams.some(param => url.pathname.includes(param))) {
            if (url.pathname == '/') {
                // --- 修改：根路径跳转到搜索页面 (使用完整URL) ---
                return Response.redirect(`${workers_url}/search`, 302); // <--- 修复后
            } else {
                if (url.pathname.startsWith('/v1/')) {
                    url.hostname = 'index.docker.io';
                } else if (fakePage) {
                    url.hostname = 'hub.docker.com';
                }
                if (url.searchParams.get('q')?.includes('library/') && url.searchParams.get('q') != 'library/') {
                    const search = url.searchParams.get('q');
                    url.searchParams.set('q', search.replace('library/', ''));
                }
                const newRequest = new Request(url, request);
                return fetch(newRequest);
            }
        }

        if (!/%2F/.test(url.search) && /%3A/.test(url.toString())) {
            let modifiedUrl = url.toString().replace(/%3A(?=.*?&)/, '%3Alibrary%2F');
            url = new URL(modifiedUrl);
            console.log(`handle_url: ${url}`);
        }

        // 处理 token 请求，并注入认证信息
        if (url.pathname.includes('/token')) {
            let token_parameter = {
                headers: {
                    'Host': 'auth.docker.io',
                    'User-Agent': getReqHeader("User-Agent"),
                    'Accept': getReqHeader("Accept"),
                    'Accept-Language': getReqHeader("Accept-Language"),
                    'Accept-Encoding': getReqHeader("Accept-Encoding"),
                    'Connection': 'keep-alive',
                    'Cache-Control': 'max-age=0',
                    'Authorization': `Basic ${DOCKER_AUTH}` // 关键：注入认证
                }
            };
            let token_url = auth_url + url.pathname + url.search;
            return fetch(new Request(token_url, request), token_parameter);
        }

        if (hub_host == 'registry-1.docker.io' && /^\/v2\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname) && !/^\/v2\/library/.test(url.pathname)) {
            url.pathname = '/v2/library/' + url.pathname.split('/v2/')[1];
            console.log(`modified_url: ${url.pathname}`);
        }

        // 处理 /v2/ 请求，并注入认证信息
        if (
            url.pathname.startsWith('/v2/') &&
            (
                url.pathname.includes('/manifests/') ||
                url.pathname.includes('/blobs/') ||
                url.pathname.includes('/tags/') ||
                url.pathname.endsWith('/tags/list')
            )
        ) {
            let repo = '';
            const v2Match = url.pathname.match(/^\/v2\/(.+?)(?:\/(manifests|blobs|tags)\/)/);
            if (v2Match) {
                repo = v2Match[1];
            }
            if (repo) {
                const tokenUrl = `${auth_url}/token?service=registry.docker.io&scope=repository:${repo}:pull`;
                const tokenRes = await fetch(tokenUrl, {
                    headers: {
                        'User-Agent': getReqHeader("User-Agent"),
                        'Accept': getReqHeader("Accept"),
                        'Accept-Language': getReqHeader("Accept-Language"),
                        'Accept-Encoding': getReqHeader("Accept-Encoding"),
                        'Connection': 'keep-alive',
                        'Cache-Control': 'max-age=0',
                        'Authorization': `Basic ${DOCKER_AUTH}` // 关键：注入认证
                    }
                });
                const tokenData = await tokenRes.json();
                const token = tokenData.token;
                let parameter = {
                    headers: {
                        'Host': hub_host,
                        'User-Agent': getReqHeader("User-Agent"),
                        'Accept': getReqHeader("Accept"),
                        'Accept-Language': getReqHeader("Accept-Language"),
                        'Accept-Encoding': getReqHeader("Accept-Encoding"),
                        'Connection': 'keep-alive',
                        'Cache-Control': 'max-age=0',
                        'Authorization': `Bearer ${token}`
                    },
                    cacheTtl: 3600
                };
                if (request.headers.has("X-Amz-Content-Sha256")) {
                    parameter.headers['X-Amz-Content-Sha256'] = getReqHeader("X-Amz-Content-Sha256");
                }
                let original_response = await fetch(new Request(url, request), parameter);
                let new_response_headers = new Headers(original_response.headers);
                let status = original_response.status;
                if (new_response_headers.get("Www-Authenticate")) {
                    let auth = new_response_headers.get("Www-Authenticate");
                    let re = new RegExp(auth_url, 'g');
                    new_response_headers.set("Www-Authenticate", auth.replace(re, workers_url));
                }
                if (new_response_headers.get("Location")) {
                    const location = new_response_headers.get("Location");
                    console.info(`Found redirection location, redirecting to ${location}`);
                    return httpHandler(request, location, hub_host);
                }
                return new Response(original_response.body, { status, headers: new_response_headers });
            }
        }

        // 通用请求处理，并注入认证信息
        let parameter = {
            headers: {
                'Host': hub_host,
                'User-Agent': getReqHeader("User-Agent"),
                'Accept': getReqHeader("Accept"),
                'Accept-Language': getReqHeader("Accept-Language"),
                'Accept-Encoding': getReqHeader("Accept-Encoding"),
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'Authorization': `Basic ${DOCKER_AUTH}` // 关键：注入认证
            },
            cacheTtl: 3600
        };

        if (request.headers.has("Authorization")) {
            parameter.headers.Authorization = getReqHeader("Authorization");
        }
        if (request.headers.has("X-Amz-Content-Sha256")) {
            parameter.headers['X-Amz-Content-Sha256'] = getReqHeader("X-Amz-Content-Sha256");
        }

        let original_response = await fetch(new Request(url, request), parameter);
        let new_response_headers = new Headers(original_response.headers);
        let status = original_response.status;

        if (new_response_headers.get("Www-Authenticate")) {
            let auth = new_response_headers.get("Www-Authenticate");
            let re = new RegExp(auth_url, 'g');
            new_response_headers.set("Www-Authenticate", auth.replace(re, workers_url));
        }

        if (new_response_headers.get("Location")) {
            const location = new_response_headers.get("Location");
            console.info(`Found redirection location, redirecting to ${location}`);
            return httpHandler(request, location, hub_host);
        }

        return new Response(original_response.body, { status, headers: new_response_headers });
    }
};

function httpHandler(req, pathname, baseHost) {
    const reqHdrRaw = req.headers;
    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }
    let rawLen = '';
    const reqHdrNew = new Headers(reqHdrRaw);
    reqHdrNew.delete("Authorization");
    const refer = reqHdrNew.get('referer');
    let urlStr = pathname;
    const urlObj = newUrl(urlStr, 'https://' + baseHost);
    const reqInit = { method: req.method, headers: reqHdrNew, redirect: 'follow', body: req.body };
    return proxy(urlObj, reqInit, rawLen);
}

async function proxy(urlObj, reqInit, rawLen) {
    const res = await fetch(urlObj.href, reqInit);
    const resHdrOld = res.headers;
    const resHdrNew = new Headers(resHdrOld);
    if (rawLen) {
        const newLen = resHdrOld.get('content-length') || '';
        const badLen = (rawLen !== newLen);
        if (badLen) {
            return makeRes(res.body, 400, { '--error': `bad len: ${newLen}, except: ${rawLen}`, 'access-control-expose-headers': '--error' });
        }
    }
    const status = res.status;
    resHdrNew.set('access-control-expose-headers', '*');
    resHdrNew.set('access-control-allow-origin', '*');
    resHdrNew.set('Cache-Control', 'max-age=1500');
    resHdrNew.delete('content-security-policy');
    resHdrNew.delete('content-security-policy-report-only');
    resHdrNew.delete('clear-site-data');
    return new Response(res.body, { status, headers: resHdrNew });
}

async function ADD(envadd) {
    var addtext = envadd.replace(/[	 |"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
    const add = addtext.split(',');
    return add;
}