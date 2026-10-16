// Contenido del perfil (español e inglés). Editar aquí y correr `node scripts/build-assets.mjs`.

export const LANGS = ['es', 'en'];

export const PROFILE = {
  name: 'Daniel Moraga',
  site: 'danidev.cl',
  email: 'd.moraga.tenorio@gmail.com',
  es: {
    badge: 'DISPONIBLE PARA PROYECTOS',
    roleBefore: 'Desarrollador Web ',
    roleAccent: 'Full Stack',
    roleAfter: '',
    lead: 'Landing pages, sistemas a medida y automatización con N8N + IA',
    meta: 'SANTIAGO, CHILE · REMOTO · DANIDEV.CL',
    // La terminal del banner rota entre estos comandos.
    commands: [
      '$ npm run build -- --from santiago-cl',
      '$ n8n execute --workflow ventas-con-ia',
      '$ vercel deploy --prod landing-pyme',
      '$ git commit -m "otro cliente feliz"',
    ],
    footerTitle: '¿Tienes un proyecto en mente?',
    footerCta: 'Hablemos',
    stackTitle: 'Herramientas con las que construyo',
    live: 'En producción',
  },
  en: {
    badge: 'AVAILABLE FOR PROJECTS',
    roleBefore: '',
    roleAccent: 'Full Stack',
    roleAfter: ' Web Developer',
    lead: 'Landing pages, custom systems and automation with N8N + AI',
    meta: 'SANTIAGO, CHILE · REMOTE · DANIDEV.CL',
    commands: [
      '$ npm run build -- --from santiago-cl',
      '$ n8n execute --workflow ai-sales-flow',
      '$ vercel deploy --prod smb-landing',
      '$ git commit -m "another happy client"',
    ],
    footerTitle: 'Got a project in mind?',
    footerCta: "Let's talk",
    stackTitle: 'The tools I build with',
    live: 'Live',
  },
};

// `skill`: id de skillicons.dev. `si`: ícono de simple-icons dibujado en un recuadro propio.
export const STACK = [
  {
    label: { es: 'FRONTEND', en: 'FRONTEND' },
    color: '#ff8800',
    items: [
      { name: 'TypeScript', skill: 'ts' },
      { name: 'JavaScript', skill: 'js' },
      { name: 'React', skill: 'react' },
      { name: 'Next.js', skill: 'nextjs' },
      { name: 'Astro', skill: 'astro' },
      { name: 'Tailwind', skill: 'tailwind' },
      { name: 'HTML', skill: 'html' },
      { name: 'CSS', skill: 'css' },
    ],
  },
  {
    label: { es: 'BACKEND Y DATOS', en: 'BACKEND & DATA' },
    color: '#10b981',
    items: [
      { name: 'Node.js', skill: 'nodejs' },
      { name: 'Express', skill: 'express' },
      { name: 'PHP', skill: 'php' },
      { name: 'Python', skill: 'python' },
      { name: 'PostgreSQL', skill: 'postgres' },
      { name: 'MySQL', skill: 'mysql' },
      { name: 'MongoDB', skill: 'mongodb' },
      { name: 'Prisma', skill: 'prisma' },
      { name: 'Supabase', skill: 'supabase' },
      { name: 'Firebase', skill: 'firebase' },
    ],
  },
  {
    label: { es: 'AUTOMATIZACIÓN E IA', en: 'AUTOMATION & AI' },
    color: '#ff8800',
    items: [
      { name: 'n8n', si: 'n8n', tint: '#EA4B71' },
      { name: 'Claude', si: 'anthropic', tint: '#D97757' },
      { name: 'WhatsApp API', si: 'whatsapp', tint: '#25D366' },
    ],
  },
  {
    label: { es: 'HERRAMIENTAS', en: 'TOOLING' },
    color: '#10b981',
    items: [
      { name: 'Git', skill: 'git' },
      { name: 'GitHub', skill: 'github' },
      { name: 'Docker', skill: 'docker' },
      { name: 'Vercel', skill: 'vercel' },
      { name: 'Figma', skill: 'figma' },
      { name: 'VS Code', skill: 'vscode' },
      { name: 'Linux', skill: 'linux' },
    ],
  },
];

// Textos tomados de los casos de estudio de danidev.cl.
export const PROJECTS = [
  {
    slug: 'cupo',
    name: 'Cupo',
    url: 'https://cupo.danidev.cl/',
    image: 'assets/projects/cupo.webp',
    category: { es: 'SaaS', en: 'SaaS' },
    title: { es: 'Plataforma de reservas para pymes', en: 'Booking platform for small businesses' },
    outcome: {
      es: 'Las pymes reciben reservas 24/7 desde su propia página, sin coordinar por WhatsApp.',
      en: 'Businesses take bookings 24/7 from their own page, no WhatsApp back-and-forth.',
    },
    tech: ['Next.js', 'TypeScript', 'Tailwind', 'Motion'],
  },
  {
    slug: 'rockpass',
    name: 'RockPass',
    url: 'https://www.rockpass.cl/',
    image: 'assets/projects/rockpass.webp',
    category: { es: 'Ticketing', en: 'Ticketing' },
    title: { es: 'Venta de entradas para shows en vivo', en: 'Ticket sales for live shows' },
    outcome: {
      es: 'Pagos reales en producción y control de ventas desde el panel de administración.',
      en: 'Real payments in production, with sales tracked from the admin dashboard.',
    },
    tech: ['Next.js', 'TypeScript', 'Firebase', 'Tailwind'],
  },
  {
    slug: 'code-wear',
    name: 'Code Wear',
    url: 'https://code-wear.danidev.cl/',
    image: 'assets/projects/code-wear.webp',
    category: { es: 'E-commerce', en: 'E-commerce' },
    title: { es: 'Tienda de ropa para developers', en: 'Apparel store for developers' },
    outcome: {
      es: 'Del catálogo al carrito sin salir de la experiencia de marca, con animaciones fluidas.',
      en: 'From catalog to cart without leaving the brand experience, with fluid animations.',
    },
    tech: ['Next.js', 'TypeScript', 'GSAP', 'Tailwind'],
  },
  {
    slug: 'bbtech',
    name: 'BBTech',
    url: 'https://bbtech.cl/',
    image: 'assets/projects/bbtech.webp',
    category: { es: 'Landing page', en: 'Landing page' },
    title: { es: 'Sistemas digitales para pymes', en: 'Digital systems for small businesses' },
    outcome: {
      es: 'Planes, testimonios y FAQ en un solo recorrido que termina en una reunión agendada.',
      en: 'Plans, testimonials and FAQs in one flow that ends in a booked meeting.',
    },
    tech: ['Next.js', 'React', 'Tailwind', 'SEO'],
  },
];
