import { getStore } from '@netlify/blobs';
import { handle } from '../lib/wall.mjs';

export default async (req) =>
  handle(req, getStore({ name: 'blessings', consistency: 'strong' }), { ADMIN_KEY: Netlify.env.get('ADMIN_KEY') });

export const config = { path: '/api/blessings' };
