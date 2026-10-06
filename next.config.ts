import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.NODE_ENV !== 'production' && process.env.LOCAL_TEST_MODE === '1' ? '.next-local' : '.next',
};

export default config;
