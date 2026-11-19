import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');

export const P = {
  root,
  data: path.join(root, 'data'),
  db: process.env.STUDIO_DB ?? path.join(root, 'data', 'studio.db'),
  media: path.join(root, 'data', 'media'),          // acquired (rights-approved) source media
  cache: path.join(root, 'data', 'cache'),          // transcripts, analysis, previews (content-addressed)
  productions: process.env.STUDIO_PRODUCTIONS ?? path.join(root, 'productions'),   // override for scratch/parity builds
  brands: path.join(root, 'brands'),
  assets: path.join(root, 'assets'),
  config: path.join(root, 'config'),
  secrets: path.join(root, 'secrets'),
  research: path.join(root, 'research'),
  reports: path.join(root, 'reports'),
  memory: path.join(root, 'memory'),
};

export const production = (id: string) => path.join(P.productions, id);
