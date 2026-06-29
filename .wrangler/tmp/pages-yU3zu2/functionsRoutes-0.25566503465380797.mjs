import { onRequest as __api_news_js_onRequest } from "C:\\Users\\money\\video-wall\\functions\\api\\news.js"

export const routes = [
    {
      routePath: "/api/news",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_news_js_onRequest],
    },
  ]