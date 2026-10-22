/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL;

const nextConfig = {
  reactStrictMode: true,
  // Com `API_URL` (desenvolvimento e E2E), /api/* vai para a API Express separada, antes das rotas do
  // Next. Sem `API_URL` (produção na Vercel), quem atende é `src/pages/api/[...path].ts`, que monta
  // o mesmo app Express. Nos dois casos o navegador só fala com o domínio do Next: cookie de sessão
  // HttpOnly de primeira parte e sem CORS.
  async rewrites() {
    if (!apiUrl) {
      return [];
    }
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
