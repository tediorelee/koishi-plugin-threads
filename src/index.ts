import { Context, Schema, h } from 'koishi'

export const name = 'threads'

export interface Config {
  host: string,
  key: string
}

export const Config = Schema.object({
  host: Schema.string().default('threads-api4.p.rapidapi.com').description('不需要做任何改动'),
  key: Schema.string().default('').description('填写从rapidapi获取的key'),
  description: Schema.string().default('api主页：https://rapidapi.com/Lundehund/api/threads-api4').description(''),
})

export function apply(ctx: Context, config: Config) {
  // write your plugin here

  async function getPostDetail(id: string) {
    const headers = {
      'X-RapidAPI-Key': config.key,
      'X-RapidAPI-Host': config.host
    };
    return await ctx.http.get('https://' + config.host + '/api/post/detail?post_id=' + id, { headers });
  }

  async function getPostID(url: string) {
    const headers = {
      'X-RapidAPI-Key': config.key,
      'X-RapidAPI-Host': config.host
    };
    return await ctx.http.get('https://' + config.host + '/api/post/get-id?url=' + url, { headers });
  }

  ctx.middleware(async (session, next) => {
    if (!session.content.includes('www.threads.net')) return next()

    try {
      const result = await getPostID(session.content);
      const {
        data: {
          post_id
        }
      } = result;
      if (post_id) {
        const resultDetail = await getPostDetail(post_id);
        const {
          data: {
            data: {
              edges
            }
          }
        } = resultDetail;

        const post = edges[0].node.thread_items[0].post;
        const isVideo = !!post.video_versions;
        const isCarouselMedia = !!post.carousel_media;
        if (isVideo) {
          // type is video
          session.send(h.video(post.video_versions[0].url))
        } else if (isCarouselMedia) {
          const carouselMedia = post.carousel_media;
          post.carousel_media.forEach(async item => {
            const isCarouselMediaContainVideo = !!item.video_versions;
            if (isCarouselMediaContainVideo) {
              session.send(h.video(item.video_versions[0].url))
            } else {
              // type is image
              const candidates = item.image_versions2.candidates;
              await session.send(h.image(candidates[0].url));
            }
          });
        } else {
          // single image
          await session.send(h.image(post.image_versions2.candidates[0].url));
        }
        
      }
    } catch(err) {
      console.log(err);
      return `发生错误!;  ${err}`;
    }
  })
}
