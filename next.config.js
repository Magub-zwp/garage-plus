/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  allowedDevOrigins: [
    // ngrok
    'https://folic-alienate-nearness.ngrok-free.dev',
    'folic-alienate-nearness.ngrok-free.dev',

    // local network
    'http://192.168.1.118:3000',
    '192.168.1.118'
  ],
}