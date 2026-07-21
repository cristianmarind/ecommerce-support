/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Docker Desktop en Windows no propaga eventos nativos de fs a través
      // del bind mount, así que forzamos polling para que el hot-reload funcione.
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
