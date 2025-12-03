import { registerAs } from '@nestjs/config';

export default registerAs('replicate', () => ({
  apiKey: process.env.REPLICATE_API_TOKEN,
}));