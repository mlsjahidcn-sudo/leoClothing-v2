import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    if (response.status_code !== 0) {
      return NextResponse.json(
        { error: response.status_message || '获取失败' },
        { status: 500 }
      );
    }

    const textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    const images = response.content
      .filter((item) => item.type === 'image')
      .map((item) => ({
        url: item.image?.display_url || item.image?.image_url,
        width: item.image?.width,
        height: item.image?.height,
      }));

    return NextResponse.json({
      title: response.title,
      text: textContent,
      images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
