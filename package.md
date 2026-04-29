# 常用打包命令

```shell
# 一步完成构建并启动：
# ✅ 只构建 mumuainovel 服务（不会构建 postgres）
# ✅ 使用 Dockerfile 中默认的 PIP_NO_CACHE=false（启用 pip 缓存）
# ✅ 使用默认的 USE_CN_MIRROR=true（使用清华镜像）
# ✅ 利用 Docker 层缓存加速构建

docker-compose up -d --build mumuainovel
```