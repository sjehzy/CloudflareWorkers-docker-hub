# CloudflareWorkers-docker-hub
docker-hub代理镜像

🚀 部署方式
 #Cloudflare Workers 搭建免费的 Docker 镜像加速服务，具体步骤如下：
## 1.准备工作
注册 Cloudflare 账户：访问 Cloudflare 官网，按照提示注册一个账户。
准备域名：购买一个域名，如在腾讯云购买，购买后需进行实名认证和审核。审核通过后，登录腾讯云 DNSPOD，点击头像，选择 API 密钥，新建 API 密钥，再转到 DNSPod Token，输入密钥名称创建 Token，妥善保存相关信息。

## 2.域名托管至 Cloudflare
登入 Cloudflare 后，点击 “添加站点”，输入在腾讯云申请的域名，选择免费套餐。
Cloudflare 会分配两个服务器名称，返回腾讯云，点击自定义 DNS，将这两个 Cloudflare 名称服务器复制进去，删除其他名称服务器并保存更改。
回到 Cloudflare，当左上角显示已激活，右下方的基本功能进行启用。

## 3.在 Cloudflare 部署服务
进入 Cloudflare 主页面，依次点击 “Workers 和 Pages”→“创建 Workers”，登录前需进行邮箱验证。
在相应位置输入 “docker” 进行部署，部署完成后，点击 “编辑代码”，将以下代码粘贴或上传进去

## 4.创建 Cloudflare Workers KV 命名空间
登录 Cloudflare 控制台。
进入 Workers 和 Pages。
在左侧菜单中选择 KV。
点击 创建命名空间。
名称 填写 DOCKER_CACHE（或任何你喜欢的名字）。
点击 添加。
创建后，点击该命名空间右侧的 绑定，将其绑定到你的 Worker 上。
变量名称 填写 DOCKER_CACHE（必须与代码中使用的名称一致）。
环境 选择你的 Worker 环境。
点击 保存。

## 5.使用完整代码替换你的 Worker
下面是集成了搜索功能的完整代码。请将以下所有内容复制并完全替换你现有的 Worker 代码。
请不要忘记：
修改顶部的 DOCKER_USERNAME 和 DOCKER_ACCESS_TOKEN。
确保你已经将 KV 命名空间绑定到了名为 DOCKER_CACHE 的变量上。

## 6.配置 Docker
在 Docker 所在服务器上，创建或编辑/etc/docker/daemon.json文件，添加以下内容：
```
{
    "registry - mirrors": ["https://你的域名"]
}
```
保存文件后，执行sudo systemctl daemon - reload和sudo systemctl restart docker命令，使配置生效。
这样就可以通过 Cloudflare 搭建的服务来加速 Docker 镜像的拉取了。需注意，CF Worker 免费账号每天请求为 10 万次，每分钟为 1000 次，个人使用通常足够。
