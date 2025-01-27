
export const GET = async ({ request, url }: { request: Request; url: URL }) => {
  console.log(JSON.stringify({exception: 'Hello World!'}));
  return new Response('Hello World!');
};