import { registerAs } from '@nestjs/config';

export default registerAs('runway', () => ({
  apiKey: process.env.KIE_API_KEY,
  baseUrl: 'https://api.kie.ai/api/v1/runway',
}));